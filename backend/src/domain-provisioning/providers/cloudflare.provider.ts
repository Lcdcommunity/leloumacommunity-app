// backend/src/domain-provisioning/providers/cloudflare.provider.ts
// v3.0 — fetch natif remplacé par axios (bug undici/Node sur Render)
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

const CF_API = 'https://api.cloudflare.com/client/v4';

interface CloudflareZone {
  id: string;
  name: string;
  status: string; // 'active' tant que les nameservers ne sont pas encore propagés : 'pending'
  name_servers: string[];
}

@Injectable()
export class CloudflareProvider {
  private async cfFetch(path: string, init?: { method?: 'GET' | 'POST' | 'PUT'; body?: string }) {
    let json: any;
    try {
      const res = await axios({
        url: `${CF_API}${path}`,
        method: init?.method ?? 'GET',
        data: init?.body ? JSON.parse(init.body) : undefined,
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // on gère nous-mêmes les erreurs via json.success
      });
      json = res.data;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Cloudflare request failed: ${err.message}`,
      );
    }

    if (!json.success) {
      throw new InternalServerErrorException(
        `Cloudflare API error: ${JSON.stringify(json.errors)}`,
      );
    }
    return json.result;
  }

  private async findZone(domain: string): Promise<CloudflareZone | null> {
    const zones = await this.cfFetch(`/zones?name=${encodeURIComponent(domain)}`);
    return zones.length > 0 ? zones[0] : null;
  }

  /**
   * Crée la zone Cloudflare si elle n'existe pas encore, ou récupère celle qui existe.
   * NE touche à AUCUN enregistrement DNS — tant que les nameservers ne sont pas
   * changés chez le registrar, la zone reste "pending" et Cloudflare ne fait
   * autorité sur rien pour ce domaine.
   */
  async ensureZone(domain: string): Promise<{ zoneId: string; nameServers: string[]; status: string }> {
    let zone = await this.findZone(domain);

    if (!zone) {
      if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
        throw new InternalServerErrorException(
          "CLOUDFLARE_ACCOUNT_ID manquant dans les variables d'environnement.",
        );
      }
      zone = await this.cfFetch('/zones', {
        method: 'POST',
        body: JSON.stringify({
          name: domain,
          account: { id: process.env.CLOUDFLARE_ACCOUNT_ID },
          type: 'full',
        }),
      });
    }

    return {
      zoneId: (zone as CloudflareZone).id,
      nameServers: (zone as CloudflareZone).name_servers ?? [],
      status: (zone as CloudflareZone).status,
    };
  }

  /** Statut actuel de la zone ('active' | 'pending' | ...), sans la créer si absente. */
  async getZoneStatus(domain: string): Promise<string | null> {
    const zone = await this.findZone(domain);
    return zone ? zone.status : null;
  }

  /** À appeler seulement une fois la zone 'active' : pointe le domaine vers Vercel. */
  async pointToVercel(zoneId: string, domain: string) {
    // Noms pleinement qualifiés (pas de raccourci '@'/'www') pour que le filtre
    // GET de recherche d'enregistrement existant matche de façon fiable.
    await this.upsertRecord(zoneId, 'A', domain, '76.76.21.21');
    await this.upsertRecord(zoneId, 'CNAME', `www.${domain}`, 'cname.vercel-dns.com');
  }

  private async upsertRecord(
    zoneId: string,
    type: 'A' | 'CNAME',
    name: string,
    content: string,
  ) {
    const existing = await this.cfFetch(
      `/zones/${zoneId}/dns_records?type=${type}&name=${encodeURIComponent(name)}`,
    );
    const body = { type, name, content, ttl: 1, proxied: false };
    if (existing.length > 0) {
      return this.cfFetch(`/zones/${zoneId}/dns_records/${existing[0].id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }
    return this.cfFetch(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
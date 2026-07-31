// backend/src/domain-provisioning/providers/vercel.provider.ts
// v2.1 — + removeDomain(), addDomain() gère aussi le 409 "domain_already_in_use"
import { Injectable, InternalServerErrorException } from '@nestjs/common';

const VERCEL_API = 'https://api.vercel.com';

@Injectable()
export class VercelProvider {
  private async vercelFetch(path: string, init?: RequestInit) {
    const team = process.env.VERCEL_TEAM_ID
      ? `${path.includes('?') ? '&' : '?'}teamId=${process.env.VERCEL_TEAM_ID}`
      : '';
    const res = await fetch(`${VERCEL_API}${path}${team}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new InternalServerErrorException(
        `Vercel API error ${res.status}: ${JSON.stringify(body)}`,
      );
      (err as unknown as { vercelStatus: number }).vercelStatus = res.status;
      throw err;
    }
    return body;
  }

  addDomain(domain: string) {
    return this.vercelFetch(`/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    }).catch((err) => {
      const status = (err as { vercelStatus?: number })?.vercelStatus;
      // 400/409 = le domaine est déjà attaché à CE projet : idempotent, on l'ignore.
      if (status === 400 || status === 409) {
        return this.getDomainStatus(domain);
      }
      throw err;
    });
  }

  /** Détache un domaine du projet Vercel — appelé quand une association est supprimée. */
  removeDomain(domain: string) {
    return this.vercelFetch(`/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`, {
      method: 'DELETE',
    }).catch((err) => {
      // 404 = déjà absent du projet : idempotent, on l'ignore.
      if ((err as { vercelStatus?: number })?.vercelStatus === 404) {
        return null;
      }
      throw err;
    });
  }

  getDomainStatus(domain: string) {
    return this.vercelFetch(`/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`);
  }
}
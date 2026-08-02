// backend/src/domain-provisioning/domain-provisioning.service.ts
// v2.2 — ajout de notifySystemAdmins() sur l'échec du cron checkPendingDomains
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VercelProvider } from './providers/vercel.provider';
import { CloudflareProvider } from './providers/cloudflare.provider';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class DomainProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vercel: VercelProvider,
    private readonly cloudflare: CloudflareProvider,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Étape 1 : appelée à la création de l'association (ou quand un admin
   * change son domaine). Crée la zone Cloudflare si besoin et renvoie les
   * nameservers à faire pointer chez le registrar. Ne touche pas Vercel :
   * inutile tant que les nameservers n'ont pas propagé.
   */
  async provisionAssociationDomain(associationId: string, domain: string) {
    const { zoneId, nameServers, status } = await this.cloudflare.ensureZone(domain);

    await this.prisma.association.update({
      where: { id: associationId },
      data: { domainName: domain, domainStatus: 'PENDING_VERIFICATION' },
    });

    // Zone déjà active (ex: domaine déjà pointé chez Cloudflare auparavant) :
    // pas besoin d'attendre le prochain passage du cron.
    if (status === 'active') {
      await this.cloudflare.pointToVercel(zoneId, domain);
      await this.vercel.addDomain(domain);
      await this.vercel.addDomain(`www.${domain}`);

      // 🔥 CORRECTION : sans ça, domainStatus restait bloqué sur
      // PENDING_VERIFICATION jusqu'au prochain passage du cron (toutes les
      // 6h, voir checkPendingDomains) même quand tout est déjà fonctionnel
      // immédiatement — Vercel sert déjà le site, mais la BDD ne le sait
      // pas encore, ce qui peut affecter tout ce qui teste domainStatus.
      const vercelStatus = await this.vercel.getDomainStatus(domain);
      if (vercelStatus.verified) {
        await this.prisma.association.update({
          where: { id: associationId },
          data: { domainStatus: 'ACTIVE' },
        });
      }
    }

    return { nameServers, zoneStatus: status };
  }

  /**
   * Cron (toutes les 6h, voir vercel.json). Pour chaque association en attente :
   * si la zone Cloudflare vient de passer 'active', pose les DNS + déclare le
   * domaine à Vercel (idempotent, sans risque à rejouer) ; puis vérifie si
   * Vercel a fini de valider → passe l'association en ACTIVE.
   */
  async checkPendingDomains() {
    const pending = await this.prisma.association.findMany({
      where: { domainStatus: 'PENDING_VERIFICATION' },
    });

    let activated = 0;

    for (const asso of pending) {
      if (!asso.domainName) continue;
      try {
        const { zoneId, status } = await this.cloudflare.ensureZone(asso.domainName);
        if (status !== 'active') continue; // nameservers pas encore propagés

        await this.cloudflare.pointToVercel(zoneId, asso.domainName);
        await this.vercel.addDomain(asso.domainName);
        await this.vercel.addDomain(`www.${asso.domainName}`);

        const vercelStatus = await this.vercel.getDomainStatus(asso.domainName);
        if (vercelStatus.verified) {
          await this.prisma.association.update({
            where: { id: asso.id },
            data: { domainStatus: 'ACTIVE' },
          });
          activated++;
        }
      } catch (e) {
        console.error(`Échec vérification ${asso.domainName}`, e);
        // 🔥 AJOUT : ce cron tourne sans surveillance — sans ça, un échec
        // répété restait invisible indéfiniment dans les logs Render.
        await this.notifications.notifySystemAdmins(
          `Échec du provisioning de domaine pour "${asso.name}" (${asso.domainName}) : ${e instanceof Error ? e.message : 'erreur inconnue'}`,
          NotificationType.SYSTEM_ALERT,
        );
      }
    }
    return { checked: pending.length, activated };
  }
}
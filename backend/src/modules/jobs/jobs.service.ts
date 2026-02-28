//backend/src/modules/jobs/jobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Exemple: purge des tokens email expirés (si ton schéma a ces champs)
   */
  async purgeExpiredEmailVerificationTokens(): Promise<{ cleaned: number }> {
    // ⚠️ adapte aux champs réels
    const now = new Date();

    const res = await this.prisma.user.updateMany({
      where: {
        emailVerificationExpiresAt: { lt: now } as any,
        emailVerifiedAt: null as any,
      } as any,
      data: {
        emailVerificationToken: null as any,
        emailVerificationExpiresAt: null as any,
      } as any,
    });

    this.logger.log(`purgeExpiredEmailVerificationTokens cleaned=${res.count}`);
    return { cleaned: res.count };
  }

  /**
   * Exemple: recalcul du solde global validé association
   * (si tu stockes un champ "cachedBalance" sur Association)
   */
  async recomputeAssociationBalances(): Promise<{ updated: number }> {
    // Version safe: calcule à la volée = pas besoin de champ en DB.
    // Si tu veux du cache DB, je te l’implémente après avec ton schéma exact.
    const associations = await this.prisma.association.findMany({ select: { id: true } });
    this.logger.log(`recomputeAssociationBalances associations=${associations.length}`);
    return { updated: associations.length };
  }
}
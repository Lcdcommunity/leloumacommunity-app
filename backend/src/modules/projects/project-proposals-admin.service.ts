// backend/src/modules/projects/project-proposals-admin.service.ts
// v1.2 — CHANGELOG :
// 🔥 AJOUT : l'ANTENNA_ADMIN peut désormais lui aussi modifier/supprimer une
//    proposition (avant comme après validation), mais UNIQUEMENT celles de
//    sa/ses propre(s) antenne(s) gérée(s) — jamais celles d'une autre
//    antenne. Le SUPER_ADMIN/SYSTEM_ADMIN garde une portée sans restriction
//    (toute l'association). Portée résolue via `resolveScope()`, même
//    logique que `AdminService.getAdminContext()` (requête
//    antennaAdminAssignment, isActive: true) — dupliquée ici plutôt que
//    réutilisée car ce service reste volontairement isolé.
// v1.1 — la restriction "modifiable/supprimable uniquement avant validation"
//    a été retirée : fonctionne quel que soit le statut de la proposition.
// v1.0 — NOUVEAU FICHIER (service isolé, ne touche pas à projects.service.ts
//    existant — convention : nouvelles fonctionnalités en fichiers séparés).

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';

export interface UpdateProposalAdminInput {
  title?: string;
  description?: string;
  estimatedBudget?: number | null;
}

interface Scope {
  antennaIds?: string[];
  associationId: string;
}

@Injectable()
export class ProjectProposalsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveScope(user: AuthUser): Promise<Scope> {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.SYSTEM_ADMIN) {
      return { antennaIds: undefined, associationId: user.associationId };
    }

    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: { adminUserId: user.id, isActive: true },
    });

    return {
      antennaIds: assignments.map((a) => a.antennaId),
      associationId: user.associationId,
    };
  }

  private async findOrThrow(proposalId: string, scope: Scope) {
    const proposal = await this.prisma.projectProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || proposal.associationId !== scope.associationId) {
      throw new NotFoundException("Proposition introuvable ou vous n'avez pas les droits.");
    }

    // ANTENNA_ADMIN : restreint à ses propres antennes gérées.
    if (scope.antennaIds && (!proposal.antennaId || !scope.antennaIds.includes(proposal.antennaId))) {
      throw new NotFoundException("Proposition introuvable ou vous n'avez pas les droits.");
    }

    return proposal;
  }

  async update(proposalId: string, user: AuthUser, data: UpdateProposalAdminInput) {
    const scope = await this.resolveScope(user);
    await this.findOrThrow(proposalId, scope);

    return this.prisma.projectProposal.update({
      where: { id: proposalId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.estimatedBudget !== undefined && {
          estimatedBudget:
            data.estimatedBudget === null ? null : new Prisma.Decimal(data.estimatedBudget),
        }),
      },
    });
  }

  async remove(proposalId: string, user: AuthUser) {
    const scope = await this.resolveScope(user);
    await this.findOrThrow(proposalId, scope);

    return this.prisma.$transaction(async (tx) => {
      // Détache le(s) Project(s) éventuellement créé(s) à partir de cette
      // proposition (cas APPROVED) pour éviter toute contrainte de clé
      // étrangère bloquante — le Project lui-même n'est jamais supprimé ici.
      await tx.project.updateMany({
        where: { sourceProposalId: proposalId },
        data: { sourceProposalId: null },
      });

      return tx.projectProposal.delete({ where: { id: proposalId } });
    });
  }
}
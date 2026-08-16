// backend/src/modules/projects/project-proposals-admin.service.ts
// v1.1 — CHANGELOG :
// 🔥 CORRIGÉ : la restriction "modifiable/supprimable uniquement avant
//    validation" (statuts SUBMITTED/UNDER_REVIEW) a été retirée à la
//    demande de l'utilisateur — le SUPER_ADMIN (et SYSTEM_ADMIN) peut
//    désormais modifier ou supprimer une proposition quel que soit son
//    statut, y compris APPROVED ou REJECTED.
// 🔥 AJOUT : suppression d'une proposition déjà APPROVED (donc ayant déjà
//    généré un Project via sourceProposalId) ne casse plus rien côté
//    Project — le lien `sourceProposalId` du/des Project(s) concerné(s)
//    est mis à null avant la suppression (transaction), le Project créé
//    reste intact, seul le lien historique vers la proposition d'origine
//    disparaît.
// v1.0 — NOUVEAU FICHIER (service isolé, ne touche pas à projects.service.ts
//    existant — convention : nouvelles fonctionnalités en fichiers séparés).

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface UpdateProposalAdminInput {
  title?: string;
  description?: string;
  estimatedBudget?: number | null;
}

@Injectable()
export class ProjectProposalsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrThrow(proposalId: string, associationId: string) {
    const proposal = await this.prisma.projectProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || proposal.associationId !== associationId) {
      throw new NotFoundException("Proposition introuvable ou vous n'avez pas les droits.");
    }

    return proposal;
  }

  async update(proposalId: string, associationId: string, data: UpdateProposalAdminInput) {
    await this.findOrThrow(proposalId, associationId);

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

  async remove(proposalId: string, associationId: string) {
    await this.findOrThrow(proposalId, associationId);

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
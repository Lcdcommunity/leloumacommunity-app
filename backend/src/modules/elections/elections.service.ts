/////// backend/src/modules/elections/elections.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ElectionStatus, UserRole } from '@prisma/client';

@Injectable()
export class ElectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère l'élection active pour les membres (statut OPEN)
   */
  async getActiveElection(associationId: string) {
    return this.prisma.election.findFirst({
      where: { associationId, status: ElectionStatus.OPEN },
      include: {
        positions: {
          orderBy: { order: 'asc' },
          include: {
            candidates: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    professionalStatus: true,
                    city: true,
                    country: true,
                    profilePhoto: { select: { url: true } }
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Enregistre un vote avec verrouillage de sécurité
   */
  async castVote(voterId: string, associationId: string, positionId: string, candidateId: string, userRole: UserRole) {
    // 1. Devoir de réserve pour les Administrateurs
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ANTENNA_ADMIN) {
      throw new ForbiddenException("En tant qu'administrateur, vous n'êtes pas autorisé à participer au vote (devoir de réserve).");
    }

    const position = await this.prisma.electionPosition.findUnique({
      where: { id: positionId },
      include: { election: true }
    });

    if (!position || position.election.associationId !== associationId) {
      throw new NotFoundException("Poste électoral introuvable.");
    }

    // 2. Vérification du statut
    if (position.election.status !== ElectionStatus.OPEN) {
      throw new BadRequestException("Les votes pour cette élection sont clôturés ou pas encore ouverts.");
    }

    // ⚡ FIX CHIRURGICAL DES DATES (Timezone)
    // Si l'élection est manuellement sur OPEN, on autorise le vote même si l'heure de début est très proche.
    const now = new Date();
    
    // On ajoute une petite marge de sécurité de 5 minutes pour éviter les problèmes de synchro d'horloge serveur/client
    const safetyMargin = 5 * 60 * 1000; 

    if (position.election.startsAt && (now.getTime() + safetyMargin) < position.election.startsAt.getTime()) {
      throw new BadRequestException("Le scrutin n'a pas encore démarré selon le calendrier.");
    }

    if (position.election.endsAt && now > position.election.endsAt) {
      throw new BadRequestException("Le temps imparti pour ce scrutin est écoulé.");
    }

    // 3. Enregistrement du vote
    try {
      return await this.prisma.electionVote.create({
        data: {
          positionId,
          candidateId,
          voterUserId: voterId
        }
      });
    } catch (error: any) {
      // Erreur P2002 = Violation de contrainte unique (déjà voté)
      if (error.code === 'P2002') {
        throw new ForbiddenException("Vous avez déjà exprimé votre vote pour ce poste.");
      }
      throw error;
    }
  }

  /**
   * Résultats en temps réel (Live Stats)
   */
  async getLiveResults(electionId: string, associationId: string) {
    const election = await this.prisma.election.findFirst({
      where: { id: electionId, associationId }
    });

    if (!election) throw new NotFoundException("Élection introuvable.");

    const positions = await this.prisma.electionPosition.findMany({
      where: { electionId },
      include: {
        candidates: {
          include: {
            user: { 
              select: { 
                firstName: true, 
                lastName: true,
                email: true,
                originSubPrefecture: true
              } 
            },
            _count: { select: { votes: true } }
          }
        },
        _count: { select: { votes: true } }
      }
    });

    return positions.map(p => ({
      id: p.id,
      title: p.title,
      totalVotes: p._count.votes,
      results: p.candidates.map(c => ({
        candidateId: c.id,
        name: `${c.user.firstName} ${c.user.lastName}`,
        email: c.user.email,
        originSubPrefecture: c.user.originSubPrefecture,
        votes: c._count.votes,
        percentage: p._count.votes > 0 ? (c._count.votes / p._count.votes) * 100 : 0
      }))
    }));
  }
}
/////// backend/src/modules/super-admin/super-admin-elections.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ElectionStatus } from '@prisma/client';

@Injectable()
export class SuperAdminElectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listElections(associationId: string) {
    return this.prisma.election.findMany({
      where: { associationId },
      orderBy: { createdAt: 'desc' },
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
                    email: true,
                    professionalStatus: true,
                    profilePhoto: { select: { url: true } }
                  }
                }
              }
            }
          }
        },
        _count: { select: { positions: true } }
      }
    });
  }

  async createElection(associationId: string, title: string, description?: string, startsAt?: string, endsAt?: string) {
    return this.prisma.election.create({
      data: {
        associationId,
        title,
        description,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        status: ElectionStatus.DRAFT,
      }
    });
  }

  async updateStatus(associationId: string, electionId: string, status: ElectionStatus) {
    const election = await this.prisma.election.findFirst({ 
      where: { id: electionId, associationId }
    });
    if (!election) throw new NotFoundException("Élection introuvable.");
    return this.prisma.election.update({
      where: { id: electionId },
      data: { status }
    });
  }

  async deleteElection(associationId: string, electionId: string) {
    const election = await this.prisma.election.findFirst({
      where: { id: electionId, associationId }
    });
    if (!election) throw new NotFoundException("Élection introuvable.");
    return this.prisma.election.delete({
      where: { id: electionId }
    });
  }

  async addPosition(associationId: string, electionId: string, title: string, order: number) {
    const election = await this.prisma.election.findFirst({ 
      where: { id: electionId, associationId }
    });
    if (!election) throw new NotFoundException("Élection introuvable.");
    if (election.status !== ElectionStatus.DRAFT) throw new BadRequestException("Impossible de modifier une élection en cours.");

    return this.prisma.electionPosition.create({
      data: { electionId, title, order }
    });
  }

  // ⚡ NOUVEAU : Mettre à jour le titre d'un poste
  async updatePosition(associationId: string, positionId: string, title: string) {
    const position = await this.prisma.electionPosition.findFirst({
      where: { id: positionId, election: { associationId } },
      include: { election: true }
    });
    if (!position) throw new NotFoundException("Poste introuvable.");
    if (position.election.status !== ElectionStatus.DRAFT) throw new BadRequestException("Impossible de modifier une élection en cours.");

    return this.prisma.electionPosition.update({
      where: { id: positionId },
      data: { title }
    });
  }

  // ⚡ NOUVEAU : Supprimer un poste
  async deletePosition(associationId: string, positionId: string) {
    const position = await this.prisma.electionPosition.findFirst({
      where: { id: positionId, election: { associationId } },
      include: { election: true }
    });
    if (!position) throw new NotFoundException("Poste introuvable.");
    if (position.election.status !== ElectionStatus.DRAFT) throw new BadRequestException("Impossible de modifier une élection en cours.");

    return this.prisma.electionPosition.delete({
      where: { id: positionId }
    });
  }

  async addCandidate(associationId: string, positionId: string, userId: string, bio?: string) {
    const position = await this.prisma.electionPosition.findFirst({
      where: { id: positionId, election: { associationId } },
      include: { election: true }
    });
    
    if (!position) throw new NotFoundException("Poste introuvable.");
    if (position.election.status !== ElectionStatus.DRAFT) throw new BadRequestException("Vous ne pouvez ajouter des candidats que lorsque l'élection est en statut Brouillon.");

    try {
      return await this.prisma.electionCandidate.create({
        data: { positionId, userId, bio }
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
        throw new BadRequestException("Ce membre est déjà candidat à ce poste.");
      }
      throw error;
    }
  }

  // ⚡ NOUVEAU : Retirer un candidat
  async removeCandidate(associationId: string, candidateId: string) {
    const candidate = await this.prisma.electionCandidate.findFirst({
      where: { id: candidateId, position: { election: { associationId } } },
      include: { position: { include: { election: true } } }
    });
    if (!candidate) throw new NotFoundException("Candidat introuvable.");
    if (candidate.position.election.status !== ElectionStatus.DRAFT) throw new BadRequestException("Impossible de modifier une élection en cours.");

    return this.prisma.electionCandidate.delete({
      where: { id: candidateId }
    });
  }
}
//backend/src/modules/super-admin/super-admin.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus, Prisma } from '@prisma/client';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listAntennas(page: number, pageSize: number, q?: string, isActive?: boolean) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.AntennaWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.antenna.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.antenna.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listUsersByRole(role: UserRole, page: number, pageSize: number, q?: string, status?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput = { 
      role,
      ...(status ? { status: status as UserStatus } : {})
    };
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { memberships: { include: { antenna: true } } }
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listProjects(page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProjectWhereInput = q ? { title: { contains: q, mode: 'insensitive' } } : {};
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { antenna: true } }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listDocuments(page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.DocumentWhereInput = q ? { title: { contains: q, mode: 'insensitive' } } : {};
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { antenna: true, file: true } }),
      this.prisma.document.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // --- ACTIONS SUR LES COMPTES ---
  async approveUser(userId: string, adminId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE, approvedByUserId: adminId, approvedAt: new Date() },
    });
  }

  async rejectUser(userId: string, adminId: string, reason: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.REJECTED, rejectedByUserId: adminId, rejectedAt: new Date(), rejectionReason: reason },
    });
  }

  async createAntenna(data: any) {
    const association = await this.prisma.association.findFirst();
    if (!association) throw new NotFoundException("Association manquante.");
    return this.prisma.antenna.create({ data: { ...data, associationId: association.id } });
  }

  async updateAntenna(id: string, data: any) {
    return this.prisma.antenna.update({ where: { id }, data });
  }

  async listAllContributions(page: number, pageSize: number, status?: any) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.ContributionWhereInput = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.contribution.findMany({ where, skip, take: pageSize, include: { member: true, antenna: true } }),
      this.prisma.contribution.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
//src/modules/users/users.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipApprovalStatus, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash.util';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../common/types/auth-user.type';
import { ApproveMemberDto } from './dto/approve-member.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createAntennaAdmin(dto: CreateAdminUserDto, actor: AuthUser) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Seul le SUPER_ADMIN peut créer un admin');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new BadRequestException('Email déjà utilisé');

    const user = await this.prisma.user.create({
      data: {
        associationId: dto.associationId,
        role: UserRole.ANTENNA_ADMIN,
        status: UserStatus.ACTIVE,
        email: dto.email.toLowerCase(),
        emailVerifiedAt: new Date(),
        passwordHash: await hashPassword(dto.password),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        fullNameNormalized: `${dto.firstName} ${dto.lastName}`.toLowerCase(),
        phone: dto.phone?.trim(),
        createdByUserId: actor.id,
        approvedByUserId: actor.id,
        approvedAt: new Date(),
      },
    });

    await this.audit.log({
      associationId: dto.associationId,
      actorUserId: actor.id,
      action: 'CREATE_ADMIN_ACCOUNT',
      targetModel: 'User',
      targetId: user.id,
      targetUserId: user.id,
      summary: 'Création compte admin d’antenne par SUPER_ADMIN',
    });

    return user;
  }

  async approveMember(dto: ApproveMemberDto, actor: AuthUser) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: dto.membershipId },
      include: { user: true, antenna: true },
    });

    if (!membership) throw new NotFoundException('Membership introuvable');

    if (actor.role === UserRole.ANTENNA_ADMIN) {
      const assignment = await this.prisma.antennaAdminAssignment.findFirst({
        where: {
          antennaId: membership.antennaId,
          adminUserId: actor.id,
          isActive: true,
          canValidateMembers: true,
        },
      });
      if (!assignment) throw new ForbiddenException('Non autorisé sur cette antenne');
    } else if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Non autorisé');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const m = await tx.membership.update({
        where: { id: membership.id },
        data: {
          status: MembershipApprovalStatus.APPROVED,
          approvedByUserId: actor.id,
          approvedAt: now,
          joinedAt: membership.joinedAt ?? now,
        },
      });

      const user = await tx.user.update({
        where: { id: membership.userId },
        data: {
          status: UserStatus.ACTIVE,
          approvedByUserId: actor.id,
          approvedAt: now,
          rejectedByUserId: null,
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      return { membership: m, user };
    });

    await this.audit.log({
      associationId: membership.associationId,
      antennaId: membership.antennaId,
      actorUserId: actor.id,
      action: 'APPROVE_ACCOUNT',
      targetModel: 'User',
      targetId: membership.userId,
      targetUserId: membership.userId,
      summary: 'Validation du compte membre',
    });

    return result;
  }
}
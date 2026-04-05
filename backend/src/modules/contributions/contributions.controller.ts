// src/modules/contributions/contributions.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ValidateContributionDto } from './dto/validate-contribution.dto';
import { RejectContributionDto } from './dto/reject-contribution.dto';

@Controller('contributions')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class ContributionsController {
  constructor(
    private readonly service: ContributionsService,
  ) {}

  @Get()
  @Roles(
    UserRole.ANTENNA_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  listAll(
    @CurrentUser()
    user: AuthUser,
    @Query('antennaId')
    antennaId?: string,
  ) {
    const targetAntennaId =
      user.role ===
      UserRole.ANTENNA_ADMIN
        ? user.antennaId
        : antennaId;

    return this.service.findAll(
      user.associationId,
      targetAntennaId,
    );
  }

  @Post()
  @Roles(UserRole.MEMBER)
  create(
    @Body()
    dto: CreateContributionDto,
    @CurrentUser()
    user: AuthUser,
  ) {
    return this.service.createForMember(
      dto,
      user,
    );
  }

  @Get('me')
  @Roles(UserRole.MEMBER)
  mine(
    @CurrentUser()
    user: AuthUser,
  ) {
    return this.service.listMine(
      user,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.ANTENNA_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  findOne(
    @Param('id')
    id: string,
    @CurrentUser()
    user: AuthUser,
  ) {
    return this.service.findOne(
      id,
      user.associationId,
    );
  }

  @Patch(':id/validate')
  @Roles(
    UserRole.ANTENNA_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  validate(
    @Param('id')
    id: string,
    @Body()
    dto: ValidateContributionDto,
    @CurrentUser()
    user: AuthUser,
  ) {
    return this.service.validateContribution(
      id,
      dto,
      user,
    );
  }

  @Patch(':id/reject')
  @Roles(
    UserRole.ANTENNA_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  reject(
    @Param('id')
    id: string,
    @Body()
    dto: RejectContributionDto,
    @CurrentUser()
    user: AuthUser,
  ) {
    return this.service.rejectContribution(
      id,
      dto,
      user,
    );
  }

  @Get('late-members')
  @Roles(
    UserRole.ANTENNA_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  lateMembers(
    @CurrentUser()
    user: AuthUser,
    @Query('antennaId')
    antennaId?: string,
    @Query('thresholdMonths')
    thresholdMonths?: string,
  ) {
    const targetAntennaId =
      user.role ===
      UserRole.ANTENNA_ADMIN
        ? user.antennaId
        : antennaId;

    const n =
      thresholdMonths
        ? Number(
            thresholdMonths,
          )
        : 3;

    return this.service.lateMembers(
      user.associationId,
      targetAntennaId,
      Number.isFinite(n)
        ? n
        : 3,
    );
  }

  @Post(':id/cancel')
  @Roles(UserRole.MEMBER)
  cancel(
    @Param('id')
    id: string,
    @CurrentUser()
    user: AuthUser,
  ) {
    return this.service.cancelContribution(
      id,
      user,
    );
  }
}
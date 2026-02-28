//backend/src/modules/jobs/jobs.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.SUPER_ADMIN)
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Post('purge-email-tokens')
  purgeEmailTokens() {
    return this.service.purgeExpiredEmailVerificationTokens();
  }

  @Post('recompute-balances')
  recomputeBalances() {
    return this.service.recomputeAssociationBalances();
  }
}
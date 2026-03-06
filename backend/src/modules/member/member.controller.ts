// backend/src/modules/member/member.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MemberService } from './member.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { MemberProfileUpdateDto } from './dto/member-profile-update.dto';
import { MemberPreferencesUpdateDto } from './dto/member-preferences-update.dto';
import { CreateMemberContributionDto } from './dto/create-member-contribution.dto';
import { MemberContributionsQueryDto } from './dto/member-contributions-query.dto';
import { LateMembersQueryDto } from './dto/late-members-query.dto';
import { MemberProjectsQueryDto } from './dto/member-projects-query.dto';
import { CreateProjectProposalDto } from './dto/create-project-proposal.dto';
import { MemberProjectProposalsQueryDto } from './dto/member-project-proposals-query.dto';
import { MemberDocumentsQueryDto } from './dto/member-documents-query.dto';
import { MemberContentsQueryDto } from './dto/member-contents-query.dto';

@Controller('member')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MEMBER)
export class MemberController {
  constructor(private readonly service: MemberService) {}

  // 👇 NOUVELLE ROUTE : Dashboard Membre
  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.service.getDashboard(user.id);
  }

  // Profil
  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: MemberProfileUpdateDto) {
    return this.service.updateProfile(user.id, dto);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser() user: AuthUser, @Body() dto: MemberPreferencesUpdateDto) {
    return this.service.updatePreferences(user.id, dto);
  }

  // Cotisations
  @Post('contributions')
  createContribution(@CurrentUser() user: AuthUser, @Body() dto: CreateMemberContributionDto) {
    return this.service.createContribution(user.id, dto);
  }

  @Get('contributions')
  listMyContributions(@CurrentUser() user: AuthUser, @Query() query: MemberContributionsQueryDto) {
    return this.service.listMyContributions(user.id, query);
  }

  // Visibilité association
  @Get('association-balance')
  getAssociationBalanceSummary(@CurrentUser() user: AuthUser) {
    return this.service.getAssociationBalanceSummary(user.id);
  }

  @Get('late-members')
  listLateMembers(@CurrentUser() user: AuthUser, @Query() query: LateMembersQueryDto) {
    return this.service.listLateMembers(user.id, query);
  }

  // Projets (lecture)
  @Get('projects')
  listProjectsForMembers(@CurrentUser() user: AuthUser, @Query() query: MemberProjectsQueryDto) {
    return this.service.listProjectsForMembers(user.id, query);
  }

  // Propositions de projets
  @Post('project-proposals')
  createProjectProposal(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectProposalDto) {
    return this.service.createProjectProposal(user.id, dto);
  }

  @Get('project-proposals')
  listMyProjectProposals(
    @CurrentUser() user: AuthUser,
    @Query() query: MemberProjectProposalsQueryDto,
  ) {
    return this.service.listMyProjectProposals(user.id, query);
  }

  // Documents / contenus
  @Get('documents')
  listDocuments(@CurrentUser() user: AuthUser, @Query() query: MemberDocumentsQueryDto) {
    return this.service.listDocuments(user.id, query);
  }

  @Get('contents')
  listContents(@CurrentUser() user: AuthUser, @Query() query: MemberContentsQueryDto) {
    return this.service.listContents(user.id, query);
  }

  // NOTE : Les endpoints de notifications ont été retirés d'ici 
  // car ils sont désormais gérés par le module/contrôleur Notifications dédié.
}
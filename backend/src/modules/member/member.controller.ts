//backend/src/modules/member/member.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
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
import { PushSubscriptionDto } from './dto/push-subscription.dto';

@Controller('member')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MEMBER)
export class MemberController {
  constructor(private readonly service: MemberService) {}

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

  @Post('push-subscription')
  subscribeToPush(@CurrentUser() user: AuthUser, @Body() dto: PushSubscriptionDto) {
    return this.service.subscribeToPushNotifications(user.id, dto);
  }

  // Rechercher un membre pour le paiement tiers
  @Get('search-users')
  searchMembers(@CurrentUser() user: AuthUser, @Query('q') q: string) {
    return this.service.searchMembers(user.id, q);
  }

  // ─── COTISATIONS ───────────────────────────────────────────────────────────

  @Post('contributions')
  createContribution(@CurrentUser() user: AuthUser, @Body() dto: CreateMemberContributionDto) {
    return this.service.createContribution(user.id, dto);
  }

  @Get('contributions')
  listMyContributions(@CurrentUser() user: AuthUser, @Query() query: MemberContributionsQueryDto) {
    return this.service.listMyContributions(user.id, query);
  }

  // 🔥 NOUVEAU : Modifier le montant d'une transaction PENDING (membre sur ses propres contributions)
  @Patch('contributions/:id')
  updateMyContribution(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.service.updateMyContribution(user.id, id, body.amount);
  }

  // 🔥 NOUVEAU : Supprimer une transaction PENDING (membre sur ses propres contributions)
  @Delete('contributions/:id')
  deleteMyContribution(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteMyContribution(user.id, id);
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

  @Patch('project-proposals/:id')
  updateProjectProposal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProjectProposalDto> & { attachmentFileAssetId?: string },
  ) {
    return this.service.updateProjectProposal(user.id, id, dto);
  }

  @Delete('project-proposals/:id')
  deleteProjectProposal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteProjectProposal(user.id, id);
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
}
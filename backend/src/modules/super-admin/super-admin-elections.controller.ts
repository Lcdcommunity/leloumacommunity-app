/////// backend/src/modules/super-admin/super-admin-elections.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SuperAdminElectionsService } from './super-admin-elections.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { 
  CreateElectionDto, 
  UpdateElectionStatusDto, 
  AddElectionPositionDto, 
  UpdateElectionPositionDto,
  AddElectionCandidateDto 
} from './dto/elections.dto';

@Controller('super-admin/elections')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminElectionsController {
  constructor(private readonly service: SuperAdminElectionsService) {}

  @Get()
  listElections(@CurrentUser() user: AuthUser) {
    return this.service.listElections(user.associationId);
  }

  @Delete(':id')
  deleteElection(
    @CurrentUser() user: AuthUser,
    @Param('id') electionId: string
  ) {
    return this.service.deleteElection(user.associationId, electionId);
  }

  @Post()
  createElection(@CurrentUser() user: AuthUser, @Body() body: CreateElectionDto) {
    return this.service.createElection(user.associationId, body.title, body.description, body.startsAt, body.endsAt);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') electionId: string,
    @Body() body: UpdateElectionStatusDto
  ) {
    return this.service.updateStatus(user.associationId, electionId, body.status);
  }

  @Post(':id/positions')
  addPosition(
    @CurrentUser() user: AuthUser,
    @Param('id') electionId: string,
    @Body() body: AddElectionPositionDto
  ) {
    return this.service.addPosition(user.associationId, electionId, body.title, body.order);
  }

  // ⚡ NOUVEAU : Modifier un poste
  @Patch('positions/:positionId')
  updatePosition(
    @CurrentUser() user: AuthUser,
    @Param('positionId') positionId: string,
    @Body() body: UpdateElectionPositionDto
  ) {
    return this.service.updatePosition(user.associationId, positionId, body.title);
  }

  // ⚡ NOUVEAU : Supprimer un poste
  @Delete('positions/:positionId')
  deletePosition(
    @CurrentUser() user: AuthUser,
    @Param('positionId') positionId: string
  ) {
    return this.service.deletePosition(user.associationId, positionId);
  }

  @Post('positions/:positionId/candidates')
  addCandidate(
    @CurrentUser() user: AuthUser,
    @Param('positionId') positionId: string,
    @Body() body: AddElectionCandidateDto
  ) {
    return this.service.addCandidate(user.associationId, positionId, body.userId, body.bio);
  }

  // ⚡ NOUVEAU : Retirer un candidat
  @Delete('candidates/:candidateId')
  removeCandidate(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string
  ) {
    return this.service.removeCandidate(user.associationId, candidateId);
  }
}
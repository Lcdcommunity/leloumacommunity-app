/////// backend/src/modules/elections/elections.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ElectionsService } from './elections.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsNotEmpty } from 'class-validator';

// DTO Strict pour le vote
export class CastVoteDto {
  @IsString({ message: "Le poste visé est invalide." })
  @IsNotEmpty({ message: "L'identifiant du poste est requis." })
  positionId!: string;

  @IsString({ message: "Le candidat sélectionné est invalide." })
  @IsNotEmpty({ message: "L'identifiant du candidat est requis." })
  candidateId!: string;
}

@Controller('elections')
@UseGuards(JwtAuthGuard)
export class ElectionsController {
  constructor(private readonly service: ElectionsService) {}

  @Get('active')
  getActiveElection(@CurrentUser() user: AuthUser) {
    return this.service.getActiveElection(user.associationId);
  }

  @Post('vote')
  castVote(
    @CurrentUser() user: AuthUser,
    @Body() body: CastVoteDto
  ) {
    // ⚡ On passe bien user.role au service pour appliquer le devoir de réserve
    return this.service.castVote(
      user.id, 
      user.associationId, 
      body.positionId, 
      body.candidateId,
      user.role 
    );
  }

  @Get(':id/live-results')
  getLiveResults(
    @CurrentUser() user: AuthUser,
    @Param('id') electionId: string
  ) {
    return this.service.getLiveResults(electionId, user.associationId);
  }
}
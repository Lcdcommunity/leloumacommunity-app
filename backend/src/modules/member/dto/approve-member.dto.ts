//src/modules/member/dto/approve-member.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveMemberDto {
  @IsOptional()
  @IsString({ message: 'Le commentaire doit être une chaîne de caractères.' })
  @MaxLength(500, { message: 'Le commentaire ne peut pas dépasser 500 caractères.' })
  comment?: string;

  // Tu pourras ajouter d'autres champs ici à l'avenir si besoin
  // (ex: assigner un rôle spécifique ou changer l'antenne au moment de l'approbation)
}
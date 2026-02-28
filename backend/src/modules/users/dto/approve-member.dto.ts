//backend/src/modules/users/dto/approve-member.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ApproveMemberDto {
  @IsNotEmpty({ message: 'L\'identifiant de l\'adhésion (membershipId) est requis.' })
  @IsString()
  membershipId: string;

  @IsOptional()
  @IsString({ message: 'Le commentaire doit être une chaîne de caractères.' })
  @MaxLength(500, { message: 'Le commentaire ne peut pas dépasser 500 caractères.' })
  comment?: string;
}
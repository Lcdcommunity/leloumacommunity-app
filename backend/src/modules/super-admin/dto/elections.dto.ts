/////// backend/src/modules/super-admin/dto/elections.dto.ts
import { IsString, IsOptional, IsEnum, IsNumber, IsNotEmpty, IsDateString } from 'class-validator';
import { ElectionStatus } from '@prisma/client';

export class CreateElectionDto {
  @IsString({ message: "Le titre est invalide." })
  @IsNotEmpty({ message: "Le titre est requis." })
  title!: string;

  @IsOptional()
  @IsString({ message: "La description est invalide." })
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: "La date de début est invalide." })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: "La date de fin est invalide." })
  endsAt?: string;
}

export class UpdateElectionStatusDto {
  @IsEnum(ElectionStatus, { message: "Statut d'élection invalide." })
  @IsNotEmpty({ message: "Le statut est requis." })
  status!: ElectionStatus;
}

export class AddElectionPositionDto {
  @IsString({ message: "Le titre du poste est invalide." })
  @IsNotEmpty({ message: "Le titre du poste est requis." })
  title!: string;

  @IsNumber({}, { message: "L'ordre doit être un nombre." })
  order!: number;
}

// ⚡ NOUVEAU : DTO pour modifier un poste
export class UpdateElectionPositionDto {
  @IsString({ message: "Le titre du poste est invalide." })
  @IsNotEmpty({ message: "Le titre du poste est requis." })
  title!: string;
}

export class AddElectionCandidateDto {
  @IsString({ message: "L'identifiant de l'utilisateur est invalide." })
  @IsNotEmpty({ message: "Le candidat est requis." })
  userId!: string;

  @IsOptional()
  @IsString({ message: "La biographie est invalide." })
  bio?: string;
}
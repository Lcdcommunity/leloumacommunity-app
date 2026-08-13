// backend/src/modules/communications/dto/send-communication.dto.ts
//
// v1.1 — Revu : `audienceType` (LATE_PAYERS | ALL_MEMBERS) et `selectionMode`
//   (BULK | INDIVIDUAL) séparés en deux champs indépendants au lieu d'un
//   audienceType à 3 valeurs — colle plus précisément à la demande : "pour
//   un envoi collectif... ou par sélection individuelle" s'applique aux DEUX
//   audiences (retardataires ET information générale), pas seulement à une
//   audience "individuelle" à part.
//
// v1.0 — Fichier neuf, isolé (module communications).
//
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CommunicationAudienceType {
  LATE_PAYERS = 'LATE_PAYERS', // Retardataires (de l'antenne / de l'association selon le rôle)
  ALL_MEMBERS = 'ALL_MEMBERS', // Information générale, indépendante du retard
}

export enum CommunicationSelectionMode {
  BULK = 'BULK', // Tout le monde dans l'audience choisie
  INDIVIDUAL = 'INDIVIDUAL', // Sélection manuelle (nom/prénom/téléphone/email) dans cette même audience
}

class CommunicationChannelsDto {
  @IsBoolean()
  email!: boolean;

  @IsBoolean()
  sms!: boolean;
}

export class SendCommunicationDto {
  @IsEnum(CommunicationAudienceType)
  audienceType!: CommunicationAudienceType;

  @IsEnum(CommunicationSelectionMode)
  selectionMode!: CommunicationSelectionMode;

  // Super admin seulement : id d'une antenne précise pour filtrer, ou omis /
  // undefined pour "toutes les antennes". Pour un ANTENNA_ADMIN, ce champ est
  // ignoré côté service (toujours restreint à ses propres antennes) — le
  // service fait autorité sur le scope, inutile de le valider strictement ici.
  @IsOptional()
  @IsString()
  antennaId?: string;

  // Requis uniquement quand selectionMode = INDIVIDUAL.
  @ValidateIf((o: SendCommunicationDto) => o.selectionMode === CommunicationSelectionMode.INDIVIDUAL)
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  recipientUserIds?: string[];

  @ValidateNested()
  @Type(() => CommunicationChannelsDto)
  channels!: CommunicationChannelsDto;

  // Titre interne : affiché en en-tête de l'email (H1) et conservé dans le
  // journal ReminderRunLog. Pas d'équivalent SMS (pas de place pour un titre
  // distinct du corps dans un texto).
  @IsString()
  @IsNotEmpty()
  title!: string;

  // Objet de l'email — obligatoire seulement si le canal email est activé,
  // ignoré pour le SMS.
  @ValidateIf((o: SendCommunicationDto) => o.channels?.email === true)
  @IsString()
  @IsNotEmpty()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  body!: string;
}
// backend/src/modules/events/dto/event.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsDateString, IsArray } from 'class-validator';
import { EventType, EventStatus, AttendanceStatus } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsDateString()
  @IsNotEmpty()
  startsAt: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsString()
  @IsOptional()
  locationText?: string;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @IsString()
  @IsOptional()
  meetingLink?: string;

  @IsString()
  @IsOptional()
  coverImageId?: string;

  // 👇 AJOUT CHIRURGICAL : Support de la sélection multiple (Super-Admin)
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  antennaIds?: string[];
}

export class UpdateEventDto extends CreateEventDto {}

export class RegisterAttendanceDto {
  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;
}
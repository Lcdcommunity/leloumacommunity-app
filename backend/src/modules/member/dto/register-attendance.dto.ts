//backend/src/modules/member/dto/register-attendance.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class RegisterAttendanceDto {
  @IsEnum(AttendanceStatus, {
    message: "Le statut doit être 'ATTENDING' ou 'ABSENT'",
  })
  @IsNotEmpty({ message: 'Le statut est obligatoire' })
  status: AttendanceStatus;
}
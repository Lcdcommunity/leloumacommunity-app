// backend/src/modules/auth/dto/member-signup.dto.ts
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  IsBoolean,
  Equals,
} from 'class-validator';

export class MemberSignupDto {
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @IsUUID()
  antennaId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  // 👇 NOUVEAU CHAMP : Validation stricte pour les mentions légales
  @IsBoolean()
  @Equals(true, { message: 'Vous devez accepter les mentions légales et la politique de confidentialité.' })
  termsAccepted!: boolean;
}
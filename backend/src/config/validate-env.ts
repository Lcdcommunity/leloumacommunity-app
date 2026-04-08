// backend/src/config/validate-env.ts
import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  validateSync,
  IsEmail,
} from 'class-validator';

class EnvVars {
  @IsString() DATABASE_URL!: string;
  @IsString() JWT_ACCESS_SECRET!: string;
  @IsString() JWT_ACCESS_EXPIRES_IN!: string;
  @IsString() JWT_REFRESH_SECRET!: string;
  @IsString() JWT_REFRESH_EXPIRES_IN!: string;

  @IsOptional() @IsString() APP_BASE_URL?: string;
  @IsOptional() @IsString() FRONTEND_URL?: string;

  // Sécurité
  @IsOptional() @IsNumberString() THROTTLE_TTL?: string;
  @IsOptional() @IsNumberString() THROTTLE_LIMIT?: string;

  // Cloudinary (👈 AJOUTÉ POUR LES PROFILS)
  @IsOptional() @IsString() CLOUDINARY_CLOUD_NAME?: string;
  @IsOptional() @IsString() CLOUDINARY_API_KEY?: string;
  @IsOptional() @IsString() CLOUDINARY_API_SECRET?: string;

  // Mailer (👈 AJOUTÉ POUR LES NOTIFICATIONS)
  @IsOptional() @IsString() MAIL_HOST?: string;
  @IsOptional() @IsNumberString() MAIL_PORT?: string;
  @IsOptional() @IsString() MAIL_USER?: string;
  @IsOptional() @IsString() MAIL_PASS?: string;
  @IsOptional() @IsString() MAIL_FROM?: string;

  // Stockage (👈 CORRIGÉ : Ajout de Cloudinary et UPLOAD_DRIVER)
  @IsOptional() @IsIn(['local', 's3', 'cloudinary']) STORAGE_DRIVER?: 'local' | 's3' | 'cloudinary';
  @IsOptional() @IsIn(['local', 's3', 'cloudinary']) UPLOAD_DRIVER?: 'local' | 's3' | 'cloudinary';
  @IsOptional() @IsString() LOCAL_UPLOAD_DIR?: string;
  @IsOptional() @IsString() S3_BUCKET?: string;

  // Debug & Meta
  @IsOptional() @IsBooleanString() SWAGGER_ENABLED?: string;
  @IsOptional() @IsBooleanString() SCHEDULER_ENABLED?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvVars, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `❌ Échec de validation de l'environnement :\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return config;
}
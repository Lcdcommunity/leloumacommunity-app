//src/config/validate-env.ts
import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvVars {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsOptional()
  @IsString()
  APP_BASE_URL?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  @IsOptional()
  @IsNumberString()
  PASSWORD_RESET_TOKEN_TTL_MINUTES?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_TTL?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_LIMIT?: string;

  @IsOptional()
  @IsBooleanString()
  SWAGGER_ENABLED?: string;

  @IsOptional()
  @IsString()
  SWAGGER_PATH?: string;

  @IsOptional()
  @IsBooleanString()
  SCHEDULER_ENABLED?: string;

  @IsOptional()
  @IsString()
  CRON_SECRET?: string;

  @IsOptional()
  @IsIn(['local', 's3'])
  STORAGE_DRIVER?: 'local' | 's3';

  @IsOptional()
  @IsString()
  LOCAL_UPLOAD_DIR?: string;

  @IsOptional()
  @IsString()
  LOCAL_PUBLIC_BASE_URL?: string;

  @IsOptional()
  @IsString()
  S3_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  S3_REGION?: string;

  @IsOptional()
  @IsString()
  S3_BUCKET?: string;

  @IsOptional()
  @IsString()
  S3_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  S3_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsBooleanString()
  S3_FORCE_PATH_STYLE?: string;

  @IsOptional()
  @IsString()
  S3_PUBLIC_BASE_URL?: string;
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
      `Environment validation failed:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return config;
}
//src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import * as path from 'path';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

if (typeof BigInt !== 'undefined' && !(BigInt.prototype as { toJSON?: () => string }).toJSON) {
  BigInt.prototype.toJSON = function toJSON() {
    return this.toString();
  };
}

function normalizeOrigins(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/\/+$/, ''));
}

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';

  return normalizeOrigins([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...fromEnv.split(','),
  ]);
}

function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true;
  }

  const cleanOrigin = origin.replace(/\/+$/, '');

  if (allowedOrigins.includes(cleanOrigin)) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(cleanOrigin);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  ) {
    return true;
  }

  if (
    hostname === 'lcd-comminity.vercel.app' ||
    hostname.endsWith('.vercel.app')
  ) {
    return true;
  }

  return false;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.setGlobalPrefix('api');

  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin non autorisée par CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const swaggerEnabled = (process.env.SWAGGER_ENABLED || 'true') === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Association Community API')
      .setDescription("API de gestion d'association communautaire")
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup(process.env.SWAGGER_PATH || 'docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.use(
    '/static',
    express.static(path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads')),
  );

  const port = Number(process.env.PORT || 3001);

  await app.listen(port);

  console.log(`🚀 Serveur lancé sur : http://localhost:${port}/api`);
  console.log('✅ Origines CORS configurées :', allowedOrigins);
}
void bootstrap();
// backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import * as path from 'path';
import * as express from 'express';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

// Importations ajoutées pour les notifications Push (VAPID)
import { configureVapid } from './config/vapid.config';
import { PushService } from './modules/notifications/push.service';

// Polyfill BigInt pour la sérialisation JSON (Prisma)
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

/**
 * Nettoie et prépare les URLs d'origine
 */
function normalizeOrigins(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/\/+$/, ''));
}

/**
 * Récupère les origines autorisées depuis l'environnement
 */
function getAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';

  return normalizeOrigins([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...fromEnv.split(','),
  ]);
}

/**
 * Logique de validation dynamique des origines
 */
function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true; // Autorise les outils comme Postman
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

  // Autorise localhost et les domaines de préproduction Vercel
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
  // Création de l'application sans CORS par défaut pour le configurer manuellement
  const app = await NestFactory.create(AppModule, { cors: false });

  // Configure VAPID pour les notifications push
  const vapidEnabled = configureVapid();
  
  // Injecte l'état VAPID dans le PushService
  const pushService = app.get(PushService);
  pushService.setVapidEnabled(vapidEnabled);

  // Préfixe global pour toutes les routes
  app.setGlobalPrefix('api');

  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const allowedOrigins = getAllowedOrigins();

  // Configuration CORS SaaS robuste
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

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Indispensable pour récupérer l'IP réelle derrière un proxy (Vercel/Nginx)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Configuration Swagger (Documentation API)
  const swaggerEnabled = (process.env.SWAGGER_ENABLED || 'true') === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Association Community API')
      .setDescription("API de gestion d'association communautaire - Multi-tenant")
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup(process.env.SWAGGER_PATH || 'docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Middleware statique Express (En complément de ServeStaticModule)
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
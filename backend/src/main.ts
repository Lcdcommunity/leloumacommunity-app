// backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import * as path from 'path';
import * as express from 'express';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

// VAPID (push notifications)
import { configureVapid } from './config/vapid.config';
import { PushService } from './modules/notifications/push.service';

// Polyfill BigInt (Prisma JSON)
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

/**
 * Nettoie les origins (trim + remove trailing slash)
 */
function normalizeOrigins(values: string[]): string[] {
  return values
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.replace(/\/+$/, ''));
}

/**
 * Récupère les origins depuis ENV
 */
function getAllowedOrigins(): string[] {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    '';

  return normalizeOrigins([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...raw.split(','),
  ]);
}

/**
 * Vérifie si une origin est autorisée
 */
function isAllowedOrigin(origin: string | undefined, allowed: string[]): boolean {
  if (!origin) return true; // Postman, curl, etc.

  const clean = origin.replace(/\/+$/, '');

  // match exact
  if (allowed.includes(clean)) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  // Vercel preview
  if (hostname.endsWith('.vercel.app')) {
    return true;
  }

  // 🔥 TON DOMAINE (IMPORTANT)
  if (hostname.endsWith('leloumacommunity.com')) {
    return true;
  }

  return false;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // VAPID
  const vapidEnabled = configureVapid();
  const pushService = app.get(PushService);
  pushService.setVapidEnabled(vapidEnabled);

  // Prefix API
  app.setGlobalPrefix('api');

  // Middlewares
  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const allowedOrigins = getAllowedOrigins();

  console.log('🌍 CORS ORIGINS (ENV):', allowedOrigins);

  // ✅ CORS CONFIG PRODUCTION SAFE
  app.enableCors({
    origin: (origin, callback) => {
      const ok = isAllowedOrigin(origin, allowedOrigins);

      if (ok) {
        callback(null, true);
      } else {
        console.error('❌ CORS BLOCKED:', origin);
        callback(new Error(`CORS blocked: ${origin}`), false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-tenant-id',
    ],
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Proxy (Render / Vercel / Nginx)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Swagger
  const swaggerEnabled = (process.env.SWAGGER_ENABLED || 'true') === 'true';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Association Community API')
      .setDescription('API de gestion communautaire multi-tenant')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup(
      process.env.SWAGGER_PATH || 'docs',
      app,
      document,
      {
        swaggerOptions: { persistAuthorization: true },
      },
    );
  }

  // Static files
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.use(
    '/static',
    express.static(
      path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads'),
    ),
  );

  const port = Number(process.env.PORT || 3001);

  await app.listen(port);

  console.log(`🚀 API: http://localhost:${port}/api`);
}

void bootstrap();
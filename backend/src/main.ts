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

// ─────────────────────────────────────────────────────────────
// BIGINT JSON FIX (Prisma)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// UTILS CORS
// ─────────────────────────────────────────────────────────────
function normalizeOrigins(values: string[]): string[] {
  return values
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.replace(/\/+$/, ''));
}

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

function isAllowedOrigin(origin: string | undefined, allowed: string[]): boolean {
  if (!origin) return true;

  const clean = origin.replace(/\/+$/, '');

  if (allowed.includes(clean)) return true;

  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname.endsWith('.vercel.app')) return true;

  // 🔥 domaine prod
  if (hostname.endsWith('leloumacommunity.com')) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────────────────────
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
  console.log('🌍 CORS ORIGINS:', allowedOrigins);

  // ─────────────────────────────────────────────────────────────
  // ✅ CORS CONFIG FINAL (FIX COMPLET)
  // ─────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      const ok = isAllowedOrigin(origin, allowedOrigins);

      if (ok) {
        callback(null, true);
      } else {
        console.error('❌ CORS BLOCKED:', origin);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'x-tenant-id',
      'x-tenant-domain', // ✅ FIX CRITIQUE
    ],
    exposedHeaders: ['set-cookie'],
    optionsSuccessStatus: 204,
  });

  // ─────────────────────────────────────────────────────────────
  // ✅ FORCE PREFLIGHT HANDLING (ANTI BUG NAVIGATEUR)
  // ─────────────────────────────────────────────────────────────
  const server = app.getHttpAdapter().getInstance();

  server.options('*', (req, res) => {
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, Authorization, x-tenant-id, x-tenant-domain',
    );
    res.sendStatus(204);
  });

  // ─────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Proxy (Render / Vercel / Nginx)
  server.set('trust proxy', 1);

  // ─────────────────────────────────────────────────────────────
  // SWAGGER
  // ─────────────────────────────────────────────────────────────
  const swaggerEnabled = (process.env.SWAGGER_ENABLED || 'true') === 'true';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Association Community API')
      .setDescription('API multi-tenant')
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

  // ─────────────────────────────────────────────────────────────
  // STATIC FILES
  // ─────────────────────────────────────────────────────────────
  server.use(
    '/static',
    express.static(
      path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads'),
    ),
  );

  // ─────────────────────────────────────────────────────────────
  // START SERVER
  // ─────────────────────────────────────────────────────────────
  const port = Number(process.env.PORT || 3001);
  await app.listen(port);

  console.log(`🚀 API READY → http://localhost:${port}/api`);
}

void bootstrap();
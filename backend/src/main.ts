// backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import * as path from 'path';
import * as express from 'express';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

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

// 🔥 Cache mémoire des domaines personnalisés vérifiés en base — évite de
// taper Prisma à chaque requête CORS, tout en laissant un nouveau domaine
// provisionné devenir valide en moins d'une minute (pas besoin de redéployer).
const customDomainCache = new Map<string, { valid: boolean; expiresAt: number }>();
const CUSTOM_DOMAIN_CACHE_TTL_MS = 60_000;

async function isCustomDomainRegistered(
  hostname: string,
  prisma: PrismaService,
): Promise<boolean> {
  const cached = customDomainCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.valid;
  }

  const association = await prisma.association.findFirst({
    where: { domainName: hostname, isActive: true },
    select: { id: true },
  });

  const valid = !!association;
  customDomainCache.set(hostname, {
    valid,
    expiresAt: Date.now() + CUSTOM_DOMAIN_CACHE_TTL_MS,
  });
  return valid;
}

async function isAllowedOrigin(
  origin: string | undefined,
  allowed: string[],
  prisma: PrismaService,
): Promise<boolean> {
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

  // 🔥 domaine prod historique
  if (hostname.endsWith('leloumacommunity.com')) return true;

  // 🔥 CORRECTION : domaine de la console Grand Chef (system-admin) elle-même
  // — n'est rattaché à aucune Association en base (ce n'est pas un domaine
  // client), donc isCustomDomainRegistered() ne peut jamais le trouver, quoi
  // que contiennent CORS_ORIGINS/FRONTEND_URL. Couvre dkmoney.store ET tous
  // ses sous-domaines (www. inclus) en un seul check.
  if (hostname === 'dkmoney.store' || hostname.endsWith('.dkmoney.store')) return true;

  // 🔥 domaines personnalisés des clients (ex: ajvk.site) — vérifiés en
  // base plutôt que dans une liste statique, sinon chaque nouveau domaine
  // provisionné casse le CORS tant qu'on n'a pas redéployé.
  return isCustomDomainRegistered(hostname, prisma);
}

// ─────────────────────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────────────────────
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  const prisma = app.get(PrismaService);

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
  // ✅ CORS CONFIG FINAL (domaines personnalisés vérifiés dynamiquement)
  // ─────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      isAllowedOrigin(origin, allowedOrigins, prisma)
        .then((ok) => {
          if (ok) {
            callback(null, true);
          } else {
            console.error('❌ CORS BLOCKED:', origin);
            callback(null, false);
          }
        })
        .catch((err) => {
          console.error('❌ CORS CHECK ERROR:', err);
          callback(null, false);
        });
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'x-tenant-id',
      'x-tenant-domain',
    ],
    exposedHeaders: ['set-cookie'],
    optionsSuccessStatus: 204,
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

  const server = app.getHttpAdapter().getInstance();

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
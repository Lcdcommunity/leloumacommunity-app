// backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import * as fs from 'fs';
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

// Instance express pour le handler Vercel
const server = express();

export async function createServer() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), { cors: false });

  // Configuration VAPID
  const vapidEnabled = configureVapid();
  const pushService = app.get(PushService);
  pushService.setVapidEnabled(vapidEnabled);

  // Prefix global de l'API
  app.setGlobalPrefix('api');

  // Middlewares de base
  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // 🔥 INTERCEPTEUR MULTI-TENANT (Spécial Vercel Dev)
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestOrigin = req.headers.origin || req.headers.host || '';
    if (requestOrigin.includes('vercel.app')) {
      req.headers['x-tenant-domain'] = 'www.leloumacommunity.com';
    }
    next();
  });

  // 🔥 CONFIGURATION CORS EXTRÊME (Serverless Ready)
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('leloumacommunity.com')) {
        callback(null, true);
      } else {
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
      'x-tenant-domain', 
    ],
    exposedHeaders: ['set-cookie'],
    optionsSuccessStatus: 204,
  });

  // 🔥 GESTION MANUELLE DU PREFLIGHT (Indispensable sur Vercel)
  server.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, x-tenant-id, x-tenant-domain');
    res.sendStatus(204);
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

  // Trust Proxy pour Render/Vercel
  server.set('trust proxy', 1);

  // Configuration Swagger
  const swaggerEnabled = (process.env.SWAGGER_ENABLED || 'true') === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Lelouma Community API')
      .setDescription('API Multi-tenant pour la gestion associative')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GESTION DES FICHIERS STATIQUES (SÉCURITÉ VERCEL)
  // ─────────────────────────────────────────────────────────────
  const isVercel = process.env.VERCEL === '1';
  const uploadPath = isVercel ? '/tmp/uploads' : './uploads';
  const uploadDir = path.resolve(uploadPath);

  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('📁 Dossier statique initialisé :', uploadDir);
    } catch (err) {
      console.error('⚠️ Erreur de création du dossier statique :', err);
    }
  }

  server.use('/static', express.static(uploadDir));

  await app.init();
  return server;
}

// Handler pour Vercel Serverless
export default async (req: any, res: any) => {
  const instance = await createServer();
  return instance(req, res);
};
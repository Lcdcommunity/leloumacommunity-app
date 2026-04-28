// backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express'; 
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser'; 
import * as path from 'path';
import * as fs from 'fs'; // ⚡ AJOUT : Nécessaire pour créer le dossier
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

// Instance express pour Vercel Serverless
const server = express();

export async function createServer() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), { cors: false });

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

  // 🔥 INTERCEPTEUR CHIRURGICAL POUR TON DEV VERCEL 🔥
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestOrigin = req.headers.origin || req.headers.host || '';
    if (requestOrigin.includes('vercel.app')) {
      req.headers['x-tenant-domain'] = 'www.leloumacommunity.com';
    }
    next();
  });

  // 🔥 FIX CORS EXTRÊME POUR VERCEL SERVERLESS
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('leloumacommunity.com')) {
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
      'x-tenant-domain', 
    ],
    exposedHeaders: ['set-cookie'],
    optionsSuccessStatus: 204,
  });

  // 🔥 FORCE PREFLIGHT HANDLING (ANTI BUG VERCEL)
  server.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, x-tenant-id, x-tenant-domain');
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

  // Proxy (Vercel / Nginx)
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
  // STATIC FILES (FIX SERVERLESS VERCEL - ENOENT)
  // ─────────────────────────────────────────────────────────────
  // ⚡ Vercel est en lecture seule sauf le dossier /tmp
  const isVercel = process.env.VERCEL === '1';
  let defaultUploadDir = './uploads';
  
  if (isVercel) {
    defaultUploadDir = '/tmp/uploads';
  }

  const uploadDir = path.resolve(process.env.LOCAL_UPLOAD_DIR || defaultUploadDir);

  // Création du dossier dynamiquement pour éviter le crash 500
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 Dossier statique créé avec succès : ${uploadDir}`);
    } catch (error) {
      console.error(`❌ Impossible de créer le dossier statique ${uploadDir} :`, error);
    }
  }

  server.use('/static', express.static(uploadDir));

  await app.init();
  return server;
}

// Handler principal exigé par Vercel pour le Serverless
export default async (req: any, res: any) => {
  const instance = await createServer();
  return instance(req, res);
};
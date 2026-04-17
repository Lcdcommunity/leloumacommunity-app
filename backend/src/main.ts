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

  // 🔥 CORRECTION CHIRURGICALE DU CORS
  // Récupération et nettoyage des origines depuis les variables d'environnement
  const corsOriginsStr = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...corsOriginsStr.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
  ];

  // Configuration CORS SaaS robuste
  app.enableCors({
    origin: (origin, callback) => {
      // Autorise les requêtes sans origine (ex: Postman, appels serveurs)
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = origin.replace(/\/+$/, '');

      // Vérifie si l'origine est dans la liste exacte
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      // Autorise dynamiquement tous les sous-domaines Vercel (pour les previews)
      if (cleanOrigin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      // Au lieu de throw une Error qui fait planter la requête preflight (OPTIONS), on renvoie false.
      // Cela permet au navigateur de gérer l'erreur proprement sans crasher le backend.
      callback(null, false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-tenant-id',
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

  // Indispensable pour récupérer l'IP réelle derrière un proxy (Vercel/Nginx/Render)
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

  // Sur Render, le port par défaut est souvent 10000
  const port = Number(process.env.PORT || 10000);

  await app.listen(port);

  console.log(`🚀 Serveur lancé sur : http://localhost:${port}/api`);
  console.log('✅ Origines CORS configurées :', allowedOrigins);
}

void bootstrap();
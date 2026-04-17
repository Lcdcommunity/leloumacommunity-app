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

async function bootstrap() {
  // On désactive totalement le CORS de NestJS
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

  // 🔥 INTERCEPTEUR CORS BRUTAL (BYPASS TOTAL) 🔥
  // Ce code s'exécute avant toute autre chose et force les en-têtes de sécurité
  app.use((req, res, next) => {
    // On récupère l'URL exacte qui fait la requête (ex: https://www.leloumacommunity.com)
    const origin = req.headers.origin;
    
    // Si une origine est détectée, on lui dit expressément "Tu es autorisé"
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Autorisations requises pour les cookies/tokens
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    // Méthodes autorisées
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    // En-têtes autorisés (très important pour x-tenant-id et Authorization)
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-tenant-id'
    );

    // Si le navigateur fait une requête de vérification (OPTIONS / Preflight)
    // On coupe court et on lui renvoie un succès (200) immédiatement.
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
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

  const port = Number(process.env.PORT || 10000);

  await app.listen(port);

  console.log(`🚀 API: http://localhost:${port}/api`);
}

void bootstrap();
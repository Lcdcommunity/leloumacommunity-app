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
  const app = await NestFactory.create(AppModule, { cors: false });

  const vapidEnabled = configureVapid();
  const pushService = app.get(PushService);
  pushService.setVapidEnabled(vapidEnabled);

  app.setGlobalPrefix('api');

  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // 🔥 L'ARME NUCLÉAIRE ANTI-CORS 🔥
  // "origin: true" demande au backend de renvoyer le domaine exact de celui qui fait la requête.
  // Fini les erreurs à cause d'un espace ou d'une virgule mal placée !
  app.enableCors({
    origin: true, 
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-tenant-id',
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
      .setDescription("API de gestion d'association communautaire - Multi-tenant")
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

  const port = Number(process.env.PORT || 10000);

  await app.listen(port);
  console.log(`🚀 Serveur lancé sur le port ${port}`);
}

void bootstrap();
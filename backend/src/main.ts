// backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import * as express from 'express';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

// 1. Logique de création de l'application (Commune aux deux plateformes)
async function setupApp(app) {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Intercepteur pour ton domaine (Bypass Multi-Tenant)
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestOrigin = req.headers.origin || req.headers.host || '';
    if (requestOrigin.includes('vercel.app')) {
      req.headers['x-tenant-domain'] = 'www.leloumacommunity.com';
    }
    next();
  });

  app.enableCors({
    origin: true, 
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-tenant-id', 'x-tenant-domain'],
    exposedHeaders: ['set-cookie'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}

// 2. Point d'entrée pour RENDER (Serveur classique)
async function bootstrap() {
  // On ne lance bootstrap QUE si on n'est pas sur Vercel
  if (process.env.VERCEL) return; 

  const app = await NestFactory.create(AppModule);
  await setupApp(app);
  
  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(`🚀 RENDER READY → Port ${port}`);
}

// 3. Point d'entrée pour VERCEL (Serverless)
let server;
export default async (req, res) => {
  if (!server) {
    const app = await NestFactory.create(AppModule);
    await setupApp(app);
    await app.init();
    server = app.getHttpAdapter().getInstance();
  }
  return server(req, res);
};

// Lancement normal pour Render/Local
bootstrap();
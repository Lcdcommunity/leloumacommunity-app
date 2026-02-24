//src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.setGlobalPrefix('api');

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Trust proxy (Railway / Vercel / Nginx)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const swaggerEnabled = (process.env.SWAGGER_ENABLED || 'true') === 'true';
  if (swaggerEnabled) {
    const swaggerPath = process.env.SWAGGER_PATH || 'docs';

    const config = new DocumentBuilder()
      .setTitle('Association Community API')
      .setDescription('API de gestion d’association communautaire')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Static local uploads (si STORAGE_DRIVER=local)
  const expressApp = app.getHttpAdapter().getInstance();
  const path = require('path');
  const express = require('express');
  expressApp.use(
    '/static',
    express.static(path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads')),
  );

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);

  console.log(`API running on http://localhost:${port}/api`);
}
bootstrap();
//src/main.ts
//src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import * as path from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

// ─── Fix global BigInt serialization ────────────────────────────────────────
// Prisma retourne des BigInt pour certains champs numériques.
// JSON.stringify ne les supporte pas nativement → "Do not know how to serialize a BigInt".
// On ajoute toJSON() sur le prototype une seule fois au bootstrap.
(BigInt.prototype as unknown as Record<string, unknown>)['toJSON'] = function () {
  return this.toString();
};
// ────────────────────────────────────────────────────────────────────────────

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix('api');
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // Validation globale harmonisée
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
      .setDescription('API de gestion d\u2019association communautaire')
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

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`\u{1F680} Serveur lanc\u00e9 sur : http://localhost:${port}/api`);
}
bootstrap();
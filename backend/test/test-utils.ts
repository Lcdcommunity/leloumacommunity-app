//backend/test/test-utils.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';

export function applyTestAppDefaults(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}
// backend/src/modules/console-sso/console-sso.module.ts
//
// v1.0 — Module isolé : connexion unique vers Direct Transf'air.
//
import { Module } from '@nestjs/common';
import { ConsoleSsoController } from './console-sso.controller';
import { ConsoleSsoService } from './console-sso.service';

@Module({
  controllers: [ConsoleSsoController],
  providers: [ConsoleSsoService],
})
export class ConsoleSsoModule {}

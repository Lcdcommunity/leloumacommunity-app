// src/modules/permissions/permissions.module.ts
import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

/**
 * Ce module est marqué @Global() pour que PermissionsService soit disponible 
 * dans toute l'application sans avoir à ré-importer PermissionsModule partout.
 */
@Global()
@Module({
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
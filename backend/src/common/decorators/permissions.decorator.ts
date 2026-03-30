// backend/src/common/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../constants/permissions';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
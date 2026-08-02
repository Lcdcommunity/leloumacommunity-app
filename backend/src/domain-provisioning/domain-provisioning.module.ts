// backend/src/domain-provisioning/domain-provisioning.module.ts
// v1.1 — ajout de NotificationsModule (requis par le nouveau hook de notification)
import { Module } from '@nestjs/common';
import { DomainProvisioningService } from './domain-provisioning.service';
import { DomainProvisioningController } from './domain-provisioning.controller';
import { VercelProvider } from './providers/vercel.provider';
import { CloudflareProvider } from './providers/cloudflare.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [DomainProvisioningController],
  providers: [DomainProvisioningService, VercelProvider, CloudflareProvider],
})
export class DomainProvisioningModule {}
// backend/src/domain-provisioning/domain-provisioning.module.ts
// v1.0
import { Module } from '@nestjs/common';
import { DomainProvisioningService } from './domain-provisioning.service';
import { DomainProvisioningController } from './domain-provisioning.controller';
import { VercelProvider } from './providers/vercel.provider';
import { CloudflareProvider } from './providers/cloudflare.provider';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DomainProvisioningController],
  providers: [DomainProvisioningService, VercelProvider, CloudflareProvider],
})
export class DomainProvisioningModule {}
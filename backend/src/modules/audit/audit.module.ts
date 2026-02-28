//src/modules/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';

@Module({
  providers: [AuditService],
  exports: [AuditService], // <-- Cette ligne est primordiale !
})
export class AuditModule {}
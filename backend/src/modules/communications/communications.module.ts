// backend/src/modules/communications/communications.module.ts
//
// v1.0 — Fichier neuf, isolé. Même forme que admin.module.ts /
//   super-admin.module.ts (PrismaService fourni localement, providers
//   propres au module). N'importe ni ne modifie AdminModule, MailModule ni
//   NotificationsModule — CommunicationsMailerService et TwilioSmsService
//   sont à eux le mailer et le SMS de ce module, indépendants du reste.
//
import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { CommunicationsMailerService } from './communications-mailer.service';
import { TwilioSmsService } from './twilio-sms.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [CommunicationsController],
  providers: [CommunicationsService, CommunicationsMailerService, TwilioSmsService, PrismaService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
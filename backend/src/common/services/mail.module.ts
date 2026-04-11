/////// backend/src/common/services/mail.module.ts
import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Global() // 🌍 Permet de rendre le MailService disponible dans toute l'app sans devoir réimporter ce module partout
@Module({
  providers: [MailService],
  exports: [MailService], // 👈 Crucial : on expose le service pour les autres modules
})
export class MailModule {}
//src/modules/auth/auth.mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';

// Hook simple: branche ici ton vrai service mail (Nodemailer/Resend)
// sans coupler l'auth au provider.
@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name);

  async sendPasswordResetEmail(params: {
    to: string;
    resetUrl: string;
    appName?: string;
  }): Promise<void> {
    this.logger.log(
      `Password reset email -> ${params.to} | ${params.resetUrl}`,
    );
  }
}
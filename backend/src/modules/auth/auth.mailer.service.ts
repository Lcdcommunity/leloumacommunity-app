// backend/src/modules/auth/auth.mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT')),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  /**
   * Construit l'adresse d'expéditeur formatée.
   */
  private getMailFrom(appName: string, fallbackLabel: string): string {
    const smtpUser = this.config.get<string>('SMTP_USER') ?? '';
    return (
      this.config.get<string>('MAIL_FROM') ||
      `"${fallbackLabel} ${appName}" <${smtpUser}>`
    );
  }

  /**
   * Envoie l'email de réinitialisation de mot de passe.
   */
  async sendPasswordResetEmail(params: {
    to: string;
    resetUrl: string;
    appName?: string;
  }): Promise<void> {
    const appName = params.appName || this.config.get<string>('APP_NAME') || 'Lélouma Community';
    const mailFrom = this.getMailFrom(appName, 'Support');

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to: params.to,
        subject: `Réinitialisation de votre mot de passe - ${appName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #2563EB; margin: 0; font-size: 24px;">${appName}</h1>
            </div>

            <h2 style="color: #111827; font-size: 20px; font-weight: 600;">Réinitialisation de mot de passe</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">Bonjour,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
              Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en créer un nouveau en toute sécurité :
            </p>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${params.resetUrl}" style="background-color: #2563EB; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                Réinitialiser mon mot de passe
              </a>
            </div>

            <p style="font-size: 13px; color: #6B7280; line-height: 1.5; padding-top: 20px; border-top: 1px solid #F3F4F6;">
              Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
              <a href="${params.resetUrl}" style="color: #3B82F6; word-break: break-all;">${params.resetUrl}</a>
            </p>

            <p style="font-size: 13px; color: #9CA3AF; margin-top: 15px;">
              Si vous n'avez pas demandé cette réinitialisation, vous pouvez simplement ignorer cet email. Votre compte restera sécurisé.
            </p>
          </div>
        `,
      });

      this.logger.log(`✅ Email de reset envoyé avec succès à -> ${params.to}`);
    } catch (error: unknown) {
      this.logger.error(
        `❌ Échec de l'envoi de l'email de reset à ${params.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Envoie l'email de vérification lors de l'inscription (Signup).
   */
  async sendVerificationEmail(params: {
    to: string;
    verifyUrl: string;
    appName?: string;
  }): Promise<void> {
    const appName = params.appName || this.config.get<string>('APP_NAME') || 'Lélouma Community';
    const mailFrom = this.getMailFrom(appName, 'Bienvenue');

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to: params.to,
        subject: `Vérifiez votre adresse email - ${appName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #2563EB; margin: 0; font-size: 24px;">${appName}</h1>
            </div>

            <h2 style="color: #111827; font-size: 20px; font-weight: 600;">Bienvenue parmi nous !</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">Bonjour,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
              Merci de nous avoir rejoints. Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :
            </p>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${params.verifyUrl}" style="background-color: #15803D; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(21, 128, 61, 0.2);">
                Vérifier mon email
              </a>
            </div>

            <p style="font-size: 13px; color: #6B7280; line-height: 1.5; padding-top: 20px; border-top: 1px solid #F3F4F6;">
              Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
              <a href="${params.verifyUrl}" style="color: #3B82F6; word-break: break-all;">${params.verifyUrl}</a>
            </p>

            <p style="font-size: 13px; color: #9CA3AF; margin-top: 15px;">
              Une fois votre email vérifié, un administrateur devra valider votre compte pour vous donner accès à l'espace membre.
            </p>
          </div>
        `,
      });

      this.logger.log(`✅ Email de vérification envoyé avec succès à -> ${params.to}`);
    } catch (error: unknown) {
      this.logger.error(
        `❌ Échec de l'envoi de l'email de vérification à ${params.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
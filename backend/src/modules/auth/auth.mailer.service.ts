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

  private getMailFrom(appName: string, fallbackLabel: string): string {
    const smtpUser = this.config.get<string>('SMTP_USER') ?? '';
    return (
      this.config.get<string>('MAIL_FROM') ||
      `"${fallbackLabel} ${appName}" <${smtpUser}>`
    );
  }

  async sendPasswordResetEmail(params: {
    to: string;
    resetUrl: string;
    appName?: string;
    logoUrl?: string; // 👈 AJOUTÉ POUR LE LOGO ASSO
  }): Promise<void> {
    const appName = params.appName || this.config.get<string>('APP_NAME') || 'Lélouma Community';
    const mailFrom = this.getMailFrom(appName, 'Support');

    const logoHtml = params.logoUrl
      ? `<img src="${params.logoUrl}" alt="${appName}" style="max-height: 80px; width: auto; margin-bottom: 24px; border-radius: 8px;" />`
      : `<h2 style="color: #1E3A8A; font-size: 28px; margin: 0 0 24px; font-weight: bold; letter-spacing: -0.5px;">${appName}</h2>`;

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to: params.to,
        subject: `Réinitialisation de votre mot de passe - ${appName}`,
        html: `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; color: #111827; -webkit-font-smoothing: antialiased;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); max-width: 600px; width: 100%;">
                    <tr>
                      <td align="center" style="padding: 48px 32px 16px; background: linear-gradient(to bottom, #F8FAFC, #FFFFFF);">
                        ${logoHtml}
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">
                          Réinitialisation de mot de passe
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px 40px 32px;">
                        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #4B5563;">Bonjour,</p>
                        <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #4B5563;">
                          Vous avez demandé à réinitialiser votre mot de passe pour votre compte <strong>${appName}</strong>. Cliquez sur le bouton ci-dessous pour le modifier :
                        </p>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="${params.resetUrl}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);">
                                Réinitialiser mon mot de passe
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 40px 32px; background-color: #F8FAFC; border-top: 1px solid #E5E7EB;">
                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
                          <a href="${params.resetUrl}" style="color: #3B82F6; word-break: break-all;">${params.resetUrl}</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                    <tr>
                      <td align="center" style="padding: 24px 0;">
                        <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                          &copy; ${new Date().getFullYear()} ${appName}. Tous droits réservés.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    } catch (error: unknown) {
      this.logger.error(`❌ Échec reset email -> ${params.to}`, error);
      throw error;
    }
  }

  async sendVerificationEmail(params: {
    to: string;
    verifyUrl: string;
    appName?: string;
    logoUrl?: string; // 👈 AJOUTÉ POUR LE LOGO ASSO
  }): Promise<void> {
    const appName = params.appName || this.config.get<string>('APP_NAME') || 'Lélouma Community';
    const mailFrom = this.getMailFrom(appName, 'Bienvenue');

    const logoHtml = params.logoUrl
      ? `<img src="${params.logoUrl}" alt="${appName}" style="max-height: 80px; width: auto; margin-bottom: 24px; border-radius: 8px;" />`
      : `<h2 style="color: #1E3A8A; font-size: 28px; margin: 0 0 24px; font-weight: bold; letter-spacing: -0.5px;">${appName}</h2>`;

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to: params.to,
        subject: `Vérifiez votre adresse email - ${appName}`,
        html: `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; color: #111827; -webkit-font-smoothing: antialiased;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); max-width: 600px; width: 100%;">
                    <tr>
                      <td align="center" style="padding: 48px 32px 16px; background: linear-gradient(to bottom, #F8FAFC, #FFFFFF);">
                        ${logoHtml}
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">
                          Bienvenue chez ${appName} !
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px 40px 32px;">
                        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #4B5563;">Bonjour,</p>
                        <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #4B5563;">
                          Merci de nous avoir rejoints. Pour activer votre accès et finaliser la création de votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :
                        </p>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="${params.verifyUrl}" style="display: inline-block; background-color: #059669; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
                                Vérifier mon email
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 40px 32px; background-color: #F8FAFC; border-top: 1px solid #E5E7EB;">
                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                          Une fois votre email vérifié, un administrateur devra valider votre compte pour vous donner accès à l'espace membre de l'association.
                        </p>
                        <p style="margin: 16px 0 0; font-size: 12px; color: #9CA3AF; text-align: center;">
                          Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
                        </p>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                    <tr>
                      <td align="center" style="padding: 24px 0;">
                        <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                          &copy; ${new Date().getFullYear()} ${appName}. Tous droits réservés.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    } catch (error: unknown) {
      this.logger.error(`❌ Échec verification email -> ${params.to}`, error);
      throw error;
    }
  }
  async sendWelcomeSetPasswordEmail(params: {
    to: string;
    firstName: string;
    associationName: string;
    setPasswordUrl: string;
    antennaName?: string;
    associationTitle?: string;
    appName?: string;
    logoUrl?: string;
  }): Promise<void> {
    const appName = params.appName || this.config.get<string>('APP_NAME') || 'Lélouma Community';
    const mailFrom = this.getMailFrom(appName, 'Bienvenue');

    const logoHtml = params.logoUrl
      ? `<img src="${params.logoUrl}" alt="${appName}" style="max-height: 80px; width: auto; margin-bottom: 24px; border-radius: 8px;" />`
      : `<h2 style="color: #1E3A8A; font-size: 28px; margin: 0 0 24px; font-weight: bold; letter-spacing: -0.5px;">${appName}</h2>`;

    // 🔥 AJOUT : texte de rôle différent selon super admin (pas d'antenne
    // fournie) ou admin d'antenne (antennaName fourni).
    const roleLine = params.antennaName
      ? `Vous avez été désigné(e) administrateur(rice) de l'antenne <strong>${params.antennaName}</strong>${params.associationTitle ? ` (${params.associationTitle})` : ''} au sein de <strong>${params.associationName}</strong>.`
      : `Vous avez été désigné(e) administrateur(rice) général(e) de <strong>${params.associationName}</strong>.`;

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to: params.to,
        subject: `Bienvenue sur ${params.associationName} — définissez votre mot de passe`,
        html: `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; color: #111827; -webkit-font-smoothing: antialiased;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); max-width: 600px; width: 100%;">
                    <tr>
                      <td align="center" style="padding: 48px 32px 16px; background: linear-gradient(to bottom, #F8FAFC, #FFFFFF);">
                        ${logoHtml}
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">
                          Bienvenue ${params.firstName} !
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px 40px 32px;">
                        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #4B5563;">Bonjour ${params.firstName},</p>
                        <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #4B5563;">
                          ${roleLine} Pour activer votre compte, cliquez sur le bouton ci-dessous et choisissez votre mot de passe :
                        </p>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="${params.setPasswordUrl}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);">
                                Définir mon mot de passe
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #9CA3AF;">
                          Ce lien expire dans 7 jours. Passé ce délai, contactez votre administrateur pour en recevoir un nouveau.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 40px 32px; background-color: #F8FAFC; border-top: 1px solid #E5E7EB;">
                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
                          <a href="${params.setPasswordUrl}" style="color: #3B82F6; word-break: break-all;">${params.setPasswordUrl}</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                    <tr>
                      <td align="center" style="padding: 24px 0;">
                        <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                          &copy; ${new Date().getFullYear()} ${appName}. Tous droits réservés.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    } catch (error: unknown) {
      this.logger.error(`❌ Échec envoi bienvenue (définition mot de passe) -> ${params.to}`, error);
      throw error;
    }
  }
}
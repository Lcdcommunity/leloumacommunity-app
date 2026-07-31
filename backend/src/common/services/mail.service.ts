// backend/src/common/services/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type SendAdminInvitationParams = {
  to: string;
  firstName: string;
  lastName: string;
  antennaName: string;
  temporaryPassword: string;
  associationTitle?: string;
  logoUrl?: string;
};

type SendSuperAdminWelcomeParams = {
  to: string;
  firstName: string;
  lastName: string;
  associationName: string;
  temporaryPassword: string;
  logoUrl?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private getTransporter(): nodemailer.Transporter | null {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  private getFromAddress(): string {
    return process.env.SMTP_FROM || 'no-reply@localhost.local';
  }

  private normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private getFrontendBaseUrl(): string {
    const raw = process.env.FRONTEND_URL || process.env.APP_URL;

    if (raw && raw.trim().length > 0) {
      return this.normalizeUrl(raw.trim());
    }

    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:3000';
    }

    throw new Error(
      'Configuration manquante : FRONTEND_URL ou APP_URL est requis en production.',
    );
  }

  private getLoginUrl(): string {
    return `${this.getFrontendBaseUrl()}/login`;
  }

  async sendAntennaAdminInvitation(
    params: SendAdminInvitationParams,
  ): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(
        `SMTP non configuré. Email non envoyé à ${params.to}, mais le compte a bien été créé.`,
      );
      return;
    }

    const subject = `Invitation administrateur - ${params.antennaName}`;
    const loginUrl = this.getLoginUrl();

    const titleLine = params.associationTitle
      ? `<p style="margin:0 0 10px 0;"><strong>Fonction :</strong> ${params.associationTitle}</p>`
      : '';

    const logoHtml = params.logoUrl
      ? `<div style="text-align:center; margin-bottom: 24px;">
           <img src="${params.logoUrl}" alt="Logo" style="max-height: 80px; width: auto; border-radius: 8px;" />
         </div>`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#ffffff;color:#111827; border: 1px solid #E5E7EB; border-radius: 12px;">
        ${logoHtml}
        <h2 style="margin:0 0 16px 0;color:#1D4ED8;">Bienvenue ${params.firstName} ${params.lastName}</h2>
        <p style="margin:0 0 14px 0;">Votre compte administrateur d'antenne a été créé.</p>
        <p style="margin:0 0 10px 0;"><strong>Antenne :</strong> ${params.antennaName}</p>
        ${titleLine}
        <p style="margin:0 0 10px 0;"><strong>Adresse email :</strong> ${params.to}</p>
        <p style="margin:0 0 10px 0;"><strong>Mot de passe provisoire :</strong> ${params.temporaryPassword}</p>
        <p style="margin:18px 0 0 0;">Connectez-vous ici :</p>
        <p style="margin:8px 0 20px 0;">
          <a href="${loginUrl}" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px; font-weight: bold;">
            Se connecter
          </a>
        </p>
        <p style="margin:0;color:#B91C1C;font-size:14px;"><strong>Important :</strong> changez ce mot de passe dès votre première connexion.</p>
      </div>
    `;

    const text = [
      `Bonjour ${params.firstName} ${params.lastName},`,
      '',
      'Votre compte administrateur d\'antenne a été créé.',
      `Antenne : ${params.antennaName}`,
      params.associationTitle ? `Fonction : ${params.associationTitle}` : '',
      `Adresse email : ${params.to}`,
      `Mot de passe provisoire : ${params.temporaryPassword}`,
      '',
      `Connexion : ${loginUrl}`,
      '',
      'Important : changez ce mot de passe dès votre première connexion.',
    ]
      .filter(Boolean)
      .join('\n');

    await transporter.sendMail({
      from: this.getFromAddress(),
      to: params.to,
      subject,
      text,
      html,
    });
  }

  async sendSuperAdminWelcome(
    params: SendSuperAdminWelcomeParams,
  ): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(
        `SMTP non configuré. Email non envoyé à ${params.to}, mais l'association et le compte ont bien été créés.`,
      );
      return;
    }

    const subject = `Bienvenue sur AssoGlobal — vos identifiants de connexion`;
    const loginUrl = this.getLoginUrl();

    const logoHtml = params.logoUrl
      ? `<div style="text-align:center; margin-bottom: 24px;">
           <img src="${params.logoUrl}" alt="Logo ${params.associationName}" style="max-height: 80px; width: auto; border-radius: 8px;" />
         </div>`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:32px;background:#ffffff;color:#111827; border: 1px solid #E5E7EB; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        ${logoHtml}
        <h2 style="margin:0 0 16px 0;color:#7C3AED;text-align:center;">Bienvenue ${params.firstName} ${params.lastName} !</h2>
        <p style="margin:0 0 14px 0;font-size:16px;text-align:center;">
          Vous avez été désigné(e) administrateur(rice) général(e) de <strong>${params.associationName}</strong>.
          Nous sommes ravis de vous accompagner dans cette mission et vous souhaitons plein succès à la tête de votre association.
        </p>
        <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin:0 0 10px 0;font-size:15px;"><strong>Adresse email :</strong> ${params.to}</p>
          <p style="margin:0;font-size:15px;"><strong>Mot de passe provisoire :</strong> ${params.temporaryPassword}</p>
        </div>
        <p style="margin:0 0 18px 0;font-size:14px;color:#4B5563;text-align:center;">
          Pour des raisons de sécurité, nous vous recommandons de modifier ce mot de passe dès votre première connexion.
        </p>
        <p style="margin:0;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:16px;">
            Accéder à mon espace
          </a>
        </p>
      </div>
    `;

    const text = [
      `Bonjour ${params.firstName} ${params.lastName},`,
      '',
      'Bienvenue sur AssoGlobal !',
      '',
      `Vous avez été désigné(e) administrateur(rice) général(e) de ${params.associationName}. Nous vous souhaitons plein succès à la tête de votre association.`,
      '',
      `Adresse email : ${params.to}`,
      `Mot de passe provisoire : ${params.temporaryPassword}`,
      '',
      `Connexion : ${loginUrl}`,
      '',
      'Pour des raisons de sécurité, nous vous recommandons de modifier ce mot de passe dès votre première connexion.',
    ].join('\n');

    await transporter.sendMail({
      from: this.getFromAddress(),
      to: params.to,
      subject,
      text,
      html,
    });
  }
}
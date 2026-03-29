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
};

// 👇 NOUVEAU TYPE AJOUTÉ POUR LE GRAND CHEF
type SendSuperAdminWelcomeParams = {
  to: string;
  firstName: string;
  lastName: string;
  associationName: string;
  temporaryPassword: string;
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

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#ffffff;color:#111827;">
        <h2 style="margin:0 0 16px 0;color:#1D4ED8;">Bienvenue ${params.firstName} ${params.lastName}</h2>
        <p style="margin:0 0 14px 0;">Votre compte administrateur d’antenne a été créé.</p>
        <p style="margin:0 0 10px 0;"><strong>Antenne :</strong> ${params.antennaName}</p>
        ${titleLine}
        <p style="margin:0 0 10px 0;"><strong>Adresse email :</strong> ${params.to}</p>
        <p style="margin:0 0 10px 0;"><strong>Mot de passe provisoire :</strong> ${params.temporaryPassword}</p>
        <p style="margin:18px 0 0 0;">Connectez-vous ici :</p>
        <p style="margin:8px 0 20px 0;">
          <a href="${loginUrl}" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;">
            Se connecter
          </a>
        </p>
        <p style="margin:0;color:#B91C1C;"><strong>Important :</strong> changez ce mot de passe dès votre première connexion.</p>
      </div>
    `;

    const text = [
      `Bonjour ${params.firstName} ${params.lastName},`,
      '',
      'Votre compte administrateur d’antenne a été créé.',
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

  // 👇 NOUVELLE MÉTHODE AJOUTÉE POUR LE GRAND CHEF (SUPER ADMIN)
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

    const subject = `Votre espace Association ${params.associationName} est créé`;
    const loginUrl = this.getLoginUrl();

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#ffffff;color:#111827;">
        <h2 style="margin:0 0 16px 0;color:#7C3AED;">Félicitations ${params.firstName} !</h2>
        <p style="margin:0 0 14px 0;">Votre espace association <strong>${params.associationName}</strong> est désormais prêt à être utilisé.</p>
        <p style="margin:0 0 10px 0;">Vous avez été désigné comme <strong>Super Administrateur</strong>. C'est vous qui avez les pleins pouvoirs pour configurer l'association, créer les antennes et inviter les administrateurs locaux.</p>
        <p style="margin:0 0 10px 0;"><strong>Identifiant de connexion :</strong> ${params.to}</p>
        <p style="margin:0 0 10px 0;"><strong>Mot de passe provisoire :</strong> ${params.temporaryPassword}</p>
        <p style="margin:18px 0 0 0;">Accédez à votre tableau de bord ici :</p>
        <p style="margin:8px 0 20px 0;">
          <a href="${loginUrl}" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;">
            Accéder à mon espace
          </a>
        </p>
        <p style="margin:0;color:#B91C1C;"><strong>Important :</strong> Veuillez modifier ce mot de passe dès votre première connexion pour des raisons de sécurité.</p>
      </div>
    `;

    const text = [
      `Félicitations ${params.firstName} !`,
      '',
      `Votre espace association ${params.associationName} est désormais prêt.`,
      'Vous avez été désigné comme Super Administrateur.',
      '',
      `Identifiant de connexion : ${params.to}`,
      `Mot de passe provisoire : ${params.temporaryPassword}`,
      '',
      `Connexion : ${loginUrl}`,
      '',
      'Important : Veuillez modifier ce mot de passe dès votre première connexion.',
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
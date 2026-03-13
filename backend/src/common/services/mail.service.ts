//backend/src/common/services/mail.service.ts
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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private getTransporter() {
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

  private getFromAddress() {
    return process.env.SMTP_FROM || 'no-reply@localhost.local';
  }

  private getLoginUrl() {
    const raw = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    return `${raw.replace(/\/$/, '')}/login`;
  }

  async sendAntennaAdminInvitation(params: SendAdminInvitationParams): Promise<void> {
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
      `Votre compte administrateur d’antenne a été créé.`,
      `Antenne : ${params.antennaName}`,
      params.associationTitle ? `Fonction : ${params.associationTitle}` : '',
      `Adresse email : ${params.to}`,
      `Mot de passe provisoire : ${params.temporaryPassword}`,
      '',
      `Connexion : ${loginUrl}`,
      '',
      `Important : changez ce mot de passe dès votre première connexion.`,
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
}
// backend/src/modules/communications/communications-mailer.service.ts
//
// v1.0 — Fichier neuf, isolé. Ne touche ni ne dépend de auth.mailer.service.ts
//   ni de mail.service.ts (pour rester indépendant, comme demandé). Reprend
//   volontairement le pattern le plus propre des deux existants
//   (nodemailer + ConfigService, comme auth.mailer.service.ts) plutôt que le
//   process.env brut de mail.service.ts.
//
//   Template dynamique par association : logo + bloc pied de page (nom,
//   téléphone, adresse, site) inspiré des captures d'écran VIVAC'S fournies
//   en référence — tous les champs viennent de `Association` (logoFile.url,
//   phone, email, websiteUrl, addressLine1/2, city, postalCode, country),
//   rien de codé en dur.
//
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface CommunicationAssociationBranding {
  name: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

@Injectable()
export class CommunicationsMailerService {
  private readonly logger = new Logger(CommunicationsMailerService.name);
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

  private getMailFrom(associationName: string): string {
    const smtpUser = this.config.get<string>('SMTP_USER') ?? '';
    return (
      this.config.get<string>('MAIL_FROM') ||
      `"${associationName}" <${smtpUser}>`
    );
  }

  private buildFooterHtml(assoc: CommunicationAssociationBranding): string {
    const addressLine = [
      assoc.addressLine1,
      assoc.addressLine2,
      [assoc.postalCode, assoc.city].filter(Boolean).join(' '),
      assoc.country,
    ]
      .filter((part) => !!part && String(part).trim().length > 0)
      .join(' – ');

    const logoHtml = assoc.logoUrl
      ? `<img src="${assoc.logoUrl}" alt="${assoc.name}" style="max-height: 64px; width: auto; margin-bottom: 12px; border-radius: 8px;" />`
      : `<div style="font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 12px;">${assoc.name}</div>`;

    const lines = [
      `<strong>${assoc.name}</strong>`,
      assoc.phone || null,
      addressLine || null,
      assoc.email ? `<a href="mailto:${assoc.email}" style="color: #3B82F6; text-decoration: none;">${assoc.email}</a>` : null,
      assoc.websiteUrl ? `<a href="${assoc.websiteUrl}" style="color: #3B82F6; text-decoration: none;">${assoc.websiteUrl}</a>` : null,
    ].filter((line): line is string => !!line);

    return `
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
        <tr>
          <td align="center" style="padding: 28px 24px;">
            ${logoHtml}
            <div style="font-size: 13px; line-height: 1.7; color: #4B5563;">
              ${lines.join('<br/>')}
            </div>
          </td>
        </tr>
      </table>
    `;
  }

  private bodyTextToHtml(bodyText: string): string {
    return bodyText
      .split(/\n{2,}/)
      .map(
        (paragraph) =>
          `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151; white-space: pre-line;">${paragraph}</p>`,
      )
      .join('');
  }

  async sendCampaignEmail(params: {
    to: string;
    subject: string;
    title: string;
    bodyText: string;
    association: CommunicationAssociationBranding;
  }): Promise<void> {
    const mailFrom = this.getMailFrom(params.association.name);
    const bodyHtml = this.bodyTextToHtml(params.bodyText);
    const footerHtml = this.buildFooterHtml(params.association);

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to: params.to,
        subject: params.subject,
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
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); max-width: 600px; width: 100%;">
                    <tr>
                      <td style="padding: 40px 40px 8px;">
                        <h1 style="margin: 0 0 24px; font-size: 22px; font-weight: 700; color: #111827; letter-spacing: -0.3px;">
                          ${params.title}
                        </h1>
                        ${bodyHtml}
                      </td>
                    </tr>
                  </table>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 16px; margin-top: 16px; border-top: 1px solid #E5E7EB; max-width: 600px; width: 100%;">
                    <tr><td>${footerHtml}</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    } catch (error: unknown) {
      this.logger.error(`❌ Échec envoi email de campagne -> ${params.to}`, error as Error);
      throw error;
    }
  }
}
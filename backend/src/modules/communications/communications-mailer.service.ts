// backend/src/modules/communications/communications-mailer.service.ts
//
// v1.1 — 🔥 REFAIT : le premier template dépendait presque entièrement de
//   couleurs de fond / ombres / border-radius posées en `style` CSS — or
//   Gmail (et d'autres clients) neutralisent une bonne partie de ce CSS sur
//   les messages classés spam, ce qui donnait un rendu complètement plat
//   (aucune couleur, logo invisible). Refonte avec une structure plus
//   robuste : bandeau d'en-tête en couleur pleine posé à la fois en `style`
//   ET en attribut `bgcolor` (respecté par plus de clients même quand le CSS
//   est neutralisé), logo sur fond blanc pour rester visible même sur un
//   fond transparent, séparateur en dur (pas juste une bordure CSS) entre le
//   corps et le pied de page. Ça n'annule pas le vrai sujet séparé (la
//   délivrabilité / le classement en spam lui-même) — juste un rendu qui
//   tient mieux même dans ces conditions dégradées.
//
// v1.0 — Fichier neuf, isolé. Ne touche ni ne dépend de auth.mailer.service.ts
//   ni de mail.service.ts (pour rester indépendant, comme demandé).
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

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const HEADER_BG = '#111827';
const PAGE_BG = '#EEF1F6';

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

  // Bandeau d'en-tête : logo posé sur une pastille blanche (reste visible
  // même si le logo a un fond transparent, sur un bandeau sombre) ; à défaut
  // de logo, le nom de l'association en blanc, en gras.
  private buildHeaderHtml(assoc: CommunicationAssociationBranding): string {
    if (assoc.logoUrl) {
      return `
        <span style="display:inline-block; background-color:#FFFFFF; background:#FFFFFF; border-radius:10px; padding:10px 14px; line-height:0;">
          <img src="${assoc.logoUrl}" alt="${assoc.name}" height="32" style="display:block; height:32px; width:auto; max-width:220px;" />
        </span>
      `;
    }
    return `<span style="font-family:${FONT_STACK}; font-size:19px; font-weight:800; color:#FFFFFF; letter-spacing:-0.02em;">${assoc.name}</span>`;
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

    const lines = [
      assoc.phone || null,
      addressLine || null,
      assoc.email ? `<a href="mailto:${assoc.email}" style="color:#4B5563; text-decoration:underline;">${assoc.email}</a>` : null,
      assoc.websiteUrl ? `<a href="${assoc.websiteUrl}" style="color:#4B5563; text-decoration:underline;">${assoc.websiteUrl}</a>` : null,
    ].filter((line): line is string => !!line);

    return `
      <div style="font-family:${FONT_STACK}; font-size:14px; font-weight:800; color:#111827; margin-bottom:8px;">${assoc.name}</div>
      ${lines.length > 0 ? `<div style="font-family:${FONT_STACK}; font-size:12.5px; line-height:1.9; color:#6B7280;">${lines.join('<br/>')}</div>` : ''}
    `;
  }

  private bodyTextToHtml(bodyText: string): string {
    return bodyText
      .split(/\n{2,}/)
      .map(
        (paragraph) =>
          `<p style="margin:0 0 16px; font-family:${FONT_STACK}; font-size:16px; line-height:1.6; color:#1F2937; white-space:pre-line;">${paragraph}</p>`,
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
    const headerHtml = this.buildHeaderHtml(params.association);
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
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0; padding:0; background-color:${PAGE_BG};" bgcolor="${PAGE_BG}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};" bgcolor="${PAGE_BG}">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%; background-color:#FFFFFF; border:1px solid #E2E5EC; border-radius:16px;" bgcolor="#FFFFFF">

          <!-- bandeau d'en-tête -->
          <tr>
            <td align="left" style="background-color:${HEADER_BG}; padding:24px 32px; border-radius:16px 16px 0 0;" bgcolor="${HEADER_BG}">
              ${headerHtml}
            </td>
          </tr>

          <!-- corps -->
          <tr>
            <td style="padding:36px 32px 8px;">
              <h1 style="margin:0 0 22px; font-family:${FONT_STACK}; font-size:21px; font-weight:800; color:#111827; letter-spacing:-0.02em;">
                ${params.title}
              </h1>
              ${bodyHtml}
            </td>
          </tr>

          <!-- séparateur en dur -->
          <tr>
            <td style="padding:8px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td height="1" style="background-color:#E5E7EB; font-size:0; line-height:0;" bgcolor="#E5E7EB">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- pied de page -->
          <tr>
            <td align="center" style="padding:24px 32px 32px;">
              ${footerHtml}
            </td>
          </tr>

        </table>

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%;">
          <tr>
            <td align="center" style="padding:18px 16px 0; font-family:${FONT_STACK}; font-size:11px; color:#9CA3AF;">
              Envoyé par ${params.association.name} via la plateforme LCD.
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
      this.logger.error(`❌ Échec envoi email de campagne -> ${params.to}`, error as Error);
      throw error;
    }
  }
}
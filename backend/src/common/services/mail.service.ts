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
  associationDomain?: string | null; // 🔥 AJOUT
};

type SendSuperAdminWelcomeParams = {
  to: string;
  firstName: string;
  lastName: string;
  associationName: string;
  temporaryPassword: string;
  logoUrl?: string;
  associationDomain?: string | null; // 🔥 AJOUT (cohérence, probablement plus appelé depuis system-admin.service.ts qui utilise désormais AuthMailerService)
};

// 🔥 AJOUT : email d'invitation à un événement (convocation)
type SendEventInvitationParams = {
  to: string;
  firstName: string;
  lastName: string;
  associationName: string; // nom dynamique de l'association concernée (multi-tenant)
  eventTitle: string;
  eventType: string; // enum EventType côté Prisma, passé en string pour ne pas coupler ce service au client Prisma
  eventDescription?: string | null;
  startsAt: Date | string;
  isOnline: boolean;
  meetingLink?: string | null;
  locationText?: string | null;
  logoUrl?: string | null;
  associationDomain?: string | null;
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
    return process.env.MAIL_FROM || process.env.SMTP_FROM || 'no-reply@localhost.local';
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

  // 🔥 CORRECTION : accepte désormais le domaine propre de l'association —
  // sans ça, "Se connecter" pointait toujours vers dkmoney.store (console
  // Grand Chef) au lieu du site de l'association concernée, quel que soit
  // le domaine réellement configuré pour elle.
  private getLoginUrl(associationDomain?: string | null): string {
    if (associationDomain) {
      return `https://${associationDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/login`;
    }
    return `${this.getFrontendBaseUrl()}/login`;
  }

  // 🔥 AJOUT : formatage de date/heure en français, sans dépendance externe.
  private formatEventDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const datePart = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} à ${timePart}`;
  }

  // 🔥 AJOUT : construit la formule d'introduction avec le bon article selon
  // le type d'événement ("à une réunion", "à une assemblée générale", "à une
  // collecte de fonds", "à un événement"). Le titre n'est ajouté entre
  // guillemets que s'il apporte une information en plus du type — sinon
  // "vous convie à une réunion : « Réunion »" sonnerait redondant.
  private buildEventIntroPhrase(eventType: string, eventTitle: string): string {
    const TYPE_BASE_LABEL: Record<string, string> = {
      GENERAL_ASSEMBLY: 'assemblée générale',
      ANTENNA_MEETING: 'réunion',
      FUNDRAISER: 'collecte de fonds',
      OTHER: 'événement',
    };
    const TYPE_ARTICLE: Record<string, string> = {
      GENERAL_ASSEMBLY: 'à une',
      ANTENNA_MEETING: 'à une',
      FUNDRAISER: 'à une',
      OTHER: 'à un',
    };

    const baseLabel = TYPE_BASE_LABEL[eventType] || 'événement';
    const article = TYPE_ARTICLE[eventType] || 'à un';
    const normalizedTitle = eventTitle.trim().toLowerCase();

    if (normalizedTitle === baseLabel.toLowerCase()) {
      return `${article} ${baseLabel}`;
    }
    return `${article} ${baseLabel} : « ${eventTitle} »`;
  }

  // 🔥 AJOUT : rendu de l'ordre du jour. Si le texte saisi contient plusieurs
  // lignes (un sujet par ligne dans le formulaire), chacune devient un point
  // de liste distinct — sans ça, le HTML écrase les retours à la ligne et
  // colle tous les sujets ensemble dans un même paragraphe.
  private formatAgendaHtml(description?: string | null): string {
    if (!description || !description.trim()) return '';
    const lines = description.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (lines.length <= 1) {
      return `<p style="margin:0 0 14px 0;"><strong>Ordre du jour :</strong> ${description.trim()}</p>`;
    }

    const items = lines.map(l => `<li style="margin-bottom:4px;">${l}</li>`).join('');
    return `<p style="margin:0 0 8px 0;"><strong>Ordre du jour :</strong></p><ul style="margin:0 0 14px 0;padding-left:20px;">${items}</ul>`;
  }

  private formatAgendaText(description?: string | null): string {
    if (!description || !description.trim()) return '';
    const lines = description.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (lines.length <= 1) {
      return `Ordre du jour : ${description.trim()}`;
    }

    return ['Ordre du jour :', ...lines.map(l => `- ${l}`)].join('\n');
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
    const loginUrl = this.getLoginUrl(params.associationDomain);

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
    const loginUrl = this.getLoginUrl(params.associationDomain);

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

  // 🔥 AJOUT : email de convocation/invitation à un événement.
  // 100% dynamique par association (nom, logo, domaine de connexion) pour
  // fonctionner correctement dans un contexte multi-tenant.
  async sendEventInvitation(params: SendEventInvitationParams): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(
        `SMTP non configuré. Email d'invitation non envoyé à ${params.to} pour l'événement "${params.eventTitle}".`,
      );
      return;
    }

    const subject = `Invitation : ${params.eventTitle}`;
    const dateLabel = this.formatEventDateTime(params.startsAt);
    const loginUrl = this.getLoginUrl(params.associationDomain);
    const introPhrase = this.buildEventIntroPhrase(params.eventType, params.eventTitle);

    const modalityHtml = params.isOnline
      ? `en ligne${params.meetingLink ? ` (<a href="${params.meetingLink}" style="color:#1D4ED8;">${params.meetingLink}</a>)` : ''}`
      : `en présentiel${params.locationText ? ` (${params.locationText})` : ''}`;

    const modalityText = params.isOnline
      ? `en ligne${params.meetingLink ? ` (${params.meetingLink})` : ''}`
      : `en présentiel${params.locationText ? ` (${params.locationText})` : ''}`;

    const agendaHtml = this.formatAgendaHtml(params.eventDescription);
    const agendaText = this.formatAgendaText(params.eventDescription);

    const logoHtml = params.logoUrl
      ? `<div style="text-align:center; margin-bottom: 24px;">
           <img src="${params.logoUrl}" alt="${params.associationName}" style="max-height: 80px; width: auto; border-radius: 8px;" />
         </div>`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#ffffff;color:#111827; border: 1px solid #E5E7EB; border-radius: 12px;">
        ${logoHtml}
        <h2 style="margin:0 0 16px 0;color:#1D4ED8;">Bonjour ${params.firstName} ${params.lastName},</h2>
        <p style="margin:0 0 14px 0;">
          Le bureau de la coordination de <strong>${params.associationName}</strong> a le plaisir de vous convier ${introPhrase}, ${modalityHtml}, le <strong>${dateLabel}</strong>.
        </p>
        ${agendaHtml}
        <p style="margin:0 0 14px 0;">
          Votre présence compte plus que vous ne l'imaginez. C'est ensemble, autour d'échanges comme celui-ci, que nous faisons avancer les projets qui nous tiennent à cœur et que notre communauté continue de grandir.
        </p>
        <p style="margin:0 0 14px 0;">Compte tenu de l'importance de l'ordre du jour, votre participation est vivement souhaitée.</p>
        <p style="margin:0 0 20px 0;">Nous vous remercions du fond du cœur pour tout le sacrifice et le dévouement que vous accordez, jour après jour, à notre communauté.</p>
        <p style="margin:0 0 8px 0;font-size:14px;color:#4B5563;">
          Veuillez confirmer votre participation en vous connectant à votre espace membre (onglet « Événements »).
        </p>
        <p style="margin:8px 0 20px 0;">
          <a href="${loginUrl}" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px; font-weight: bold;">
            Confirmer ma participation
          </a>
        </p>
        <p style="margin:0;">Bien cordialement,<br/>Le bureau de la coordination de ${params.associationName}</p>
      </div>
    `;

    const text = [
      `Bonjour ${params.firstName} ${params.lastName},`,
      '',
      `Le bureau de la coordination de ${params.associationName} a le plaisir de vous convier ${introPhrase}, ${modalityText}, le ${dateLabel}.`,
      '',
      agendaText,
      '',
      "Votre présence compte plus que vous ne l'imaginez. C'est ensemble, autour d'échanges comme celui-ci, que nous faisons avancer les projets qui nous tiennent à cœur et que notre communauté continue de grandir.",
      '',
      "Compte tenu de l'importance de l'ordre du jour, votre participation est vivement souhaitée.",
      'Nous vous remercions du fond du cœur pour tout le sacrifice et le dévouement que vous accordez, jour après jour, à notre communauté.',
      '',
      'Veuillez confirmer votre participation en vous connectant à votre espace membre (onglet « Événements »).',
      '',
      `Confirmer ma participation : ${loginUrl}`,
      '',
      'Bien cordialement,',
      `Le bureau de la coordination de ${params.associationName}`,
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
// backend/src/modules/communications/twilio-sms.service.ts
//
// v1.1 — 🔥 CORRIGÉ : plantage au démarrage en prod ("(0, twilio_1.default)
//   is not a function"). Cause : `import Twilio from 'twilio'` +
//   `Twilio(sid, token)` suppose un export par défaut interopérable
//   (esModuleInterop), non activé sur ce projet — le SDK Twilio n'a pas de
//   `.default` exploitable dans ce cas, donc l'appel plantait TOUT le
//   backend au démarrage (le provider est instancié par Nest dès le boot),
//   même sans Twilio configuré. Remplacé par l'import nommé officiel
//   `{ Twilio }` + `new Twilio(sid, token)`, qui ne dépend pas de ce
//   réglage. Construction aussi mise à l'abri d'un try/catch : une valeur
//   Twilio invalide ne doit plus jamais faire tomber tout le backend au
//   démarrage — seulement désactiver l'envoi SMS.
//
// v1.0 — Fichier neuf, isolé. Intégration Twilio construite de zéro (aucune
//   intégration SMS n'existait sur le projet). Suit le même réflexe de
//   dégradation propre que MailService.getTransporter() : si les variables
//   d'env Twilio manquent (ou sont invalides), le service logue un
//   avertissement et lève une erreur explicite au moment de l'envoi plutôt
//   qu'au démarrage — le reste de l'app (email seul, par exemple) continue
//   de fonctionner sans Twilio configuré.
//
// Variables d'env attendues (à ajouter sur Render, jamais commitées) :
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER (numéro Twilio
//   au format E.164, ex. +33756XXXXXX)
//
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

// Validation légère E.164 (+ suivi de 8 à 15 chiffres) — le champ `phone` de
// User est du texte libre, jamais garanti pré-formaté. Un numéro qui ne
// matche pas est signalé et sauté plutôt que de faire échouer tout l'envoi.
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

@Injectable()
export class TwilioSmsService {
  private readonly logger = new Logger(TwilioSmsService.name);
  private readonly client: Twilio | null;
  private readonly fromNumber: string | undefined;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.config.get<string>('TWILIO_FROM_NUMBER');

    let client: Twilio | null = null;
    if (accountSid && authToken) {
      try {
        client = new Twilio(accountSid, authToken);
      } catch (error) {
        // 🔥 Ne jamais laisser une valeur Twilio invalide faire tomber tout
        // le backend au démarrage — seulement désactiver l'envoi SMS.
        this.logger.error('Échec d\'initialisation du client Twilio — vérifie TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN.', error as Error);
        client = null;
      }
    }
    this.client = client;

    if (!this.client || !this.fromNumber) {
      this.logger.warn(
        'Twilio non configuré (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER) — les envois SMS échoueront jusqu\'à configuration.',
      );
    }
  }

  isConfigured(): boolean {
    return !!this.client && !!this.fromNumber;
  }

  isValidPhoneNumber(phone: string): boolean {
    return E164_REGEX.test(phone.trim());
  }

  async sendSms(params: { to: string; body: string }): Promise<void> {
    if (!this.client || !this.fromNumber) {
      throw new Error('Twilio non configuré sur cet environnement.');
    }

    const to = params.to.trim();
    if (!this.isValidPhoneNumber(to)) {
      throw new Error(
        `Numéro invalide pour un envoi SMS (attendu au format international, ex. +33612345678) : ${to}`,
      );
    }

    try {
      await this.client.messages.create({
        to,
        from: this.fromNumber,
        body: params.body,
      });
    } catch (error: unknown) {
      this.logger.error(`❌ Échec envoi SMS -> ${to}`, error as Error);
      throw error;
    }
  }
}
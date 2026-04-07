//backend/src/config/vapid.config.ts
import { setVapidDetails } from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tondomaine.com';

export function configureVapid(): boolean {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️  Clés VAPID manquantes - les notifications push seront désactivées');
    return false;
  }

  try {
    setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );
    console.log('✅  VAPID configuré avec succès');
    return true;
  } catch (error) {
    console.error('❌  Erreur configuration VAPID:', error);
    return false;
  }
}
// backend/src/common/utils/bearer-secret.util.ts
//
// v1.0 — 🔥 NOUVEAU (correctif sécurité) : vérification d'un secret transmis en
//   `Authorization: Bearer <secret>` (crons externes : JOBS_SECRET, CRON_SECRET).
//   Avant, les contrôleurs comparaient `auth !== `Bearer ${process.env.X}``.
//   Deux défauts : (1) si la variable n'est pas définie, la chaîne attendue
//   devenait « Bearer undefined » — n'importe qui l'envoyant déclenchait les
//   jobs ; (2) comparaison non constante dans le temps. Ici : secret vide ⇒
//   toujours refusé, comparaison via crypto.timingSafeEqual.
//
import { createHash, timingSafeEqual } from 'crypto';

export function isValidBearerSecret(
  authorizationHeader: string | undefined | null,
  expectedSecret: string | undefined | null,
): boolean {
  const secret = (expectedSecret ?? '').trim();
  if (!secret) return false; // variable d'environnement absente/vide ⇒ route fermée

  const header = typeof authorizationHeader === 'string' ? authorizationHeader : '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return false;

  // Hash des deux côtés : même longueur garantie pour timingSafeEqual.
  const a = createHash('sha256').update(match[1].trim()).digest();
  const b = createHash('sha256').update(secret).digest();
  return timingSafeEqual(a, b);
}

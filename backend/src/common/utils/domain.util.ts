// backend/src/common/utils/domain.util.ts
/**
 * Normalise une valeur de domaine pour un stockage et des comparaisons
 * cohérents partout dans l'app (résolution multi-tenant par domaine).
 * Retire protocole, "www.", espaces, slash final, port éventuel, et met
 * en minuscules. Retourne null si vide après nettoyage.
 */
export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .replace(/:\d+$/, ''); // retire un port éventuel (ex: localhost:3000)
  return cleaned.length > 0 ? cleaned : null;
}
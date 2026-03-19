// web/lib/format.ts

const CURRENCY_CONFIG: Record<string, { locale: string; currency: string }> = {
  EUR: { locale: 'fr-FR', currency: 'EUR' },
  USD: { locale: 'en-US', currency: 'USD' },
  XOF: { locale: 'fr-FR', currency: 'XOF' }, // Franc CFA BCEAO (Afrique de l'Ouest)
  XAF: { locale: 'fr-FR', currency: 'XAF' }, // Franc CFA BEAC (Afrique Centrale)
  GNF: { locale: 'fr-GN', currency: 'GNF' }, // Franc guinéen
};

export function formatCurrency(amount: number | null | undefined, currency = 'EUR') {
  if (amount === null || amount === undefined) return '-';

  const config = CURRENCY_CONFIG[currency] ?? { locale: 'fr-FR', currency };

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: currency === 'GNF' || currency === 'XOF' || currency === 'XAF' ? 0 : 2,
      maximumFractionDigits: currency === 'GNF' || currency === 'XOF' || currency === 'XAF' ? 0 : 2,
    }).format(amount);
  } catch {
    // Fallback si la devise n'est pas reconnue par Intl
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  }
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

export function formatDateTime(date: string | Date | null | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}
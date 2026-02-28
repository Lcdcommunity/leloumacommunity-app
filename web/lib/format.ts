//web/lib/format.ts
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date?: string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function fullName(input: { firstName?: string | null; lastName?: string | null }): string {
  return [input.firstName, input.lastName].filter(Boolean).join(' ').trim() || '—';
}
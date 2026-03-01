export function formatCurrency(amount: number | null | undefined, currency = 'EUR') {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}
export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}
export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

// web/lib/platform-wallet-api.ts
//
// v1.0 — Client API du wallet plateforme (Grand Chef) et des virements de commission.
//   Fichier isolé : aucune route existante n'est touchée. Les montants arrivent en
//   chaînes décimales ("120.50") pour ne jamais passer par un flottant côté serveur.
//
import { http } from './http';

export type CurrencyCode = 'EUR' | 'USD' | 'GNF' | 'XOF' | 'GBP' | 'CAD' | 'CHF';
export const ALL_CURRENCIES: CurrencyCode[] = ['EUR', 'USD', 'GNF', 'XOF', 'GBP', 'CAD', 'CHF'];

export type TransferStatus = 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED' | 'CANCELLED';

export type PlatformTransfer = {
  id: string;
  reference: string;
  associationId: string;
  associationName: string;
  senderAntennaId: string;
  senderAntennaName: string;
  initiatedByName: string;
  amount: string;
  currency: CurrencyCode;
  purpose: string;
  periodLabel: string | null;
  notes: string | null;
  status: TransferStatus;
  validatedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  replayed?: boolean;
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

export type CommissionOptions = {
  canSend: boolean;
  currencies: CurrencyCode[];
  antennas: Array<{
    id: string;
    name: string;
    city: string | null;
    associationName: string;
    balances: Array<{ currency: CurrencyCode; balance: string; reserved: string; available: string }>;
  }>;
};

export type WalletEntry = {
  id: string;
  type: 'COMMISSION_IN' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'WITHDRAWAL_OUT';
  direction: 'IN' | 'OUT';
  currency: CurrencyCode;
  amount: string;
  signedAmount: string;
  title: string;
  description: string | null;
  referenceCode: string | null;
  associationId: string | null;
  effectiveDate: string;
  createdAt: string;
};

export type WalletOverview = {
  wallets: Array<{
    currency: CurrencyCode;
    active: boolean;
    balance: string;
    received: string;
    withdrawn: string;
    pendingCount: number;
    pendingAmount: string;
  }>;
  pendingTotal: number;
  recentEntries: WalletEntry[];
  bySource: Array<{ associationId: string; associationName: string; currency: CurrencyCode; total: string }>;
};

const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** Clé d'idempotence : rejouer la même requête (double clic, réseau coupé) ne crée jamais de doublon. */
export const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

export const platformWalletApi = {
  // ── Côté association (admin d'antenne : écriture ; super admin : lecture seule) ──
  commissionOptions: () => http<CommissionOptions>('/platform-transfers/options'),

  listCommissions: (p: { status?: string; currency?: string; antennaId?: string; q?: string; page?: number; pageSize?: number } = {}) =>
    http<Paged<PlatformTransfer>>(`/platform-transfers${qs(p)}`),

  createCommission: (body: {
    senderAntennaId?: string;
    currency: CurrencyCode;
    amount: number;
    periodLabel?: string;
    notes?: string;
    idempotencyKey: string;
  }) => http<PlatformTransfer, typeof body>('/platform-transfers', { method: 'POST', body }),

  cancelCommission: (id: string) =>
    http<{ success: true }>(`/platform-transfers/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' }),

  // ── Console du Grand Chef ──
  overview: () => http<WalletOverview>('/platform-wallet/overview'),

  listTransfers: (p: { status?: string; currency?: string; q?: string; associationId?: string; page?: number; pageSize?: number } = {}) =>
    http<Paged<PlatformTransfer>>(`/platform-wallet/transfers${qs(p)}`),

  validateTransfer: (id: string) =>
    http<PlatformTransfer>(`/platform-wallet/transfers/${encodeURIComponent(id)}/validate`, { method: 'PATCH' }),

  rejectTransfer: (id: string, reason: string) =>
    http<PlatformTransfer, { reason: string }>(`/platform-wallet/transfers/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: { reason },
    }),

  listEntries: (p: { currency?: string; type?: string; from?: string; to?: string; page?: number; pageSize?: number } = {}) =>
    http<Paged<WalletEntry>>(`/platform-wallet/entries${qs(p)}`),

  createMovement: (body: {
    type: 'WITHDRAWAL_OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
    currency: CurrencyCode;
    amount: number;
    title: string;
    description?: string;
    effectiveDate?: string;
    idempotencyKey: string;
  }) => http<WalletEntry, typeof body>('/platform-wallet/entries', { method: 'POST', body }),

  getSettings: () => http<{ currencies: CurrencyCode[] }>('/platform-wallet/settings'),
  updateSettings: (currencies: CurrencyCode[]) =>
    http<{ currencies: CurrencyCode[] }, { currencies: CurrencyCode[] }>('/platform-wallet/settings', {
      method: 'PUT',
      body: { currencies },
    }),
};

// backend/src/modules/platform-wallet/platform-wallet.constants.ts
//
// v1.0 — Wallet de la plateforme (Grand Chef) : constantes partagées.
//   Les devises du wallet ne sont PAS codées en dur dans la logique : la liste
//   effective vient de PlatformSetting.platformWalletCurrencies (modifiable par le
//   Grand Chef). DEFAULT_WALLET_CURRENCIES n'est qu'un repli si la ligne de
//   paramètres n'existe pas encore.
//
import { CurrencyCode, LedgerEntryType, PlatformWalletEntryType } from '@prisma/client';

export const DEFAULT_WALLET_CURRENCIES: CurrencyCode[] = [
  CurrencyCode.EUR,
  CurrencyCode.USD,
  CurrencyCode.GNF,
  CurrencyCode.XOF,
];

/** Plafond de la colonne Decimal(14,2). */
export const MAX_AMOUNT = 999999999999.99;

export const PLATFORM_SETTINGS_ID = 'singleton';

/** Sens des écritures du ledger d'association (identique à LedgerService.getBalances). */
export const LEDGER_SIGN: Record<LedgerEntryType, 1 | -1> = {
  CONTRIBUTION_IN: 1,
  DONATION_IN: 1,
  MANUAL_ADJUSTMENT_IN: 1,
  TRANSFER_IN: 1,
  ANTENNA_EXPENSE_OUT: -1,
  PROJECT_EXPENSE_OUT: -1,
  OPERATING_EXPENSE_OUT: -1,
  MANUAL_ADJUSTMENT_OUT: -1,
  TRANSFER_OUT: -1,
};

/** Sens des écritures du wallet de la plateforme. */
export const WALLET_SIGN: Record<PlatformWalletEntryType, 1 | -1> = {
  COMMISSION_IN: 1,
  ADJUSTMENT_IN: 1,
  ADJUSTMENT_OUT: -1,
  WITHDRAWAL_OUT: -1,
};

/** Mouvements que le Grand Chef peut saisir à la main (COMMISSION_IN vient uniquement d'un virement validé). */
export const MANUAL_WALLET_TYPES = ['WITHDRAWAL_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'] as const;
export type ManualWalletType = (typeof MANUAL_WALLET_TYPES)[number];

export const MAX_PAGE_SIZE = 50;

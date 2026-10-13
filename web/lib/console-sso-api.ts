// web/lib/console-sso-api.ts
//
// v1.0 — Client API de la bascule « console unique » (Grand Chef → back-office Direct Transf'air).
//   Fichier isolé : aucune route existante n'est touchée.
//
import { http } from './http';

export type TransferSsoStatus = { configured: boolean; basePath: string };
export type TransferSsoTicket = { assertion: string; expiresIn: number; landingPath: string };

export const consoleSsoApi = {
  transferStatus: () => http<TransferSsoStatus>('/console/transfer-sso/status'),
  transferTicket: () => http<TransferSsoTicket>('/console/transfer-sso', { method: 'POST' }),
};

/**
 * Ouvre le back-office des sociétés de transfert. L'assertion (60 s, usage unique) est placée dans le
 * fragment d'URL (#a=…) : un fragment n'est jamais envoyé au serveur ni consigné dans les logs d'accès.
 */
export function openTransferConsole(ticket: TransferSsoTicket): void {
  const path = ticket.landingPath.startsWith('/') ? ticket.landingPath : `/${ticket.landingPath}`;
  window.location.assign(`${path}#a=${encodeURIComponent(ticket.assertion)}`);
}

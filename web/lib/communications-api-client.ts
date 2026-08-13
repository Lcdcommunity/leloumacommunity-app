// web/lib/communications-api-client.ts
//
// v1.0 — Fichier neuf, isolé. N'importe et ne modifie pas api-client.ts —
//   réutilise seulement le helper bas niveau `http()` (même wrapper que
//   partout ailleurs dans l'app), avec ses propres types et son propre objet
//   exporté (`communicationsApi`), pour rester totalement indépendant.
//
import { http } from './http';

export interface CommunicationMemberOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  antennaId: string | null;
  antennaName: string | null;
}

export interface CommunicationLateMemberOption extends CommunicationMemberOption {
  lateMonths: number;
}

export interface CommunicationAntennaOption {
  id: string;
  name: string;
}

export type CommunicationAudienceType = 'LATE_PAYERS' | 'ALL_MEMBERS';
export type CommunicationSelectionMode = 'BULK' | 'INDIVIDUAL';

export interface SendCommunicationPayload {
  audienceType: CommunicationAudienceType;
  selectionMode: CommunicationSelectionMode;
  antennaId?: string;
  recipientUserIds?: string[];
  channels: { email: boolean; sms: boolean };
  title: string;
  subject?: string;
  body: string;
}

export interface SendCommunicationResult {
  recipientsCount: number;
  successCount: number;
  failedCount: number;
}

export const communicationsApi = {
  getAntennas: () => http<CommunicationAntennaOption[]>('/communications/antennas'),

  getLateMembers: (antennaId?: string) =>
    http<CommunicationLateMemberOption[]>(
      `/communications/late-members${antennaId ? `?antennaId=${encodeURIComponent(antennaId)}` : ''}`,
    ),

  getAllMembers: (params?: { antennaId?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.antennaId) search.append('antennaId', params.antennaId);
    if (params?.q) search.append('q', params.q);
    const qs = search.toString();
    return http<CommunicationMemberOption[]>(`/communications/members${qs ? `?${qs}` : ''}`);
  },

  send: (body: SendCommunicationPayload) =>
    http<SendCommunicationResult, SendCommunicationPayload>('/communications/send', {
      method: 'POST',
      body,
    }),
};
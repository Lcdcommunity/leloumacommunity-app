// web/app/(protected)/super-admin/communications/page.tsx
//
// v1.0 — Fichier neuf, isolé. Enveloppe fine autour de CommunicationsConsole
//   (scope="super-admin", ajoute le filtre par antenne via RecipientPicker).
//
'use client';

import { AppShell } from '../../../../components/layout/AppShell';
import { CommunicationsConsole } from '../../../../components/communications/CommunicationsConsole';

export default function SuperAdminCommunicationsPage() {
  return (
    <AppShell title="Communications">
      <CommunicationsConsole scope="super-admin" />
    </AppShell>
  );
}
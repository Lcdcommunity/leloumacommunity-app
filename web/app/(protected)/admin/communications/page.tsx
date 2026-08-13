// web/app/(protected)/admin/communications/page.tsx
//
// v1.0 — Fichier neuf, isolé. Enveloppe fine autour de CommunicationsConsole
//   (scope="admin") — toute la logique vit dans le composant partagé, pour
//   ne pas dupliquer la page super-admin.
//
'use client';

import { AppShell } from '../../../../components/layout/AppShell';
import { CommunicationsConsole } from '../../../../components/communications/CommunicationsConsole';

export default function AdminCommunicationsPage() {
  return (
    <AppShell title="Communications">
      <CommunicationsConsole scope="admin" />
    </AppShell>
  );
}
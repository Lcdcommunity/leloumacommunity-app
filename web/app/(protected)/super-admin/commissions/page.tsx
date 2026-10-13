// web/app/(protected)/super-admin/commissions/page.tsx
//
// v1.0 — Président d'association : consultation (lecture seule) des commissions versées à la plateforme.
//
'use client';

import { AppShell } from '../../../../components/layout/AppShell';
import { CommissionsPanel } from '../../../../components/platform-wallet/CommissionsPanel';

export default function SuperAdminCommissionsPage() {
  return (
    <AppShell title="Commissions plateforme">
      <CommissionsPanel readOnly />
    </AppShell>
  );
}

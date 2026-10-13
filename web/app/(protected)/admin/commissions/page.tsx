// web/app/(protected)/admin/commissions/page.tsx
//
// v1.0 — Admin d'antenne : virements de commission vers la plateforme (seul rôle autorisé à envoyer).
//
'use client';

import { AppShell } from '../../../../components/layout/AppShell';
import { CommissionsPanel } from '../../../../components/platform-wallet/CommissionsPanel';

export default function AdminCommissionsPage() {
  return (
    <AppShell title="Commissions plateforme">
      <CommissionsPanel readOnly={false} />
    </AppShell>
  );
}

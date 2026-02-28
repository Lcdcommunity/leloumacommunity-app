//web/app/(protected)/admin/page.tsx
'use client';

import { AppShell } from '../../../components/layout/AppShell';
import { Card } from '../../../components/ui/Card';

export default function AdminAntennaHomePage() {
  return (
    <AppShell title="Admin d’antenne">
      <Card title="Phase 2 à brancher">
        <p>
          Écrans Admin antenne à implémenter ensuite sur la même base :
          validation membres, validation cotisations, projets antenne, documents, infos, projections, stats.
        </p>
      </Card>
    </AppShell>
  );
}
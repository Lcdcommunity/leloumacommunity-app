//web/app/(protected)/admin/projections/page.tsx
'use client';

import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { ProjectionForm } from '../../../../components/admin/ProjectionForm';

export default function AdminProjectionsPage() {
  return (
    <AppShell title="Projections (antenne)">
      <Card title="Simulation des recettes de cotisations">
        <p style={{ marginTop: 0 }}>
          Cette projection est une estimation (aide à la décision) et ne remplace pas les montants réellement validés.
        </p>
        <ProjectionForm />
      </Card>
    </AppShell>
  );
}
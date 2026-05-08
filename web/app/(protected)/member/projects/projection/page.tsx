// web/app/(protected)/member/projects/projection/page.tsx
'use client';

import { AppShell } from '../../../../../components/layout/AppShell';
import { ProjectionForm } from '../../../../../components/admin/ProjectionForm';

export default function MemberProjectionPage() {
  return (
    <AppShell title="Simulation financière">
      <div style={{ padding: 'clamp(1rem,3vw,2rem)', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '.65rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: '#0F766E', marginBottom: '.35rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <span style={{ width: 6, height: 6, background: '#14B8A6', borderRadius: '50%', display: 'inline-block' }} />
            Espace membre
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.4rem,4vw,2rem)', fontWeight: 700, color: '#111827', letterSpacing: '-.02em', lineHeight: 1.15, margin: 0 }}>
            Simulation financière
          </h1>
          <p style={{ fontSize: '.85rem', color: '#6B7280', marginTop: '.35rem' }}>
            Visualisez la capacité de collecte de l&apos;antenne selon différents scénarios.
          </p>
        </div>
        <ProjectionForm />
      </div>
    </AppShell>
  );
}
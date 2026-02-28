//web/app/(protected)/super-admin/antennas/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '../../../../../components/layout/AppShell';
import { Card } from '../../../../../components/ui/Card';
import { AntennaForm } from '../../../../../components/super-admin/AntennaForm';
import { api } from '../../../../../lib/api-client';

export default function NewAntennaPage() {
  const router = useRouter();

  return (
    <AppShell title="Nouvelle antenne">
      <Card title="Créer une antenne">
        <AntennaForm
          submitLabel="Créer l’antenne"
          onSubmit={async (values) => {
            await api.createAntenna(values);
            router.replace('/super-admin/antennas');
          }}
        />
      </Card>
    </AppShell>
  );
}
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
            try {
              await api.createAntenna(values);
              router.replace('/super-admin/antennas');
            } catch (error) {
              console.error("Erreur lors de la création de l'antenne:", error);
            }
          }}
        />
      </Card>
    </AppShell>
  );
}
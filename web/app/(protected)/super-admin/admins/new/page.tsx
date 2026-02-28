//web/app/(protected)/super-admin/admins/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '../../../../../components/layout/AppShell';
import { Card } from '../../../../../components/ui/Card';
import { AdminUserForm } from '../../../../../components/super-admin/AdminUserForm';
import { api } from '../../../../../lib/api-client';

export default function NewAntennaAdminPage() {
  const router = useRouter();

  return (
    <AppShell title="Créer un admin d’antenne">
      <Card title="Création de compte admin (réservé au Super Admin)">
        <AdminUserForm
          onSubmit={async (values) => {
            await api.createAntennaAdmin(values);
            router.replace('/super-admin/admins');
          }}
        />
      </Card>
    </AppShell>
  );
}
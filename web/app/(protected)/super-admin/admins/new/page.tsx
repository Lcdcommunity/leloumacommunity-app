// web/app/(protected)/super-admin/admins/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { AdminUserForm, type AdminFormValues } from '../../../../../components/super-admin/AdminUserForm';
import { api } from '../../../../../lib/api-client';

export default function NewAdminPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: AdminFormValues) => {
    setBusy(true);
    setError(null);

    try {
      await api.createAntennaAdmin({
        antennaIds: values.antennaIds,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        associationTitle: values.associationTitle,
        professionalStatus: values.professionalStatus,
        addressLine1: values.addressLine1,
        postalCode: values.postalCode,
        city: values.city,
        country: values.country,
        originSubPrefecture: values.originSubPrefecture,
        sendInvite: values.sendInvite,
      });

      router.push('/super-admin/admins');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'administrateur.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Nouvel Admin">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        
        .cpa-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 800px;
          margin: 0 auto;
        }
        
        .cpa-back {
          display: inline-flex; align-items: center; gap: .4rem; font-size: .78rem; font-weight: 700;
          color: #DC2626; text-decoration: none; margin-bottom: 1.25rem; transition: color .15s;
        }
        .cpa-back:hover { color: #991B1B; }
        
        .cpa-title {
          font-family: 'Cormorant Garamond', serif; font-size: clamp(1.8rem, 4vw, 2.4rem); font-weight: 700;
          color: #111827; line-height: 1.1; margin-bottom: .5rem; letter-spacing: -0.02em;
        }
        .cpa-title span { background: linear-gradient(135deg,#991B1B,#EF4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
        .cpa-sub { font-size: .9rem; font-weight: 500; color: #6B7280; margin-bottom: 2rem; }
        
        .cpa-err {
          display: flex; align-items: center; gap: .6rem; padding: .8rem 1rem;
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;
          color: #B91C1C; font-size: .82rem; font-weight: 700; margin-bottom: 1.5rem;
        }
      `}</style>

      <div className="cpa-wrap">
        <Link href="/super-admin/admins" className="cpa-back">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Retour aux administrateurs
        </Link>

        <h1 className="cpa-title">Nouvel <span>Administrateur</span></h1>
        <p className="cpa-sub">Créez un compte administrateur et assignez-le à une ou plusieurs antennes (de la même devise).</p>

        {error && (
          <div className="cpa-err">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}

        <AdminUserForm onSubmit={handleSubmit} busy={busy} />
      </div>
    </AppShell>
  );
}
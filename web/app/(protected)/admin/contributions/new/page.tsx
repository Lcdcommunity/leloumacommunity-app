'use client';

import { useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { AdminContributionCreateForm, AdminContributionValues } from '../../../../../components/admin/AdminContributionCreateForm';
import { api } from '../../../../../lib/api-client';

export default function AdminNewContributionForMemberPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (values: AdminContributionValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createContributionForMemberAdmin(values);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Cotiser pour un membre">
      <div style={{ fontFamily: "'DM Sans', sans-serif", padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2563eb', marginBottom: '0.35rem' }}>
            Espace administrateur
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: 500, color: '#111827' }}>
            Cotiser pour un membre
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Pour les membres qui ne peuvent pas utiliser l&apos;outil eux-mêmes. La cotisation sera immédiatement validée et apparaîtra dans l&apos;historique du membre, avec votre nom visible dans les détails.
          </p>
        </div>

        {success && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.9rem 1.1rem', borderRadius: 12, marginBottom: '1.25rem', fontWeight: 700, fontSize: '0.85rem' }}>
            ✅ Cotisation enregistrée et validée avec succès.
          </div>
        )}
        {errorMsg && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '0.9rem 1.1rem', borderRadius: 12, marginBottom: '1.25rem', fontWeight: 700, fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ background: 'rgba(253,253,255,0.9)', borderRadius: 20, border: '1px solid rgba(37,99,235,0.10)', padding: '1.5rem' }}>
          <AdminContributionCreateForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
      </div>
    </AppShell>
  );
}
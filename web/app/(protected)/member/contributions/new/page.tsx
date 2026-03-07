// web/app/(protected)/member/contributions/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../../../components/layout/AppShell';
import { Card } from '../../../../../components/ui/Card';
import { ContributionCreateForm } from '../../../../../components/member/ContributionCreateForm';
import { api } from '../../../../../lib/api-client';

// Plus de "reference" ici
type ContributionFormData = {
  amount: number;
  method: string;
  depositedAt?: string;
  note?: string;
  receiptFileAssetId?: string;
};

export default function MemberNewContributionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ContributionFormData) => {
    setIsSubmitting(true);
    try {
      await api.createContribution(values);
      router.push('/member/contributions/history');
    } catch (error) {
      console.error('Erreur dépôt:', error);
      alert('Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Faire un dépôt de cotisation">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Nouveau dépôt (cotisation)">
          <ContributionCreateForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
          />
        </Card>

        <Card title="Rappel important">
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              Le dépôt que vous enregistrez ici est une <strong>déclaration</strong> (espèces, virement, etc.).
            </p>
            <p>
              La cotisation passera au statut <strong>VALIDÉE</strong> uniquement après confirmation de réception par l&apos;administrateur de votre antenne.
            </p>
            <p>
              Vous pouvez ajouter un justificatif (capture, reçu, photo) pour faciliter le traitement.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
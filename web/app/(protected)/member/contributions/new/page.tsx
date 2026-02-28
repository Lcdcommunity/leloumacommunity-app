//web/app/(protected)/member/contributions/new/page.tsx
'use client';

import { AppShell } from '../../../../../components/layout/AppShell';
import { Card } from '../../../../../components/ui/Card';
import { ContributionCreateForm } from '../../../../../components/member/ContributionCreateForm';

export default function MemberNewContributionPage() {
  return (
    <AppShell title="Faire un dépôt de cotisation">
      <div className="grid grid-2">
        <Card title="Nouveau dépôt (cotisation)">
          <ContributionCreateForm />
        </Card>

        <Card title="Rappel important">
          <div className="stack-sm">
            <p>
              Le dépôt que vous enregistrez ici est une <strong>déclaration</strong> (espèces, virement, etc.).
            </p>
            <p>
              La cotisation passera au statut <strong>VALIDÉE</strong> uniquement après confirmation de réception
              par l’administrateur de votre antenne (hors application).
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
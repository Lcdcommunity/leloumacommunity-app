//web/components/member/MemberStatusBanner.tsx
'use client';

import { Badge } from '../ui/Badge';
import type { UserSummary } from '../../types/user';

export function MemberStatusBanner({ me }: { me: UserSummary }) {
  const status = me.status;

  let tone: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
  let message = 'Compte en cours de traitement.';

  if (status === 'PENDING_EMAIL_VERIFICATION') {
    tone = 'warning';
    message = 'Votre email n’est pas encore vérifié. Vérifiez votre boîte mail pour activer votre compte.';
  } else if (status === 'PENDING_APPROVAL') {
    tone = 'warning';
    message = 'Votre email est vérifié. Votre compte attend la validation de l’administrateur de votre antenne.';
  } else if (status === 'ACTIVE') {
    tone = 'success';
    message = 'Votre compte est actif. Vous pouvez utiliser toutes les fonctionnalités membre.';
  } else if (status === 'SUSPENDED') {
    tone = 'danger';
    message = 'Votre compte est suspendu. Contactez l’administrateur de votre antenne.';
  } else if (status === 'REJECTED') {
    tone = 'danger';
    message = 'Votre demande a été rejetée. Contactez l’administrateur de votre antenne.';
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="stack-sm">
          <div>
            <Badge tone={tone}>Statut du compte : {status}</Badge>
          </div>
          <p style={{ margin: 0 }}>{message}</p>
        </div>
      </div>
    </div>
  );
}
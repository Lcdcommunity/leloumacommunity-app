// web/components/admin/MemberCardPreviewModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { api, type VirtualCardData } from '../../lib/api-client';
import { VirtualCardWidget } from '../member/VirtualCardWidget';

interface MemberCardPreviewModalProps {
  memberId: string;
  memberName: string;
  scope: 'admin' | 'super-admin';
  onClose: () => void;
}

export function MemberCardPreviewModal({ memberId, memberName, scope, onClose }: MemberCardPreviewModalProps) {
  const [card, setCard] = useState<VirtualCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchCard = scope === 'super-admin'
      ? api.getMemberCardSuperAdmin(memberId)
      : api.getMemberCardAdmin(memberId);

    fetchCard
      .then((data) => { if (!cancelled) setCard(data); })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ce membre n'a pas encore de carte membre.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [memberId, scope]);

  return (
    <div className="mcpm-overlay" onClick={onClose}>
      <div className="mcpm-content" onClick={(e) => e.stopPropagation()}>
        <div className="mcpm-header">
          <span className="mcpm-title">Carte de {memberName}</span>
          <button className="mcpm-close" onClick={onClose} type="button">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mcpm-body">
          {loading && <div className="mcpm-loading">Chargement de la carte…</div>}
          {!loading && error && <div className="mcpm-error">{error}</div>}
          {!loading && !error && <VirtualCardWidget card={card} showPaymentLink={false} />}
        </div>
      </div>

      <style>{`
        .mcpm-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .mcpm-content { background: white; width: 100%; max-width: 640px; border-radius: 24px; max-height: 90vh; overflow-y: auto; padding: 1.25rem; }
        .mcpm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .mcpm-title { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; font-weight: 700; color: #111827; }
        .mcpm-close { width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #e2e8f0; display: flex; align-items: center; justify-content: center; cursor: pointer; background: white; flex-shrink: 0; }
        .mcpm-loading, .mcpm-error { padding: 2rem 1rem; text-align: center; font-size: 0.85rem; font-weight: 600; color: #64748b; }
        .mcpm-error { color: #b91c1c; }
      `}</style>
    </div>
  );
}
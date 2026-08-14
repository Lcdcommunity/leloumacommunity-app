// web/components/member/DownloadCardPdfButton.tsx
'use client';

import { useRef, useState } from 'react';
import type { VirtualCardData } from '../../lib/api-client';
import { MembershipCardPrintable } from './MembershipCardPrintable';
import { generateMembershipCardPdf } from '../../lib/card-pdf';

export function DownloadCardPdfButton({ card }: { card: VirtualCardData | null }) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (!card || !frontRef.current || !backRef.current) return;
    setGenerating(true);
    setError(null);
    try {
      await generateMembershipCardPdf({
        frontNode: frontRef.current,
        backNode: backRef.current,
        fileName: `carte-membre-${card.cardNumber?.replace(/[\s-]/g, '') || 'lcd'}.pdf`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du PDF.');
    } finally {
      setGenerating(false);
    }
  }

  if (!card) return null;

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: '-9999px' }} aria-hidden="true">
        <MembershipCardPrintable card={card} frontRef={frontRef} backRef={backRef} />
      </div>

      <button type="button" className="dcp-btn" onClick={handleDownload} disabled={generating}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
        </svg>
        {generating ? 'Génération du PDF…' : 'Télécharger ma carte (PDF)'}
      </button>

      {error && <p className="dcp-error">{error}</p>}

      <style>{`
        .dcp-btn {
          display: flex; align-items: center; justify-content: center; gap: 0.55rem;
          width: 100%; padding: 0.85rem; border-radius: 14px; margin-bottom: 1.25rem;
          border: 1.5px solid #1b5e42; background: #ffffff; color: #1b5e42;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; transition: background 0.2s ease, transform 0.2s ease;
        }
        .dcp-btn:hover:not(:disabled) { background: #f0f7f4; transform: translateY(-1px); }
        .dcp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .dcp-error { color: #b91c1c; font-size: 0.78rem; font-weight: 600; margin: -0.75rem 0 1rem; text-align: center; }
      `}</style>
    </>
  );
}
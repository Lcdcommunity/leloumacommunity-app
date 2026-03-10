//web/app/(protected)/member/contributions/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../../components/layout/AppShell';
import Link from 'next/link';

export default function MemberContributionsIndexPage() {
  const router = useRouter();

  // Auto-redirect to history after brief display
  useEffect(() => {
    const t = setTimeout(() => router.replace('/member/contributions/history'), 300);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <AppShell title="Mes cotisations">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .ci-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 700px; margin: 0 auto;
        }
        .ci-header { margin-bottom: 2rem; }
        .ci-eyebrow {
          font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .ci-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; }
        .ci-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500; color: #111827;
          letter-spacing: -0.02em;
        }
        .ci-title span {
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .ci-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 500px) { .ci-cards { grid-template-columns: 1fr; } }

        .ci-card {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          border: 1px solid rgba(37,99,235,0.10);
          box-shadow: 0 2px 12px rgba(37,99,235,0.06), 0 0 0 1px rgba(255,255,255,0.8) inset;
          padding: 1.4rem;
          text-decoration: none; display: flex; flex-direction: column; gap: 0.75rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ci-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37,99,235,0.12), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }
        .ci-card-ico {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .ci-card-title { font-size: 0.95rem; font-weight: 700; color: #111827; }
        .ci-card-desc { font-size: 0.78rem; color: #6B7280; line-height: 1.5; }
        .ci-card-arrow {
          display: flex; align-items: center; gap: 0.3rem;
          font-size: 0.73rem; font-weight: 700; margin-top: auto;
          transition: gap 0.2s;
        }
        .ci-card:hover .ci-card-arrow { gap: 0.5rem; }
      `}</style>

      <div className="ci-wrap">
        <div className="ci-header">
          <div className="ci-eyebrow"><div className="ci-eyebrow-dot" />Espace membre</div>
          <h1 className="ci-title">Mes <span>cotisations</span></h1>
        </div>

        <div className="ci-cards">
          <Link href="/member/contributions/history" className="ci-card">
            <div className="ci-card-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4 4-4m6 8l4-4-4-4"/>
              </svg>
            </div>
            <div className="ci-card-title">Historique</div>
            <p className="ci-card-desc">Consultez tous vos versements passés et leur statut de validation.</p>
            <span className="ci-card-arrow" style={{ color: '#2563EB' }}>
              Voir l&apos;historique
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </span>
          </Link>

          <Link href="/member/contributions/new" className="ci-card">
            <div className="ci-card-ico" style={{ background: '#ECFDF5', color: '#059669' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
            </div>
            <div className="ci-card-title">Nouveau dépôt</div>
            <p className="ci-card-desc">Déclarez un versement : cotisation, carte membre ou don libre.</p>
            <span className="ci-card-arrow" style={{ color: '#059669' }}>
              Faire un dépôt
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
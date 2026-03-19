// web/app/(protected)/member/contributions/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../../../components/layout/AppShell';
import { ContributionCreateForm } from '../../../../../components/member/ContributionCreateForm';
import { api } from '../../../../../lib/api-client';

type SupportedCurrency = 'GNF' | 'EUR' | 'USD' | 'XOF';

type ContributionFormData = {
  amount: number;
  currency: SupportedCurrency;
  method: string;
  depositedAt?: string;
  note?: string;
  purpose?: string;
  receiptFileAssetId?: string;
};

function normalizeCurrency(value?: string | null): SupportedCurrency {
  if (value === 'GNF' || value === 'EUR' || value === 'USD' || value === 'XOF') {
    return value;
  }
  return 'EUR';
}

export default function MemberNewContributionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [defaultCurrency, setDefaultCurrency] = useState<SupportedCurrency>('EUR');
  const [pricing, setPricing] = useState<{ monthlyQuota: number; membershipCard: number }>({ monthlyQuota: 0, membershipCard: 0 });
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const [dashboard, allPricing] = await Promise.all([
          api.dashboardMember(),
          api.getAssociationPricing().catch(() => ({} as Record<string, { monthlyQuota: number; membershipCard: number }>)), 
        ]);
        
        if (!mounted) return;

        const currentCurrency = normalizeCurrency(dashboard?.stats?.currency);
        setDefaultCurrency(currentCurrency);
        
        // On extrait le prix de LA devise du membre et on l'envoie au formulaire
        const localPricing = allPricing[currentCurrency] || { monthlyQuota: 0, membershipCard: 0 };
        setPricing({
          monthlyQuota: Number(localPricing.monthlyQuota) || 0,
          membershipCard: Number(localPricing.membershipCard) || 0,
        });

      } catch (error) {
        console.error('Erreur récupération infos:', error);
        if (!mounted) return;
        setDefaultCurrency('EUR');
      } finally {
        if (mounted) setIsBootLoading(false);
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (values: ContributionFormData) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.createContributionMember({
        amount: values.amount,
        currency: values.currency,
        method: values.method,
        depositedAt: values.depositedAt,
        note: values.note,
        purpose: values.purpose,
        receiptFileAssetId: values.receiptFileAssetId ?? null,
      });

      setSuccess(true);
      setTimeout(() => router.push('/member/contributions/history'), 1800);
    } catch (error) {
      console.error('Erreur dépôt:', error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue s'est produite. Veuillez réessayer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Faire un dépôt">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .nc-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 900px; margin: 0 auto;
        }
        .nc-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: ncin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .nc-eyebrow {
          font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .nc-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: ncpulse 2s ease-in-out infinite; }
        @keyframes ncpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .nc-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.5rem, 3vw, 1.9rem);
          font-weight: 500; color: #111827;
          letter-spacing: -0.02em; line-height: 1.15;
        }
        .nc-title span {
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .nc-grid {
          display: grid; grid-template-columns: 1fr 380px; gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 820px) { .nc-grid { grid-template-columns: 1fr; } }

        .nc-panel {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.10);
          box-shadow: 0 2px 12px rgba(37,99,235,0.06), 0 0 0 1px rgba(255,255,255,0.8) inset;
          overflow: hidden;
          opacity: 0; animation: ncin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .nc-panel-head {
          padding: 1.1rem 1.4rem;
          border-bottom: 1px solid rgba(37,99,235,0.08);
          display: flex; align-items: center; gap: 0.5rem;
        }
        .nc-panel-ico {
          width: 28px; height: 28px; background: #EFF6FF;
          border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #2563EB;
        }
        .nc-panel-title {
          font-size: 0.75rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; color: #374151;
        }
        .nc-panel-body { padding: 1.4rem; }

        .nc-info {
          display: flex; flex-direction: column; gap: 0.85rem;
          opacity: 0; animation: ncin 0.5s 0.18s cubic-bezier(.22,1,.36,1) forwards;
        }

        .nc-info-card {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 10px rgba(37,99,235,0.04), 0 0 0 1px rgba(255,255,255,0.8) inset;
          padding: 1.1rem 1.2rem;
        }
        .nc-info-title {
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #374151; margin-bottom: 0.9rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .nc-info-ico {
          width: 22px; height: 22px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
        }

        .nc-step {
          display: flex; gap: 0.65rem; align-items: flex-start;
          padding: 0.6rem 0; border-bottom: 1px solid rgba(37,99,235,0.06);
        }
        .nc-step:last-child { border-bottom: none; padding-bottom: 0; }
        .nc-step-num {
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          background: #EFF6FF; border: 1.5px solid #BFDBFE;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.62rem; font-weight: 700; color: #2563EB;
          margin-top: 1px;
        }
        .nc-step-text { font-size: 0.78rem; color: #374151; line-height: 1.55; }
        .nc-step-text strong { color: #111827; }

        .nc-notice {
          background: #FFFBEB; border: 1px solid #FDE68A;
          border-radius: 12px; padding: 0.85rem 1rem;
          display: flex; gap: 0.6rem; align-items: flex-start;
        }
        .nc-notice p { font-size: 0.76rem; color: #78350F; line-height: 1.55; }

        .nc-currency-box {
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          display: flex;
          gap: 0.6rem;
          align-items: flex-start;
        }
        .nc-currency-box p { font-size: 0.76rem; color: #065F46; line-height: 1.55; }

        .nc-error-box {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #B91C1C;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .nc-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 240px;
          gap: 0.75rem;
          color: #6B7280;
          font-size: 0.84rem;
          font-weight: 700;
        }
        .nc-ring {
          width: 24px;
          height: 24px;
          border: 2.5px solid rgba(37,99,235,0.12);
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: ncspin 0.8s linear infinite;
        }
        @keyframes ncspin { to { transform: rotate(360deg); } }

        .nc-success {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 2rem; gap: 0.85rem; text-align: center;
        }
        .nc-success-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, #DCFCE7, #BBF7D0);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 8px rgba(5,150,105,0.08);
          animation: ncpop 0.5s cubic-bezier(.22,1,.36,1);
        }
        @keyframes ncpop { from{opacity:0;transform:scale(.5);} to{opacity:1;transform:scale(1);} }
        .nc-success-title { font-family: 'Cormorant Garamond', serif; font-size: 1.35rem; color: #111827; font-weight: 500; }
        .nc-success-sub { font-size: 0.8rem; color: #6B7280; line-height: 1.6; }

        @keyframes ncin { to{opacity:1;transform:translateY(0);} }
      `}</style>

      <div className="nc-wrap">
        <div className="nc-header">
          <div className="nc-eyebrow">
            <div className="nc-eyebrow-dot" />Espace membre
          </div>
          <h1 className="nc-title">Déclarer un <span>versement</span></h1>
        </div>

        <div className="nc-grid">
          <div className="nc-panel">
            <div className="nc-panel-head">
              <div className="nc-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="nc-panel-title">Nouveau dépôt</span>
            </div>

            <div className="nc-panel-body">
              {isBootLoading ? (
                <div className="nc-loader">
                  <div className="nc-ring" />
                  Chargement...
                </div>
              ) : success ? (
                <div className="nc-success">
                  <div className="nc-success-icon">
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2.2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="nc-success-title">Versement enregistré !</p>
                  <p className="nc-success-sub">
                    Votre dépôt est en attente de validation
                    <br />
                    par l&apos;administrateur de votre antenne.
                  </p>
                </div>
              ) : (
                <>
                  {errorMsg && (
                    <div className="nc-error-box">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errorMsg}
                    </div>
                  )}

                  <ContributionCreateForm
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    defaultCurrency={defaultCurrency}
                    pricing={pricing}
                  />
                </>
              )}
            </div>
          </div>

          <div className="nc-info">
            <div className="nc-currency-box">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <p>
                La devise de votre dépôt est automatiquement alignée sur celle de votre antenne :
                <strong> {defaultCurrency}</strong>.
              </p>
            </div>

            <div className="nc-info-card">
              <div className="nc-info-title">
                <div className="nc-info-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Comment ça marche
              </div>

              {[
                { n: '1', text: <>Remplissez le formulaire avec le <strong>motif</strong>, le <strong>montant</strong> et la <strong>méthode de paiement</strong>.</> },
                { n: '2', text: <>La <strong>devise est imposée automatiquement</strong> selon l’antenne à laquelle vous appartenez.</> },
                { n: '3', text: <>Votre dépôt est enregistré au statut <strong>En attente</strong>.</> },
                { n: '4', text: <>L&apos;administrateur de votre antenne <strong>valide ou rejette</strong> la cotisation après vérification.</> },
              ].map((s) => (
                <div key={s.n} className="nc-step">
                  <div className="nc-step-num">{s.n}</div>
                  <p className="nc-step-text">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="nc-notice">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>
                Le dépôt est une <strong>déclaration</strong>. La cotisation est validée uniquement après confirmation de réception par votre administrateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
'use client';
// web/app/(protected)/admin/contributions/new/page.tsx
//
// v3.0 — 🔥 CORRIGÉ : absence de retour visuel exploitable après soumission
// — le message de succès/échec précédent apparaissait en haut du panneau,
// hors du champ de vision quand l'admin est scrollé vers le bouton
// "Soumettre" en bas d'un long formulaire, ce qui le poussait à recliquer
// (chaque clic créait une cotisation validée en doublon, cf. carte membre
// payée 3 fois). Remplacé par un toast en position fixe (visible quel que
// soit le défilement, même pattern que aa-global-toast dans
// admin/members/page.tsx) + réinitialisation complète du formulaire après
// un succès (remount via `key`), pour qu'un second clic accidentel ne
// puisse pas soumettre à nouveau les mêmes valeurs.

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { AdminContributionCreateForm, AdminContributionValues } from '../../../../../components/admin/AdminContributionCreateForm';
import { api } from '../../../../../lib/api-client';

export default function AdminNewContributionForMemberPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = async (values: AdminContributionValues) => {
    setIsSubmitting(true);
    try {
      await api.createContributionForMemberAdmin(values);
      setToast({ type: 'success', message: 'Cotisation enregistrée et validée avec succès.' });
      setFormKey((k) => k + 1); // remonte le formulaire → réinitialisation complète
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : "Erreur lors de l'enregistrement.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Cotiser pour un membre">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .amc-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 900px; margin: 0 auto;
        }
        .amc-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: amcin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .amc-eyebrow {
          font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .amc-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: amcpulse 2s ease-in-out infinite; }
        @keyframes amcpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .amc-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.5rem, 3vw, 1.9rem);
          font-weight: 500; color: #111827;
          letter-spacing: -0.02em; line-height: 1.15;
        }
        .amc-title span {
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .amc-grid {
          display: grid; grid-template-columns: 1fr 380px; gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 820px) { .amc-grid { grid-template-columns: 1fr; } }

        .amc-panel {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.10);
          box-shadow: 0 2px 12px rgba(37,99,235,0.06), 0 0 0 1px rgba(255,255,255,0.8) inset;
          overflow: hidden;
          opacity: 0; animation: amcin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .amc-panel-head {
          padding: 1.1rem 1.4rem;
          border-bottom: 1px solid rgba(37,99,235,0.08);
          display: flex; align-items: center; gap: 0.5rem;
        }
        .amc-panel-ico {
          width: 28px; height: 28px; background: #ECFDF5;
          border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #059669;
        }
        .amc-panel-title {
          font-size: 0.75rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; color: #374151;
        }
        .amc-panel-body { padding: 1.4rem; }

        .amc-info {
          display: flex; flex-direction: column; gap: 0.85rem;
          opacity: 0; animation: amcin 0.5s 0.18s cubic-bezier(.22,1,.36,1) forwards;
        }
        .amc-info-card {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 10px rgba(37,99,235,0.04), 0 0 0 1px rgba(255,255,255,0.8) inset;
          padding: 1.1rem 1.2rem;
        }
        .amc-info-title {
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #374151; margin-bottom: 0.9rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .amc-info-ico {
          width: 22px; height: 22px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
        }
        .amc-step {
          display: flex; gap: 0.65rem; align-items: flex-start;
          padding: 0.6rem 0; border-bottom: 1px solid rgba(37,99,235,0.06);
        }
        .amc-step:last-child { border-bottom: none; padding-bottom: 0; }
        .amc-step-num {
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          background: #ECFDF5; border: 1.5px solid #A7F3D0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.62rem; font-weight: 700; color: #059669;
          margin-top: 1px;
        }
        .amc-step-text { font-size: 0.78rem; color: #374151; line-height: 1.55; }
        .amc-step-text strong { color: #111827; }

        .amc-notice {
          background: #FFFBEB; border: 1px solid #FDE68A;
          border-radius: 12px; padding: 0.85rem 1rem;
          display: flex; gap: 0.6rem; align-items: flex-start;
        }
        .amc-notice p { font-size: 0.76rem; color: #78350F; line-height: 1.55; }

        /* ── Toast : position fixe, visible quel que soit le scroll ── */
        .amc-toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 9999;
          max-width: min(380px, calc(100vw - 2rem));
          background: white; border-radius: 14px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.18);
          padding: 1rem 1.1rem; display: flex; gap: 0.7rem; align-items: flex-start;
          animation: amcToastIn 0.35s cubic-bezier(.22,1,.36,1) forwards;
          border-left: 4px solid;
        }
        .amc-toast.success { border-left-color: #059669; }
        .amc-toast.error { border-left-color: #DC2626; }
        .amc-toast-icon {
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .amc-toast.success .amc-toast-icon { background: #ECFDF5; color: #059669; }
        .amc-toast.error .amc-toast-icon { background: #FEF2F2; color: #DC2626; }
        .amc-toast-text { font-size: 0.83rem; font-weight: 600; color: #111827; line-height: 1.45; }
        .amc-toast-close {
          margin-left: auto; flex-shrink: 0; background: none; border: none;
          color: #9CA3AF; cursor: pointer; padding: 0.1rem;
        }
        @keyframes amcToastIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        @keyframes amcin { to{opacity:1;transform:translateY(0);} }
      `}</style>

      {toast && (
        <div className={`amc-toast ${toast.type}`}>
          <div className="amc-toast-icon">
            {toast.type === 'success' ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <span className="amc-toast-text">{toast.message}</span>
          <button className="amc-toast-close" onClick={() => setToast(null)} aria-label="Fermer">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="amc-wrap">
        <div className="amc-header">
          <div className="amc-eyebrow">
            <div className="amc-eyebrow-dot" />Espace administrateur
          </div>
          <h1 className="amc-title">Cotiser pour <span>un membre</span></h1>
        </div>

        <div className="amc-grid">
          <div className="amc-panel">
            <div className="amc-panel-head">
              <div className="amc-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="amc-panel-title">Nouveau dépôt pour un membre</span>
            </div>

            <div className="amc-panel-body">
              <AdminContributionCreateForm key={formKey} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
            </div>
          </div>

          <div className="amc-info">
            <div className="amc-info-card">
              <div className="amc-info-title">
                <div className="amc-info-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Comment ça marche
              </div>

              {[
                { n: '1', text: <>Cherchez le <strong>membre bénéficiaire</strong> (illettré ou empêché) dans votre périmètre.</> },
                { n: '2', text: <>Choisissez le <strong>motif</strong> et le <strong>montant</strong> — la devise est automatiquement celle de l&apos;antenne du membre.</> },
                { n: '3', text: <>La cotisation est <strong>validée immédiatement</strong>, avec écriture comptable créée dans la foulée.</> },
                { n: '4', text: <>Elle apparaît dans <strong>l&apos;historique du membre</strong> comme si c&apos;était lui qui l&apos;avait passée, avec <strong>votre nom</strong> visible dans les détails.</> },
              ].map((s) => (
                <div key={s.n} className="amc-step">
                  <div className="amc-step-num">{s.n}</div>
                  <p className="amc-step-text">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="amc-notice">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>
                Réservé aux membres qui ne peuvent pas utiliser l&apos;outil eux-mêmes. Assurez-vous d&apos;avoir bien reçu le paiement avant de l&apos;enregistrer : contrairement au dépôt d&apos;un membre, celui-ci est validé sans repasser par un second contrôle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
// web/app/(protected)/member/elections/page.tsx
// web/app/(protected)/member/elections/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Election, ElectionPosition } from '../../../../types/election';
import { LiveResults } from '../../../../components/elections/LiveResults';

export default function ElectionPage() {
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [votedPositionIds, setVotedPositionIds] = useState<string[]>([]);
  const [view, setView] = useState<'VOTE' | 'RESULTS'>('VOTE');
  const [busy, setBusy] = useState(false);

  const [confirmVoteData, setConfirmVoteData] = useState<{
    positionId: string;
    candidateId: string;
    candidateName: string;
    initials: string;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadElection = useCallback(async () => {
    try {
      const data = await api.getActiveElection();
      setElection(data || null);
    } catch (err) {
      console.error('Erreur élection:', err);
      setElection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadElection(); }, [loadElection]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const handleConfirmVote = async () => {
    if (!confirmVoteData) return;
    setBusy(true);
    try {
      await api.castVote({
        positionId: confirmVoteData.positionId,
        candidateId: confirmVoteData.candidateId,
      });
      setVotedPositionIds(prev => [...prev, confirmVoteData.positionId]);
      showToast('Votre suffrage a été enregistré avec succès.', 'success');
      setConfirmVoteData(null);

      setTimeout(() => {
        if (election && currentStep < election.positions.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setView('RESULTS');
        }
      }, 1200);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.", 'error');
      setConfirmVoteData(null);
    } finally {
      setBusy(false);
    }
  };

  /* ── LOADING ── */
  if (loading) {
    return (
      <AppShell title="Espace Électoral">
        <style>{`
          .ev-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 1.25rem; font-family: 'DM Sans', sans-serif; color: #64748B; font-weight: 600; font-size: 0.9rem; }
          .ev-spin { width: 36px; height: 36px; border: 3px solid #E2E8F0; border-top-color: #2563EB; border-radius: 50%; animation: evSpin 0.7s linear infinite; }
          @keyframes evSpin { to { transform: rotate(360deg); } }
        `}</style>
        <div className="ev-loading">
          <div className="ev-spin" />
          Chargement du bureau de vote…
        </div>
      </AppShell>
    );
  }

  /* ── PAS D'ÉLECTION ── */
  if (!election) {
    return (
      <AppShell title="Espace Électoral">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
          .ev-empty { max-width: 520px; margin: 5rem auto; background: white; border-radius: 28px; padding: 4rem 2.5rem; text-align: center; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0,0,0,0.04); font-family: 'DM Sans', sans-serif; }
          .ev-empty-orb { width: 72px; height: 72px; background: linear-gradient(135deg, #EFF6FF, #DBEAFE); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 1.75rem; }
          .ev-empty h2 { font-family: 'Cormorant Garamond', serif; font-size: 1.875rem; font-weight: 700; color: #0F172A; margin-bottom: 0.75rem; letter-spacing: -0.02em; }
          .ev-empty p { color: #64748B; font-size: 0.9rem; line-height: 1.6; font-weight: 500; }
        `}</style>
        <div className="ev-empty">
          <div className="ev-empty-orb">🗳️</div>
          <h2>Aucun scrutin en cours</h2>
          <p>Le bureau de vote est actuellement fermé. Vous serez notifié dès l&apos;ouverture d&apos;une nouvelle élection.</p>
        </div>
      </AppShell>
    );
  }

  const currentPosition: ElectionPosition | undefined = election.positions[currentStep];
  const totalPositions = election.positions.length;
  const votedCount = votedPositionIds.length;
  const progress = totalPositions > 0 ? (votedCount / totalPositions) * 100 : 0;
  const allVoted = votedCount === totalPositions && totalPositions > 0;

  return (
    <AppShell title="Espace Électoral">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        /* ── VARIABLES ── */
        :root {
          --ev-ink: #0A0F1E;
          --ev-ink2: #1E293B;
          --ev-slate: #64748B;
          --ev-muted: #94A3B8;
          --ev-border: #E2E8F0;
          --ev-surface: #F8FAFC;
          --ev-white: #FFFFFF;
          --ev-blue: #2563EB;
          --ev-blue-d: #1D4ED8;
          --ev-blue-l: #EFF6FF;
          --ev-blue-m: #BFDBFE;
          --ev-green: #059669;
          --ev-green-l: #ECFDF5;
          --ev-green-m: #A7F3D0;
          --ev-red: #DC2626;
          --ev-red-l: #FEF2F2;
        }

        *, *::before, *::after { box-sizing: border-box; }

        /* ── PAGE ── */
        .ev-page {
          padding: clamp(1rem, 4vw, 2rem);
          max-width: 960px;
          margin: 0 auto;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── TOAST ── */
        .ev-toast {
          position: fixed; top: 1.25rem; right: 1.25rem; z-index: 9999;
          padding: 0.875rem 1.25rem;
          background: var(--ev-white);
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
          display: flex; align-items: center; gap: 0.75rem;
          font-size: 0.875rem; font-weight: 600; color: var(--ev-ink2);
          animation: evToastIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
          max-width: 340px;
        }
        .ev-toast-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .ev-toast.success .ev-toast-dot { background: var(--ev-green); }
        .ev-toast.error .ev-toast-dot { background: var(--ev-red); }

        /* ── NAV TOGGLE ── */
        .ev-nav { display: flex; justify-content: center; margin-bottom: 1.75rem; }
        .ev-toggle {
          display: flex; background: var(--ev-surface);
          border: 1px solid var(--ev-border);
          border-radius: 14px; padding: 0.3rem; gap: 0.25rem;
        }
        .ev-toggle-btn {
          padding: 0.6rem 1.5rem; border-radius: 10px;
          border: none; background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 700;
          color: var(--ev-slate); cursor: pointer;
          transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem;
        }
        .ev-toggle-btn.active {
          background: var(--ev-white);
          color: var(--ev-ink2);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
        }

        /* ── HERO ── */
        .ev-hero {
          background: linear-gradient(145deg, #0F172A 0%, #1E3A8A 50%, #0F172A 100%);
          border-radius: 24px;
          padding: clamp(1.75rem, 5vw, 2.5rem);
          color: white;
          margin-bottom: 1.75rem;
          position: relative;
          overflow: hidden;
        }
        .ev-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 80% at 80% 20%, rgba(59,130,246,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .ev-hero::after {
          content: '';
          position: absolute;
          bottom: -30px; right: -30px;
          width: 180px; height: 180px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .ev-hero-inner { position: relative; z-index: 1; }
        .ev-hero-label {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3);
          border-radius: 99px; padding: 0.3rem 0.875rem;
          font-size: 0.7rem; font-weight: 800; color: #34D399;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 1rem;
        }
        .ev-hero-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; animation: evPulse 2s infinite; }
        .ev-hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.75rem, 5vw, 2.5rem);
          font-weight: 700; line-height: 1.1;
          margin-bottom: 0.625rem;
          letter-spacing: -0.025em;
        }
        .ev-hero-desc {
          font-size: 0.875rem; color: rgba(255,255,255,0.6);
          font-weight: 500; line-height: 1.55;
          max-width: 480px; margin-bottom: 1.5rem;
        }
        .ev-hero-footer {
          display: flex; align-items: center; gap: 1.5rem;
          flex-wrap: wrap;
        }
        .ev-hero-stat {
          display: flex; flex-direction: column; gap: 0.1rem;
        }
        .ev-hero-stat-val {
          font-family: 'DM Mono', monospace;
          font-size: 1.25rem; font-weight: 500; color: white;
        }
        .ev-hero-stat-label {
          font-size: 0.7rem; color: rgba(255,255,255,0.45); font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .ev-hero-divider {
          width: 1px; height: 32px; background: rgba(255,255,255,0.1);
        }
        .ev-progress-wrap { flex: 1; min-width: 140px; }
        .ev-progress-label {
          display: flex; justify-content: space-between;
          font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.5);
          margin-bottom: 0.4rem;
        }
        .ev-progress-track {
          height: 5px; background: rgba(255,255,255,0.08);
          border-radius: 99px; overflow: hidden;
        }
        .ev-progress-bar {
          height: 100%; background: linear-gradient(90deg, #10B981, #34D399);
          border-radius: 99px;
          transition: width 0.7s cubic-bezier(0.4,0,0.2,1);
        }

        /* ── STEPPER POSITIONS ── */
        .ev-stepper {
          display: flex; gap: 0.5rem;
          overflow-x: auto; padding-bottom: 0.25rem;
          margin-bottom: 1.75rem;
          scrollbar-width: none;
        }
        .ev-stepper::-webkit-scrollbar { display: none; }
        .ev-step-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.6rem 1.125rem;
          border-radius: 10px;
          border: 1.5px solid var(--ev-border);
          background: var(--ev-white);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8125rem; font-weight: 700;
          color: var(--ev-slate);
          cursor: pointer; transition: all 0.18s;
          white-space: nowrap; flex-shrink: 0;
        }
        .ev-step-btn:hover { border-color: #CBD5E1; color: var(--ev-ink2); }
        .ev-step-btn.current {
          background: var(--ev-ink); color: white;
          border-color: var(--ev-ink);
          box-shadow: 0 4px 12px rgba(10,15,30,0.2);
        }
        .ev-step-btn.done {
          background: var(--ev-green-l); color: var(--ev-green);
          border-color: var(--ev-green-m);
        }
        .ev-step-check {
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--ev-green); display: flex;
          align-items: center; justify-content: center;
        }

        /* ── SECTION TITRE ── */
        .ev-section-head {
          margin-bottom: 1.25rem;
        }
        .ev-section-title {
          font-size: 1.0625rem; font-weight: 800;
          color: var(--ev-ink2); letter-spacing: -0.01em;
        }
        .ev-section-sub {
          font-size: 0.8rem; color: var(--ev-muted);
          font-weight: 500; margin-top: 0.2rem;
        }

        /* ── GRILLE CANDIDATS — 3 colonnes, responsive ── */
        .ev-cand-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.875rem;
        }
        @media (max-width: 600px) {
          .ev-cand-grid { grid-template-columns: repeat(3, 1fr); gap: 0.625rem; }
        }
        @media (max-width: 360px) {
          .ev-cand-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* ── CARTE CANDIDAT ── */
        .ev-cand-card {
          background: var(--ev-white);
          border: 1.5px solid var(--ev-border);
          border-radius: 18px;
          padding: clamp(0.875rem, 2vw, 1.375rem);
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
          gap: 0.625rem;
          transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
          cursor: default;
          position: relative;
          overflow: hidden;
        }
        .ev-cand-card::before {
          content: ''; position: absolute;
          inset: 0; opacity: 0;
          background: linear-gradient(135deg, var(--ev-blue-l), transparent);
          transition: opacity 0.25s;
          pointer-events: none;
        }
        .ev-cand-card:not(.voted):hover {
          border-color: var(--ev-blue-m);
          box-shadow: 0 8px 24px rgba(37,99,235,0.1);
          transform: translateY(-3px);
        }
        .ev-cand-card:not(.voted):hover::before { opacity: 1; }
        .ev-cand-card.voted {
          border-color: var(--ev-green-m);
          background: var(--ev-green-l);
        }

        .ev-cand-avatar {
          width: clamp(52px, 12vw, 72px);
          height: clamp(52px, 12vw, 72px);
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
          border: 3px solid var(--ev-white);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .ev-cand-avatar-initials {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, var(--ev-blue), #60A5FA);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(0.875rem, 2.5vw, 1.25rem);
          font-weight: 800; color: white;
          letter-spacing: -0.02em;
        }

        .ev-cand-name {
          font-size: clamp(0.7rem, 2vw, 0.875rem);
          font-weight: 800; color: var(--ev-ink2);
          line-height: 1.25;
        }
        .ev-cand-role {
          font-size: 0.65rem; font-weight: 700;
          color: var(--ev-blue); background: var(--ev-blue-l);
          padding: 0.2rem 0.5rem; border-radius: 99px;
          text-transform: uppercase; letter-spacing: 0.05em;
          white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis; max-width: 100%;
        }
        .ev-cand-bio {
          font-size: 0.75rem; color: var(--ev-slate);
          line-height: 1.5; font-weight: 500;
          display: -webkit-box; -webkit-line-clamp: 3;
          -webkit-box-orient: vertical; overflow: hidden;
        }

        /* ── BOUTON VOTER ── */
        .ev-vote-btn {
          width: 100%; padding: clamp(0.6rem, 2vw, 0.875rem);
          border-radius: 12px; border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(0.7rem, 2vw, 0.8125rem);
          font-weight: 800;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 0.35rem;
          position: relative; z-index: 1;
        }
        .ev-vote-btn.idle {
          background: var(--ev-ink); color: white;
          box-shadow: 0 4px 12px rgba(10,15,30,0.15);
        }
        .ev-vote-btn.idle:hover:not(:disabled) {
          background: var(--ev-blue);
          box-shadow: 0 6px 16px rgba(37,99,235,0.25);
          transform: translateY(-1px);
        }
        .ev-vote-btn.idle:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .ev-vote-btn.done-btn {
          background: var(--ev-green); color: white;
          cursor: default; box-shadow: none;
        }

        /* ── ÉTAT COMPLET ── */
        .ev-all-done {
          background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
          border: 1.5px solid var(--ev-green-m);
          border-radius: 20px;
          padding: 3rem 2rem; text-align: center;
          margin-top: 2rem;
        }
        .ev-all-done-icon {
          width: 64px; height: 64px;
          background: var(--ev-green); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem;
          box-shadow: 0 8px 24px rgba(5,150,105,0.25);
        }
        .ev-all-done h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.75rem; font-weight: 700;
          color: #065F46; margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }
        .ev-all-done p { font-size: 0.875rem; color: #047857; font-weight: 500; line-height: 1.55; }
        .ev-results-link {
          display: inline-flex; align-items: center; gap: 0.45rem;
          margin-top: 1.5rem; padding: 0.75rem 1.5rem;
          background: var(--ev-green); color: white;
          border-radius: 12px; border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 800;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(5,150,105,0.2);
        }
        .ev-results-link:hover { background: #047857; transform: translateY(-1px); }

        /* ── MODALE CONFIRMATION ── */
        .ev-modal-bg {
          position: fixed; inset: 0;
          background: rgba(10,15,30,0.55);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          z-index: 500;
          display: flex; align-items: flex-end; justify-content: center;
          animation: evFadeIn 0.2s ease forwards;
          padding: 0 0 0;
        }
        @media (min-width: 540px) {
          .ev-modal-bg { align-items: center; padding: 1.5rem; }
        }
        .ev-modal {
          background: var(--ev-white);
          width: 100%; max-width: 440px;
          border-radius: 28px 28px 0 0;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 -20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04);
          animation: evSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @media (min-width: 540px) {
          .ev-modal { border-radius: 28px; box-shadow: 0 30px 70px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04); }
        }
        .ev-modal-handle {
          width: 36px; height: 4px; background: var(--ev-border);
          border-radius: 99px; margin: 0.875rem auto 0;
        }
        @media (min-width: 540px) { .ev-modal-handle { display: none; } }
        .ev-modal-body { padding: 1.5rem 1.75rem 2rem; text-align: center; }

        .ev-modal-cand-preview {
          display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
          background: var(--ev-surface); border-radius: 16px;
          padding: 1.25rem; margin-bottom: 1.5rem;
          border: 1px solid var(--ev-border);
        }
        .ev-modal-avatar {
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, var(--ev-blue), #60A5FA);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 1.125rem; font-weight: 800; color: white;
        }
        .ev-modal-cand-name {
          font-size: 1rem; font-weight: 800; color: var(--ev-ink2);
        }
        .ev-modal-pos-chip {
          font-size: 0.7rem; font-weight: 700; color: var(--ev-blue);
          background: var(--ev-blue-l); padding: 0.25rem 0.75rem;
          border-radius: 99px; text-transform: uppercase; letter-spacing: 0.05em;
        }

        .ev-modal-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.5rem; font-weight: 700; color: var(--ev-ink);
          margin-bottom: 0.375rem; letter-spacing: -0.02em;
        }
        .ev-modal-sub {
          font-size: 0.8375rem; color: var(--ev-slate);
          font-weight: 500; line-height: 1.5; margin-bottom: 1.25rem;
        }
        .ev-modal-actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 0.75rem; }
        .ev-modal-cancel {
          padding: 0.875rem; border-radius: 14px;
          border: 1.5px solid var(--ev-border);
          background: var(--ev-white); color: var(--ev-slate);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 700;
          cursor: pointer; transition: all 0.18s;
        }
        .ev-modal-cancel:hover { background: var(--ev-surface); color: var(--ev-ink); }
        .ev-modal-confirm {
          padding: 0.875rem; border-radius: 14px; border: none;
          background: var(--ev-blue); color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 800;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(37,99,235,0.3);
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
        }
        .ev-modal-confirm:hover:not(:disabled) {
          background: var(--ev-blue-d);
          box-shadow: 0 6px 18px rgba(37,99,235,0.4);
          transform: translateY(-1px);
        }
        .ev-modal-confirm:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }

        /* ── SPINNER ── */
        .ev-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%; animation: evSpin 0.6s linear infinite;
        }
        @keyframes evSpin { to { transform: rotate(360deg); } }

        /* ── ANIMATIONS ── */
        @keyframes evFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes evSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes evToastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes evPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* TOAST */}
      {toast && (
        <div className={`ev-toast ${toast.type}`}>
          <span className="ev-toast-dot" />
          {toast.message}
        </div>
      )}

      <div className="ev-page">

        {/* NAV VOTE / RÉSULTATS */}
        <div className="ev-nav">
          <div className="ev-toggle">
            <button
              className={`ev-toggle-btn ${view === 'VOTE' ? 'active' : ''}`}
              onClick={() => setView('VOTE')}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Voter
            </button>
            <button
              className={`ev-toggle-btn ${view === 'RESULTS' ? 'active' : ''}`}
              onClick={() => setView('RESULTS')}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              En direct
            </button>
          </div>
        </div>

        {view === 'VOTE' ? (
          <>
            {/* HERO */}
            <header className="ev-hero">
              <div className="ev-hero-inner">
                <div className="ev-hero-label">
                  <span className="ev-hero-dot" />
                  Scrutin en cours
                </div>
                <h1>{election.title}</h1>
                <p className="ev-hero-desc">
                  {election.description || 'Scrutin sécurisé — votre voix compte pour l\'avenir de l\'association.'}
                </p>
                <div className="ev-hero-footer">
                  <div className="ev-hero-stat">
                    <span className="ev-hero-stat-val">{votedCount}/{totalPositions}</span>
                    <span className="ev-hero-stat-label">Postes votés</span>
                  </div>
                  <div className="ev-hero-divider" />
                  <div className="ev-progress-wrap">
                    <div className="ev-progress-label">
                      <span>Progression</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="ev-progress-track">
                      <div className="ev-progress-bar" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* STEPPER POSTES */}
            {totalPositions > 1 && (
              <div className="ev-stepper">
                {election.positions.map((pos, idx) => {
                  const isDone = votedPositionIds.includes(pos.id);
                  const isCurrent = idx === currentStep;
                  return (
                    <button
                      key={pos.id}
                      className={`ev-step-btn ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}
                      onClick={() => setCurrentStep(idx)}
                    >
                      {isDone ? (
                        <div className="ev-step-check">
                          <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', opacity: 0.6 }}>
                          {idx + 1}
                        </span>
                      )}
                      {pos.title}
                    </button>
                  );
                })}
              </div>
            )}

            {/* CONTENU — CANDIDATS OU TOUT VOTÉ */}
            {allVoted ? (
              <div className="ev-all-done">
                <div className="ev-all-done-icon">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2>Vote enregistré !</h2>
                <p>Tous vos suffrages ont été déposés dans l&apos;urne numérique.<br />Merci pour votre participation.</p>
                <button className="ev-results-link" onClick={() => setView('RESULTS')}>
                  Voir les résultats en direct
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            ) : currentPosition ? (
              <>
                <div className="ev-section-head">
                  <h2 className="ev-section-title">{currentPosition.title}</h2>
                  <p className="ev-section-sub">
                    {currentPosition.candidates.length} candidat{currentPosition.candidates.length !== 1 ? 's' : ''} en lice
                    {votedPositionIds.includes(currentPosition.id) ? ' · Voté ✓' : ' · Sélectionnez votre candidat'}
                  </p>
                </div>

                <div className="ev-cand-grid">
                  {currentPosition.candidates.map(cand => {
                    const hasVoted = votedPositionIds.includes(currentPosition.id);
                    const initials = `${cand.user.firstName[0] ?? ''}${cand.user.lastName[0] ?? ''}`.toUpperCase();
                    return (
                      <div key={cand.id} className={`ev-cand-card ${hasVoted ? 'voted' : ''}`}>
                        <div className="ev-cand-avatar">
                          {cand.user.profilePhotoUrl ? (
                            <Image
                              src={cand.user.profilePhotoUrl}
                              alt={cand.user.firstName}
                              fill
                              style={{ objectFit: 'cover' }}
                              unoptimized
                            />
                          ) : (
                            <div className="ev-cand-avatar-initials">{initials}</div>
                          )}
                        </div>
                        <div className="ev-cand-name">
                          {cand.user.firstName}<br />{cand.user.lastName}
                        </div>
                        {cand.user.professionalStatus && (
                          <span className="ev-cand-role">{cand.user.professionalStatus}</span>
                        )}
                        {cand.bio && (
                          <p className="ev-cand-bio">{cand.bio}</p>
                        )}
                        <button
                          className={`ev-vote-btn ${hasVoted ? 'done-btn' : 'idle'}`}
                          disabled={busy || hasVoted}
                          onClick={() => !hasVoted && setConfirmVoteData({
                            positionId: currentPosition.id,
                            candidateId: cand.id,
                            candidateName: `${cand.user.firstName} ${cand.user.lastName}`,
                            initials,
                          })}
                        >
                          {hasVoted ? (
                            <>
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Voté
                            </>
                          ) : 'Choisir'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <LiveResults electionId={election.id} />
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* MODALE CONFIRMATION VOTE                   */}
      {/* ═══════════════════════════════════════════ */}
      {confirmVoteData && (
        <div className="ev-modal-bg" onClick={() => !busy && setConfirmVoteData(null)}>
          <div className="ev-modal" onClick={e => e.stopPropagation()}>
            <div className="ev-modal-handle" />
            <div className="ev-modal-body">
              {/* Aperçu candidat */}
              <div className="ev-modal-cand-preview">
                <div className="ev-modal-avatar">{confirmVoteData.initials}</div>
                <div className="ev-modal-cand-name">{confirmVoteData.candidateName}</div>
                <span className="ev-modal-pos-chip">
                  {election.positions[currentStep]?.title}
                </span>
              </div>

              <h2 className="ev-modal-title">Confirmer mon vote</h2>
              <p className="ev-modal-sub">
                Votre choix est définitif et anonyme.<br />
                Voulez-vous continuer ?
              </p>

              <div className="ev-modal-actions">
                <button
                  className="ev-modal-cancel"
                  onClick={() => setConfirmVoteData(null)}
                  disabled={busy}
                >
                  Annuler
                </button>
                <button
                  className="ev-modal-confirm"
                  onClick={() => void handleConfirmVote()}
                  disabled={busy}
                >
                  {busy ? (
                    <div className="ev-spinner" />
                  ) : (
                    <>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
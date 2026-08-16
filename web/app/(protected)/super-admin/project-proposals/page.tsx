// web/app/(protected)/super-admin/project-proposals/page.tsx
// 🔥 NOUVEAU FICHIER — dupliqué depuis admin/project-proposals/page.tsx à la
// demande de l'utilisateur (plutôt que de partager la même page entre les
// deux rôles). Différences avec la version Admin Antenne :
//   - Eyebrow "Super Admin" au lieu de "Admin antenne"
//   - Libellé panneau "toutes les antennes" au lieu de "mon antenne"
//   - <ProposalSuperAdminActions isSuperAdmin={true}> toujours actif (pas de
//     détection de rôle via api.me() : cette route est déjà réservée
//     SUPER_ADMIN/SYSTEM_ADMIN par le layout protégé, comme les autres pages
//     sous /super-admin/)
//
// ⚠️ À VÉRIFIER CÔTÉ BACKEND : cette page réutilise telles quelles
// api.listProjectProposals / api.approveProjectProposal / api.rejectProjectProposal
// (donc les routes /admin/project-proposals...). Je n'ai pas le contrôleur
// qui sert ces routes — assure-toi qu'il autorise bien SUPER_ADMIN/SYSTEM_ADMIN
// (pas seulement ANTENNA_ADMIN) et qu'il renvoie les propositions de TOUTES
// les antennes de l'association pour ces rôles (pas juste celles de
// l'antenne du user courant). Si ce n'est pas déjà le cas, dis-le-moi et je
// prépare le fix.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { ProjectProposal } from '../../../../types/project-proposal';
import { formatDate } from '../../../../lib/format';
import { ProposalSuperAdminActions } from '../../../../components/projects/ProposalSuperAdminActions';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExtendedProposal extends ProjectProposal {
  authorName?: string | null;
  estimatedBudget?: number | null;
  reviewComment?: string | null;
}

interface ReviewDialog {
  isOpen: boolean;
  proposalId: string;
  proposalTitle: string;
  action: 'approve' | 'reject';
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  SUBMITTED:   { label: 'Soumise',   color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  UNDER_REVIEW:{ label: 'En revue',  color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
  APPROVED:    { label: 'Approuvée', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981' },
  REJECTED:    { label: 'Rejetée',   color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
  CONVERTED_TO_PROJECT: { label: 'Convertie', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', dot: '#8B5CF6' },
};

const STATUS_FILTER_OPTIONS = [
  { value: '',             label: 'Tous les statuts' },
  { value: 'SUBMITTED',   label: 'Soumises' },
  { value: 'UNDER_REVIEW',label: 'En revue' },
  { value: 'APPROVED',    label: 'Approuvées' },
  { value: 'REJECTED',    label: 'Rejetées' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SuperAdminProjectProposalsPage() {
  const [items, setItems] = useState<ExtendedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ExtendedProposal | null>(null);
  const [reviewDialog, setReviewDialog] = useState<ReviewDialog | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  // 🔥 CORRIGÉ : ESLint react-hooks/set-state-in-effect — `load` était un
  // async/await direct, ce qui exécute setLoading(true) de façon synchrone
  // au moment où l'effet l'invoque. Remplacé par une chaîne
  // .then()/.catch()/.finally() explicite (même pattern que
  // super-admin/projects/page.tsx et admin/projects/page.tsx) : aucun
  // setState ne s'exécute plus de façon synchrone dans le corps de l'effet.
  const load = useCallback(() => {
    return Promise.resolve()
      .then(() => setLoading(true))
      .then(() => api.listProjectProposals({
        page: 1,
        pageSize: 100,
        status: statusFilter || undefined,
      }))
      .then((res) => {
        setItems((res?.items as unknown as ExtendedProposal[]) || []);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur chargement');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.authorName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const total     = items.length;
  const submitted = items.filter(i => i.status === 'SUBMITTED').length;
  const pending   = items.filter(i => i.status === 'UNDER_REVIEW').length;
  const approved  = items.filter(i => i.status === 'APPROVED' || i.status === 'CONVERTED_TO_PROJECT').length;
  const rejected  = items.filter(i => i.status === 'REJECTED').length;

  async function handleReview(action: 'approve' | 'reject') {
    if (!reviewDialog) return;
    if (action === 'reject' && !reviewComment.trim()) {
      setReviewError('Un motif est requis pour rejeter.');
      return;
    }
    setReviewError(null);
    setBusyId(reviewDialog.proposalId);
    try {
      if (action === 'approve') {
        await api.approveProjectProposal(reviewDialog.proposalId, { reviewComment: reviewComment.trim() || undefined });
      } else {
        await api.rejectProjectProposal(reviewDialog.proposalId, { reviewComment: reviewComment.trim() });
      }
      setReviewDialog(null);
      setReviewComment('');
      setSelectedProposal(null);
      void load();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="Propositions de projets">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

        @keyframes ppin { to { opacity:1; transform:translateY(0); } }
        @keyframes ppspin { to { transform:rotate(360deg); } }
        @keyframes fadein { from{opacity:0} to{opacity:1} }
        @keyframes modalPop { from{opacity:0;transform:scale(.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }

        .pp-wrap { font-family:'DM Sans',sans-serif; padding:clamp(1.1rem,3vw,2rem); max-width:1000px; margin:0 auto; }

        .pp-header { display:flex; align-items:flex-end; justify-content:space-between; gap:.5rem; margin-bottom:1.5rem; opacity:0; transform:translateY(10px); animation:ppin .5s .04s cubic-bezier(.22,1,.36,1) forwards; flex-wrap:wrap; }
        .pp-eyebrow { font-size:.67rem; font-weight:900; letter-spacing:.14em; text-transform:uppercase; color:#DC2626; margin-bottom:.3rem; display:flex; align-items:center; gap:.4rem; }
        .pp-dot { width:6px; height:6px; background:#EF4444; border-radius:50%; }
        .pp-title { font-family:'Cormorant Garamond',serif; font-size:clamp(1.4rem,3vw,1.85rem); font-weight:700; color:#111827; letter-spacing:-.02em; line-height:1.15; margin:0; }
        .pp-title span { background:linear-gradient(135deg,#991B1B,#DC2626); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

        .pp-panel { background:rgba(253,253,255,.94); backdrop-filter:blur(14px); border-radius:22px; border:1px solid rgba(220,38,38,.09); box-shadow:0 2px 16px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset; overflow:hidden; opacity:0; transform:translateY(10px); animation:ppin .5s .09s cubic-bezier(.22,1,.36,1) forwards; }
        .pp-panel-head { padding:.9rem 1.3rem; border-bottom:1px solid rgba(0,0,0,.03); display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
        .pp-panel-ico { width:27px; height:27px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pp-panel-title { font-size:.73rem; font-weight:900; letter-spacing:.09em; text-transform:uppercase; color:#1F2937; }
        .pp-count-chip { font-size:.67rem; font-weight:900; padding:.2rem .58rem; border-radius:99px; background:#FEF2F2; color:#B91C1C; border:1px solid #FECACA; }

        /* Stats */
        .pp-stat-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:.75rem; padding:1.25rem; border-bottom:1px solid rgba(0,0,0,.04); background:#FAFBFF; }
        .pp-stat-card { background:white; border:1px solid #E2E8F0; border-radius:14px; padding:1rem .5rem; text-align:center; position:relative; overflow:hidden; transition:transform .2s; }
        .pp-stat-card:hover { transform:translateY(-2px); }
        .pp-stat-bar { position:absolute; top:0; left:0; right:0; height:4px; }
        .pp-stat-val { display:block; font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:700; color:#0F172A; margin-bottom:.2rem; }
        .pp-stat-lbl { display:block; font-size:.62rem; font-weight:900; text-transform:uppercase; color:#94A3B8; letter-spacing:.05em; }

        /* Filtres */
        .pp-filter-row { display:flex; gap:.55rem; align-items:center; flex-wrap:wrap; padding:.8rem 1.3rem; border-bottom:1px solid rgba(0,0,0,.03); }
        .pp-finput { height:38px; border-radius:9px; border:1px solid rgba(220,38,38,.14); padding:0 .8rem; font-family:'DM Sans',sans-serif; font-size:.8rem; font-weight:600; color:#111827; outline:none; flex:1 1 200px; min-width:150px; background:rgba(255,255,255,.88); transition:border-color .2s,box-shadow .2s; }
        .pp-finput:focus { border-color:rgba(220,38,38,.4); box-shadow:0 0 0 3px rgba(220,38,38,.08); }
        .pp-fselect { height:38px; border-radius:9px; border:1px solid rgba(220,38,38,.14); background:white; padding:0 1.8rem 0 .7rem; font-family:'DM Sans',sans-serif; font-size:.8rem; font-weight:700; color:#111827; outline:none; appearance:none; cursor:pointer; flex:0 1 auto; background-image:url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right .55rem center; }
        .pp-reload-btn { height:38px; padding:0 .85rem; background:rgba(254,242,242,.8); border:1.5px solid rgba(220,38,38,.18); border-radius:9px; cursor:pointer; color:#991B1B; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:800; display:flex; align-items:center; gap:.32rem; flex:0 0 auto; transition:all .18s; }
        .pp-reload-btn:hover { background:rgba(254,226,226,.8); }

        /* Liste cartes */
        .pp-list { padding:1.25rem; display:flex; flex-direction:column; gap:1rem; background:#FAFAFA; }
        .pp-card { background:rgba(255,241,242,.35); border:1px solid rgba(254,202,202,.8); border-left:4px solid #EF4444; border-radius:18px; padding:1.25rem; cursor:pointer; display:flex; flex-direction:column; gap:.9rem; transition:all .22s; }
        .pp-card:hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(220,38,38,.08); background:rgba(255,241,242,.6); }
        .pp-card.approved { border-left-color:#10B981; background:rgba(236,253,245,.35); border-color:rgba(167,243,208,.8); }
        .pp-card.rejected { border-left-color:#6B7280; background:rgba(249,250,251,.35); border-color:rgba(229,231,235,.8); opacity:.75; }
        .pp-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:.75rem; }
        .pp-card-title { font-family:'Cormorant Garamond',serif; font-size:1.4rem; font-weight:700; color:#0F172A; line-height:1.2; flex:1; margin:0; }
        .pp-card-date { font-size:.72rem; color:#94A3B8; font-weight:700; display:flex; align-items:center; gap:.35rem; margin-bottom:.25rem; }
        .pp-card-author { font-size:.78rem; color:#374151; font-weight:600; display:flex; align-items:center; gap:.35rem; }
        .pp-card-divider { border:none; border-top:1.5px dotted rgba(254,202,202,.8); }
        .pp-card.approved .pp-card-divider { border-top-color:rgba(167,243,208,.8); }
        .pp-card.rejected .pp-card-divider { border-top-color:#E5E7EB; }
        .pp-status-badge { display:inline-flex; align-items:center; gap:.35rem; padding:.25rem .65rem; border-radius:99px; font-size:.65rem; font-weight:700; border:1px solid; white-space:nowrap; }
        .pp-status-dot { width:6px; height:6px; border-radius:50%; }
        .pp-card-actions { display:flex; gap:.5rem; flex-wrap:wrap; }
        .pp-approve-btn { height:34px; padding:0 1rem; background:linear-gradient(135deg,#047857,#059669); border:none; color:white; border-radius:9px; font-family:'DM Sans',sans-serif; font-size:.75rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:.35rem; transition:all .18s; box-shadow:0 3px 8px rgba(5,150,105,.25); }
        .pp-approve-btn:hover { transform:translateY(-1px); }
        .pp-reject-btn { height:34px; padding:0 1rem; background:white; border:1.5px solid #FECACA; color:#DC2626; border-radius:9px; font-family:'DM Sans',sans-serif; font-size:.75rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:.35rem; transition:all .18s; }
        .pp-reject-btn:hover { background:#FEF2F2; }
        .pp-approve-btn:disabled,.pp-reject-btn:disabled { opacity:.5; cursor:not-allowed; }

        /* Modal détail */
        .pp-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(4px); z-index:999; display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadein .2s ease; }
        .pp-modal-content { background:white; width:100%; max-width:560px; border-radius:24px; box-shadow:0 20px 40px rgba(0,0,0,.2); overflow:hidden; animation:modalPop .3s cubic-bezier(.2,.8,.2,1); max-height:90vh; display:flex; flex-direction:column; }
        .pp-modal-header { padding:1.5rem; border-bottom:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; }
        .pp-modal-body { padding:1.5rem; overflow-y:auto; display:flex; flex-direction:column; gap:1.25rem; }
        .pp-modal-footer { padding:1.25rem 1.5rem; border-top:1px solid #E2E8F0; display:flex; gap:.75rem; flex-wrap:wrap; }
        .pp-modal-close { width:34px; height:34px; border-radius:10px; background:#F1F5F9; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#6B7280; transition:all .2s; flex-shrink:0; }
        .pp-modal-close:hover { background:#E2E8F0; }
        .pp-detail-block { background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:1rem; }
        .pp-detail-lbl { font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:#6B7280; margin-bottom:.4rem; }
        .pp-detail-txt { font-size:.88rem; color:#0F172A; line-height:1.65; white-space:pre-wrap; }

        /* Dialog review */
        .pp-review-overlay { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadein .2s ease; }
        .pp-review-card { background:white; width:100%; max-width:440px; border-radius:20px; box-shadow:0 25px 50px -12px rgba(0,0,0,.25); padding:1.5rem; animation:modalPop .3s cubic-bezier(.2,.8,.2,1); }

        .pp-loader { display:flex; align-items:center; justify-content:center; padding:3rem; gap:.7rem; color:#6B7280; font-size:.82rem; }
        .pp-ring { width:22px; height:22px; border:2.5px solid rgba(220,38,38,.1); border-top-color:#DC2626; border-radius:50%; animation:ppspin .8s linear infinite; }
        .pp-empty { display:flex; flex-direction:column; align-items:center; padding:3rem 1rem; gap:.65rem; color:#9CA3AF; }

        @media(max-width:640px) {
          .pp-stat-grid { grid-template-columns:repeat(2,1fr) !important; }
          .pp-stat-grid > :last-child { grid-column:span 2; }
          .pp-stat-val { font-size:1.3rem; }
        }
        @media(max-width:500px) {
          .pp-filter-row { flex-wrap:wrap; }
          .pp-finput { flex:1 1 100%; }
          .pp-fselect { flex:1 1 100%; }
        }
      `}</style>

      <div className="pp-wrap">

        {/* HEADER */}
        <div className="pp-header">
          <div>
            <div className="pp-eyebrow"><div className="pp-dot" />Super Admin</div>
            <h1 className="pp-title">Propositions de <span>projets</span></h1>
          </div>
        </div>

        <div className="pp-panel">
          <div className="pp-panel-head">
            <div className="pp-panel-ico" style={{ background: '#FEF2F2' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="pp-panel-title">Propositions reçues — toutes les antennes</span>
            {items.length > 0 && <span className="pp-count-chip">{items.length}</span>}
          </div>

          {/* STATS */}
          <div className="pp-stat-grid">
            {[
              { label: 'Total',     count: total,     color: '#374151' },
              { label: 'Soumises',  count: submitted, color: '#B45309' },
              { label: 'En revue',  count: pending,   color: '#1D4ED8' },
              { label: 'Approuvées',count: approved,  color: '#059669' },
              { label: 'Rejetées', count: rejected,   color: '#B91C1C' },
            ].map(c => (
              <div key={c.label} className="pp-stat-card">
                <div className="pp-stat-bar" style={{ background: c.color }} />
                <span className="pp-stat-val">{c.count}</span>
                <span className="pp-stat-lbl">{c.label}</span>
              </div>
            ))}
          </div>

          {/* FILTRES */}
          <div className="pp-filter-row">
            <input
              className="pp-finput"
              placeholder="Rechercher par titre ou membre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="pp-fselect" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button className="pp-reload-btn" onClick={() => void load()}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Actualiser
            </button>
          </div>

          {/* LISTE */}
          <div className="pp-list">
            {loading ? (
              <div className="pp-loader"><div className="pp-ring" />Chargement…</div>
            ) : error ? (
              <div style={{ padding: '1.5rem', color: '#DC2626', fontSize: '.85rem', fontWeight: 700 }}>{error}</div>
            ) : filtered.length === 0 ? (
              <div className="pp-empty">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3"><path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#374151' }}>Aucune proposition reçue</div>
                <div style={{ fontSize: '.75rem' }}>Les propositions soumises par les membres apparaîtront ici.</div>
              </div>
            ) : (
              filtered.map((p, i) => {
                const meta = STATUS_META[p.status] ?? STATUS_META['SUBMITTED'];
                const isPending = p.status === 'SUBMITTED' || p.status === 'UNDER_REVIEW';
                const cardClass = p.status === 'APPROVED' || p.status === 'CONVERTED_TO_PROJECT' ? ' approved' : p.status === 'REJECTED' ? ' rejected' : '';
                const isBusy = busyId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`pp-card${cardClass}`}
                    style={{ animationDelay: `${i * 0.04}s`, opacity: 0, animation: `ppin 0.4s ${i * 0.04}s ease both` }}
                    onClick={() => setSelectedProposal(p)}
                  >
                    <div className="pp-card-top">
                      <div style={{ flex: 1 }}>
                        <div className="pp-card-date">
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                          {formatDate(p.createdAt)}
                        </div>
                        <h3 className="pp-card-title">{p.title}</h3>
                      </div>
                      <span className="pp-status-badge" style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}>
                        <span className="pp-status-dot" style={{ background: meta.dot }} />
                        {meta.label}
                      </span>
                    </div>

                    {/* Auteur */}
                    {p.authorName && (
                      <div className="pp-card-author">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <span style={{ color: '#6B7280', fontWeight: 500 }}>Proposé par</span>
                        <strong style={{ color: '#111827' }}>{p.authorName}</strong>
                      </div>
                    )}

                    <hr className="pp-card-divider" />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
                      <div>
                        <div style={{ fontSize: '.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6B7280', marginBottom: '.25rem' }}>Budget estimé</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '1.05rem', fontWeight: 700, color: '#1D4ED8', background: 'white', display: 'inline-block', padding: '.2rem .5rem', borderRadius: 6, border: '1px solid #E0E7FF' }}>
                          {(p.estimatedBudget ?? p.expectedBudget) != null
                            ? `${Number(p.estimatedBudget ?? p.expectedBudget).toLocaleString('fr-FR')} ${p.currency ?? ''}`
                            : 'Non défini'}
                        </div>
                      </div>

                      {isPending && (
                        <div className="pp-card-actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="pp-approve-btn"
                            disabled={isBusy}
                            onClick={() => { setReviewDialog({ isOpen: true, proposalId: p.id, proposalTitle: p.title, action: 'approve' }); setReviewComment(''); }}
                          >
                            {isBusy ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} /> : (
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            )}
                            Approuver
                          </button>
                          <button
                            className="pp-reject-btn"
                            disabled={isBusy}
                            onClick={() => { setReviewDialog({ isOpen: true, proposalId: p.id, proposalTitle: p.title, action: 'reject' }); setReviewComment(''); }}
                          >
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL DÉTAIL */}
      {selectedProposal && !reviewDialog && (
        <div className="pp-modal-overlay" onClick={() => setSelectedProposal(null)}>
          <div className="pp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="pp-modal-header">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginBottom: '.6rem', flexWrap: 'wrap' }}>
                  <span className="pp-status-badge" style={{ background: STATUS_META[selectedProposal.status]?.bg, color: STATUS_META[selectedProposal.status]?.color, borderColor: STATUS_META[selectedProposal.status]?.border }}>
                    {STATUS_META[selectedProposal.status]?.label}
                  </span>
                  {selectedProposal.authorName && (
                    <span style={{ fontSize: '.75rem', color: '#6B7280', fontWeight: 600 }}>par {selectedProposal.authorName}</span>
                  )}
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.7rem', fontWeight: 700, margin: 0, color: '#0F172A', lineHeight: 1.2 }}>
                  {selectedProposal.title}
                </h2>
              </div>
              <button className="pp-modal-close" onClick={() => setSelectedProposal(null)}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="pp-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="pp-detail-block">
                  <div className="pp-detail-lbl">Budget estimé</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '1.15rem', fontWeight: 700, color: '#1D4ED8' }}>
                    {(selectedProposal.estimatedBudget ?? selectedProposal.expectedBudget) != null
                      ? `${Number(selectedProposal.estimatedBudget ?? selectedProposal.expectedBudget).toLocaleString('fr-FR')} ${selectedProposal.currency ?? ''}`
                      : 'Non défini'}
                  </div>
                </div>
                <div className="pp-detail-block">
                  <div className="pp-detail-lbl">Date de soumission</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.88rem', fontWeight: 700, color: '#374151' }}>{formatDate(selectedProposal.createdAt)}</div>
                </div>
              </div>

              <div>
                <div className="pp-detail-lbl" style={{ marginBottom: '.6rem' }}>Description</div>
                <div className="pp-detail-txt">{selectedProposal.description}</div>
              </div>

              {selectedProposal.reviewComment && (
                <div className="pp-detail-block" style={{ background: selectedProposal.status === 'APPROVED' ? '#ECFDF5' : '#FEF2F2', borderColor: selectedProposal.status === 'APPROVED' ? '#A7F3D0' : '#FECACA' }}>
                  <div className="pp-detail-lbl">Commentaire de revue</div>
                  <div className="pp-detail-txt">{selectedProposal.reviewComment}</div>
                </div>
              )}

              {/* 🔥 AJOUT : boutons Modifier/Supprimer — cette page est déjà
                  réservée Super Admin/System Admin par le layout protégé, donc
                  isSuperAdmin est fixé à true (pas besoin de re-vérifier le
                  rôle ici). Fonctionne quel que soit le statut de la
                  proposition. */}
              <ProposalSuperAdminActions
                proposal={{
                  id: selectedProposal.id,
                  title: selectedProposal.title,
                  description: selectedProposal.description,
                  estimatedBudget: selectedProposal.estimatedBudget ?? selectedProposal.expectedBudget ?? null,
                  status: selectedProposal.status,
                }}
                isSuperAdmin={true}
                onClose={() => setSelectedProposal(null)}
                onChanged={() => void load()}
              />
            </div>

            {(selectedProposal.status === 'SUBMITTED' || selectedProposal.status === 'UNDER_REVIEW') && (
              <div className="pp-modal-footer">
                <button
                  className="pp-approve-btn"
                  style={{ flex: 1, height: 42, justifyContent: 'center', fontSize: '.82rem' }}
                  disabled={busyId === selectedProposal.id}
                  onClick={() => { setReviewDialog({ isOpen: true, proposalId: selectedProposal.id, proposalTitle: selectedProposal.title, action: 'approve' }); setReviewComment(''); }}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Approuver & créer le projet
                </button>
                <button
                  className="pp-reject-btn"
                  style={{ flex: 1, height: 42, justifyContent: 'center', fontSize: '.82rem' }}
                  disabled={busyId === selectedProposal.id}
                  onClick={() => { setReviewDialog({ isOpen: true, proposalId: selectedProposal.id, proposalTitle: selectedProposal.title, action: 'reject' }); setReviewComment(''); }}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  Rejeter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIALOG REVUE */}
      {reviewDialog?.isOpen && (
        <div className="pp-review-overlay" onClick={() => setReviewDialog(null)}>
          <div className="pp-review-card" onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: reviewDialog.action === 'approve' ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${reviewDialog.action === 'approve' ? '#A7F3D0' : '#FECACA'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              {reviewDialog.action === 'approve' ? (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, margin: '0 0 .25rem', color: '#0F172A', textAlign: 'center' }}>
              {reviewDialog.action === 'approve' ? 'Approuver la proposition' : 'Rejeter la proposition'}
            </h3>
            <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', margin: '0 0 1.2rem', lineHeight: 1.45 }}>
              <strong style={{ color: '#111827' }}>{reviewDialog.proposalTitle}</strong>
              {reviewDialog.action === 'approve' && <><br /><span style={{ fontSize: '.75rem' }}>Un projet officiel sera automatiquement créé.</span></>}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#374151', marginBottom: '.4rem' }}>
                {reviewDialog.action === 'reject' ? <>Motif du refus <span style={{ color: '#EF4444' }}>*</span></> : 'Commentaire (optionnel)'}
              </label>
              <textarea
                value={reviewComment}
                onChange={e => { setReviewComment(e.target.value); setReviewError(null); }}
                placeholder={reviewDialog.action === 'reject' ? 'Expliquez pourquoi cette proposition est rejetée…' : 'Message de félicitations ou instructions supplémentaires…'}
                style={{ width: '100%', minHeight: 90, borderRadius: 10, border: `1px solid ${reviewError ? '#FECACA' : '#E2E8F0'}`, padding: '.75rem .9rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.55 }}
              />
              {reviewError && <div style={{ fontSize: '.72rem', color: '#DC2626', fontWeight: 700, marginTop: '.3rem' }}>{reviewError}</div>}
            </div>

            <div style={{ display: 'flex', gap: '.6rem' }}>
              <button onClick={() => setReviewDialog(null)} disabled={busyId !== null} style={{ flex: 1, height: 40, borderRadius: 10, border: '1px solid #D1D5DB', background: '#F9FAFB', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
                Annuler
              </button>
              <button
                onClick={() => void handleReview(reviewDialog.action)}
                disabled={busyId !== null}
                style={{ flex: 2, height: 40, borderRadius: 10, border: 'none', background: reviewDialog.action === 'approve' ? 'linear-gradient(135deg,#047857,#059669)' : 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: busyId !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', opacity: busyId !== null ? 0.7 : 1 }}
              >
                {busyId !== null && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} />}
                {reviewDialog.action === 'approve' ? 'Confirmer l\'approbation' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
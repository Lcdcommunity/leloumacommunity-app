// web/components/projects/ProposalSuperAdminActions.tsx
// v1.0 — NOUVEAU FICHIER
// 🔥 NOUVEAU : composant isolé, ne modifie aucun fichier existant.
// À intégrer dans le modal de détail d'une proposition (celui qui affiche
// "Approuvée / par ... / Budget estimé / Date de soumission / Description").
//
// Intégration minimale dans le modal existant (2 lignes) :
//
//   import { ProposalSuperAdminActions } from '../../../components/projects/ProposalSuperAdminActions';
//   ...
//   <ProposalSuperAdminActions
//     proposal={proposal}          // { id, title, description, estimatedBudget, status }
//     isSuperAdmin={user?.role === 'SUPER_ADMIN' || user?.role === 'SYSTEM_ADMIN'}
//     onClose={onClose}            // ferme le modal de détail (utilisé après suppression)
//     onChanged={() => void reload()} // recharge la liste des propositions
//   />
//
// 🔥 v1.1 : les boutons s'affichent désormais quel que soit le statut de la
// proposition (y compris Approuvée/Rejetée) — seule condition : isSuperAdmin.
'use client';

import { useState } from 'react';
import { projectProposalsAdminApi } from '../../lib/project-proposals-admin-client';

export interface ProposalForAdminActions {
  id: string;
  title: string;
  description?: string | null;
  estimatedBudget?: number | null;
  status: string;
}

const BTN_BASE: React.CSSProperties = {
  height: 38,
  padding: '0 1rem',
  borderRadius: 10,
  fontFamily: "'DM Sans',sans-serif",
  fontSize: '.78rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.4rem',
};

export function ProposalSuperAdminActions({
  proposal,
  isSuperAdmin,
  onClose,
  onChanged,
}: {
  proposal: ProposalForAdminActions;
  isSuperAdmin: boolean;
  onClose?: () => void;
  onChanged?: () => void;
}) {
  const [mode, setMode] = useState<'idle' | 'editing' | 'deleting'>('idle');
  const [title, setTitle] = useState(proposal.title);
  const [description, setDescription] = useState(proposal.description ?? '');
  const [estimatedBudget, setEstimatedBudget] = useState(
    proposal.estimatedBudget != null ? String(proposal.estimatedBudget) : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSuperAdmin) {
    return null;
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      await projectProposalsAdminApi.updateProposalSuperAdmin(proposal.id, {
        title,
        description,
        estimatedBudget: estimatedBudget ? Number(estimatedBudget) : null,
      });
      setMode('idle');
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      await projectProposalsAdminApi.deleteProposalSuperAdmin(proposal.id);
      setMode('idle');
      onChanged?.();
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '.55rem', marginTop: '.75rem' }}>
        <button
          type="button"
          onClick={() => { setError(null); setMode('editing'); }}
          style={{ ...BTN_BASE, background: 'white', border: '1.5px solid #CBD5E1', color: '#1D4ED8' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Modifier
        </button>
        <button
          type="button"
          onClick={() => { setError(null); setMode('deleting'); }}
          style={{ ...BTN_BASE, background: 'rgba(254,242,242,.8)', border: '1.5px solid rgba(220,38,38,.2)', color: '#DC2626' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Supprimer
        </button>
      </div>

      {mode === 'editing' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(5px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => !submitting && setMode('idle')}>
          <div
            style={{ width: '100%', maxWidth: 460, background: 'white', borderRadius: 20, padding: '1.5rem', boxShadow: '0 25px 50px rgba(15,23,42,.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 1rem' }}>
              Modifier la proposition
            </h3>

            {error && (
              <div style={{ padding: '.6rem .8rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, color: '#B91C1C', fontSize: '.78rem', fontWeight: 700, marginBottom: '.8rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gap: '.8rem' }}>
              <div>
                <label style={{ fontSize: '.68rem', fontWeight: 900, color: '#374151', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '.3rem' }}>Titre</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(37,99,235,.15)', padding: '0 .8rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 600, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '.68rem', fontWeight: 900, color: '#374151', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '.3rem' }}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', minHeight: 100, borderRadius: 10, border: '1px solid rgba(37,99,235,.15)', padding: '.6rem .8rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 600, boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '.68rem', fontWeight: 900, color: '#374151', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '.3rem' }}>Budget estimé (GNF)</label>
                <input
                  type="number"
                  min="0"
                  value={estimatedBudget}
                  onChange={(e) => setEstimatedBudget(e.target.value)}
                  placeholder="Non défini"
                  style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(37,99,235,.15)', padding: '0 .8rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 600, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '.55rem', marginTop: '1.2rem' }}>
              <button type="button" onClick={() => setMode('idle')} disabled={submitting} style={{ flex: 1, height: 42, borderRadius: 10, border: '1px solid #D1D5DB', background: '#F9FAFB', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
                Annuler
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={submitting} style={{ flex: 1, height: 42, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? .7 : 1 }}>
                {submitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'deleting' && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 500 }} onClick={() => !submitting && setMode('idle')} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 501, background: 'rgba(255,255,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(430px,calc(100vw - 2rem))', border: '1px solid rgba(220,38,38,.15)', boxShadow: '0 24px 60px rgba(15,23,42,.18)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .9rem' }}>
              <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.25rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '.35rem' }}>Supprimer cette proposition&nbsp;?</h2>
            <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.2rem', fontWeight: 600, lineHeight: 1.55 }}>
              <strong style={{ color: '#111827' }}>{proposal.title}</strong> sera supprimée définitivement.
            </p>
            {error && (
              <div style={{ padding: '.6rem .8rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, color: '#B91C1C', fontSize: '.78rem', fontWeight: 700, marginBottom: '.9rem', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '.55rem', justifyContent: 'center' }}>
              <button onClick={() => setMode('idle')} disabled={submitting} style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid #D1D5DB', background: '#F9FAFB', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => void handleDelete()} disabled={submitting} style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
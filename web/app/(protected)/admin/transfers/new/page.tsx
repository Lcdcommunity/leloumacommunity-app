// web/app/(protected)/admin/transfers/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

type SenderInfo  = { antennaId: string; antennaName: string; currency: string };
type DestAntenna = { id: string; name: string; defaultCurrency: string; city?: string | null };

const SYM: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', GNF: 'GNF', XOF: 'FCFA', CAD: 'CA$', CHF: 'CHF',
};

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E2E8F0', borderRadius: 10,
  padding: '.75rem 1rem', fontSize: '.9rem', color: '#0F172A',
  boxSizing: 'border-box', fontFamily: 'inherit',
  background: '#fff', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '.75rem', fontWeight: 700, color: '#374151',
  display: 'block', marginBottom: 6, letterSpacing: '.04em',
};

export default function NewTransferPage() {
  const router = useRouter();

  const [sender, setSender]         = useState<SenderInfo | null>(null);
  const [dests, setDests]           = useState<DestAntenna[]>([]);
  const [destId, setDestId]         = useState('');
  const [sendAmt, setSendAmt]       = useState('');
  const [recvAmt, setRecvAmt]       = useState('');
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    void (async () => {
      const [s, d] = await Promise.all([
        api.getTransferSenderInfo(),
        api.getTransferDestinations(),
      ]);
      setSender(s as SenderInfo);
      setDests(d as DestAntenna[]);
    })();
  }, []);

  const dest       = dests.find(d => d.id === destId);
  const btnEnabled = !submitting && !!destId && !!sendAmt && !!recvAmt && +sendAmt > 0 && +recvAmt > 0;

  const handleSubmit = async () => {
    if (!destId || !sendAmt || !recvAmt) { setError('Tous les champs sont obligatoires.'); return; }
    if (+sendAmt <= 0 || +recvAmt <= 0)  { setError('Les montants doivent être positifs.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.createTransfer({
        receiverAntennaId: destId,
        sendAmount: +sendAmt,
        receiveAmount: +recvAmt,
        notes: notes.trim() || undefined,
      });
      router.push('/admin/transfers');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 600, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── En-tête ── */}
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B',
                 fontSize: '.875rem', padding: 0, marginBottom: 12, fontFamily: 'inherit',
                 display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ← Retour
      </button>
      <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em',
                  textTransform: 'uppercase', color: '#2563EB', marginBottom: 4 }}>
        ADMIN ANTENNE
      </p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', margin: '0 0 1.5rem' }}>
        Nouveau <span style={{ color: '#2563EB' }}>Virement</span>
      </h1>

      {/* ── Formulaire card ── */}
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,.07)',
                    overflow: 'hidden' }}>

        {/* Header card */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9',
                      display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EFF6FF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '.95rem', color: '#0F172A' }}>
              Détails du virement
            </p>
            <p style={{ margin: 0, fontSize: '.78rem', color: '#94A3B8' }}>
              Les fonds seront soumis à validation
            </p>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>

          {/* Antenne expéditrice — readonly */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={labelStyle}>ANTENNE EXPÉDITRICE</span>
            <div style={{ ...inputStyle, background: '#F8FAFC', display: 'flex',
                          justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{sender?.antennaName ?? '—'}</span>
              <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '.18rem .55rem',
                             borderRadius: 99, background: '#EFF6FF', color: '#1D4ED8' }}>
                {sender?.currency ?? '—'}
              </span>
            </div>
          </div>

          {/* Grille 2 colonnes : Montant envoi + Antenne destination */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>
                MONTANT D&apos;ENVOI <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number" min="0.01" step="0.01"
                  value={sendAmt}
                  onChange={e => setSendAmt(e.target.value)}
                  placeholder="0"
                  style={{ ...inputStyle, paddingRight: '2.5rem', fontWeight: 700, fontSize: '1rem' }}
                />
                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                               color: '#94A3B8', fontWeight: 700, fontSize: '.85rem', pointerEvents: 'none' }}>
                  {sender ? (SYM[sender.currency] ?? sender.currency) : ''}
                </span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                ANTENNE DESTINATAIRE <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={destId}
                onChange={e => { setDestId(e.target.value); setRecvAmt(''); }}
                style={{ ...inputStyle, cursor: 'pointer', color: destId ? '#0F172A' : '#94A3B8' }}
              >
                <option value="">Sélectionner…</option>
                {dests.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.city ? ` — ${d.city}` : ''} ({d.defaultCurrency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Séparateur visuel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 1.25rem' }}>
            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#94A3B8', fontSize: '.9rem', fontWeight: 700, flexShrink: 0 }}>↓</div>
            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
          </div>

          {/* Montant réception */}
          <div style={{ marginBottom: '1.25rem', opacity: destId ? 1 : 0.45, transition: 'opacity .2s' }}>
            <label style={labelStyle}>
              MONTANT DE RÉCEPTION <span style={{ color: '#EF4444' }}>*</span>
              <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 4 }}>(à saisir manuellement)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0.01" step="1"
                value={recvAmt}
                onChange={e => setRecvAmt(e.target.value)}
                disabled={!destId}
                placeholder="0"
                style={{ ...inputStyle, paddingRight: '3.5rem', fontWeight: 700, fontSize: '1rem',
                         background: destId ? '#fff' : '#F8FAFC' }}
              />
              <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                             color: '#94A3B8', fontWeight: 700, fontSize: '.85rem', pointerEvents: 'none' }}>
                {dest ? (SYM[dest.defaultCurrency] ?? dest.defaultCurrency) : '—'}
              </span>
            </div>
            {dest && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: '.75rem', color: '#64748B' }}>Devise de réception :</span>
                <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '.18rem .55rem',
                               borderRadius: 99, background: '#ECFDF5', color: '#065F46' }}>
                  {dest.defaultCurrency}
                </span>
              </div>
            )}
          </div>

          {/* Remarques */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>
              DESCRIPTION / JUSTIFICATIF{' '}
              <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex. : Cotisations mois de juin…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
          </div>

          {/* Récapitulatif */}
          {sendAmt && recvAmt && dest && +sendAmt > 0 && +recvAmt > 0 && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12,
                          padding: '1rem', marginBottom: '1.25rem' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '.85rem', color: '#1D4ED8' }}>
                Récapitulatif
              </p>
              <p style={{ margin: 0, fontSize: '.875rem', color: '#374151', lineHeight: 1.6 }}>
                Envoi de{' '}
                <strong style={{ color: '#1D4ED8' }}>
                  {(+sendAmt).toLocaleString('fr-FR')} {sender?.currency}
                </strong>
                {' '}→ <strong>{dest.name}</strong> recevra{' '}
                <strong style={{ color: '#1D4ED8' }}>
                  {(+recvAmt).toLocaleString('fr-FR')} {dest.defaultCurrency}
                </strong>
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '.78rem', color: '#64748B' }}>
                Ce virement sera soumis à validation par l&apos;antenne destinataire.
              </p>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10,
                          padding: '.75rem 1rem', fontSize: '.875rem', color: '#DC2626',
                          marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {/* Boutons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.back()}
              style={{ flex: 1, padding: '.875rem', borderRadius: 12, border: '1px solid #E2E8F0',
                       background: '#fff', color: '#374151', fontSize: '.9rem', fontWeight: 600,
                       cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Annuler
            </button>
            <button
              disabled={!btnEnabled}
              onClick={handleSubmit}
              style={{ flex: 2, padding: '.875rem', borderRadius: 12, border: 'none',
                       color: '#fff', fontSize: '.9rem', fontWeight: 700,
                       fontFamily: 'inherit', cursor: btnEnabled ? 'pointer' : 'not-allowed',
                       background: btnEnabled ? '#2563EB' : '#93C5FD',
                       boxShadow: btnEnabled ? '0 4px 14px rgba(37,99,235,.35)' : 'none',
                       transition: 'all .15s' }}
            >
              {submitting ? 'Envoi en cours…' : 'Envoyer le virement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
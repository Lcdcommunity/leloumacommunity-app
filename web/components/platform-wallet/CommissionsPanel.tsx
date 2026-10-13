// web/components/platform-wallet/CommissionsPanel.tsx
//
// v1.0 — Commissions envoyées à la plateforme (Grand Chef) par virement.
//   • Admin d'antenne : formulaire d'envoi + historique + annulation d'un virement en attente.
//   • Super admin     : mêmes données en LECTURE SEULE (readOnly) — pas de bouton de virement.
//
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  newIdempotencyKey,
  platformWalletApi,
  type CommissionOptions,
  type CurrencyCode,
  type PlatformTransfer,
} from '../../lib/platform-wallet-api';
import { Alert, btn, card, CUR_FLAG, dateFr, Empty, input, label, money, PAGE_CSS, StatusPill } from './ui';

const ACCENT = '#2563EB';
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Une erreur est survenue.');

export function CommissionsPanel({ readOnly }: { readOnly: boolean }) {
  const [opts, setOpts] = useState<CommissionOptions | null>(null);
  const [items, setItems] = useState<PlatformTransfer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  // Formulaire
  const [antennaId, setAntennaId] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [idemKey, setIdemKey] = useState(newIdempotencyKey);

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  // Chargement (options + 1re page) : refait à chaque changement de filtre ou après une action.
  useEffect(() => {
    let alive = true;
    Promise.all([
      platformWalletApi.commissionOptions(),
      platformWalletApi.listCommissions({ page: 1, pageSize: 10, status: status || undefined }),
    ])
      .then(([o, r]) => {
        if (!alive) return;
        setOpts(o);
        setAntennaId((cur) => cur || o.antennas[0]?.id || '');
        setCurrency((cur) => (o.currencies.includes(cur) ? cur : o.currencies[0] ?? 'EUR'));
        setItems(r.items);
        setPage(r.page);
        setTotalPages(r.totalPages);
      })
      .catch((e) => alive && setError(errMsg(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [status, tick]);

  async function loadMore() {
    try {
      const r = await platformWalletApi.listCommissions({ page: page + 1, pageSize: 10, status: status || undefined });
      setItems((prev) => [...prev, ...r.items]);
      setPage(r.page);
      setTotalPages(r.totalPages);
    } catch (e) {
      setError(errMsg(e));
    }
  }

  const antenna = useMemo(() => opts?.antennas.find((a) => a.id === antennaId), [opts, antennaId]);
  const bal = antenna?.balances.find((b) => b.currency === currency);
  const amountNum = Number(amount.replace(',', '.'));
  const tooMuch = !!bal && Number.isFinite(amountNum) && amountNum > Number(bal.available);
  const valid = Number.isFinite(amountNum) && amountNum > 0 && !tooMuch && !!antennaId;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true); setError(''); setFlash('');
    try {
      const t = await platformWalletApi.createCommission({
        senderAntennaId: antennaId,
        currency,
        amount: Math.round(amountNum * 100) / 100,
        periodLabel: period.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey: idemKey,
      });
      setIdemKey(newIdempotencyKey()); // nouvelle clé pour le prochain virement
      setAmount(''); setPeriod(''); setNotes('');
      setFlash(`Virement ${t.reference} envoyé. Il sera crédité à la plateforme dès sa validation.`);
      refresh();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!window.confirm('Annuler ce virement en attente ?')) return;
    setError(''); setFlash('');
    try {
      await platformWalletApi.cancelCommission(id);
      setFlash('Virement annulé.');
      refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <div className="pw-wrap">
      <style>{PAGE_CSS}</style>

      <p style={{ fontSize: '.7rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: ACCENT, margin: 0 }}>
        {readOnly ? 'Président · lecture seule' : 'Admin antenne'}
      </p>
      <h1 style={{ fontSize: 'clamp(1.35rem,3vw,1.7rem)', fontWeight: 800, color: '#0F172A', margin: '.2rem 0 .3rem' }}>
        Commissions <span style={{ color: ACCENT }}>plateforme</span>
      </h1>
      <p style={{ color: '#64748B', fontSize: '.88rem', margin: '0 0 1.2rem', maxWidth: 640 }}>
        {readOnly
          ? "Les commissions sont versées par les administrateurs d&apos;antenne, par virement tracé. Tu vois ici l&apos;historique de ton association."
          : "Verse ta commission à la plateforme par virement : le montant est débité de ton antenne dès que le Grand Chef valide, et chaque virement garde sa référence."}
      </p>

      {error && <Alert kind="error">{error}</Alert>}
      {flash && <Alert kind="success">{flash}</Alert>}

      {loading && !opts ? (
        <Empty>Chargement…</Empty>
      ) : (
        <>
          {/* Soldes disponibles par antenne */}
          {opts && opts.antennas.length > 0 && (
            <div className="pw-grid2" style={{ marginBottom: 18 }}>
              {opts.antennas.map((a) => (
                <div key={a.id} style={{ ...card, padding: '1rem 1.1rem', borderTop: `3px solid ${ACCENT}` }}>
                  <p style={{ margin: 0, fontWeight: 800, color: '#0F172A' }}>{a.name}</p>
                  <p style={{ margin: '2px 0 10px', fontSize: '.75rem', color: '#64748B', fontWeight: 600 }}>{a.city ?? a.associationName}</p>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {a.balances.map((b) => (
                      <div key={b.currency} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '.82rem' }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{CUR_FLAG[b.currency]} {b.currency}</span>
                        <span style={{ fontWeight: 800, color: '#0F172A' }}>
                          {money(b.available, b.currency)}
                          {Number(b.reserved) > 0 && <span style={{ color: '#B45309', fontWeight: 600 }}> · {money(b.reserved, b.currency)} en attente</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire (admin d'antenne uniquement) */}
          {!readOnly && opts?.canSend && opts.antennas.length > 0 && (
            <div style={{ ...card, padding: '1.2rem', marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>Nouveau virement de commission</h2>
              <div className="pw-grid2">
                {opts.antennas.length > 1 && (
                  <div>
                    <label style={label} htmlFor="pw-antenna">Antenne</label>
                    <select id="pw-antenna" style={input} value={antennaId} onChange={(e) => setAntennaId(e.target.value)}>
                      {opts.antennas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={label} htmlFor="pw-currency">Devise</label>
                  <select id="pw-currency" style={input} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                    {opts.currencies.map((c) => <option key={c} value={c}>{CUR_FLAG[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label} htmlFor="pw-amount">Montant</label>
                  <input id="pw-amount" style={{ ...input, borderColor: tooMuch ? '#EF4444' : '#E2E8F0' }} inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  {bal && (
                    <p style={{ margin: '4px 0 0', fontSize: '.72rem', fontWeight: 600, color: tooMuch ? '#B91C1C' : '#64748B' }}>
                      Disponible : {money(bal.available, currency)}
                    </p>
                  )}
                </div>
                <div>
                  <label style={label} htmlFor="pw-period">Période (facultatif)</label>
                  <input id="pw-period" style={input} maxLength={60} placeholder="Ex. Septembre 2026" value={period} onChange={(e) => setPeriod(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={label} htmlFor="pw-notes">Note (facultatif)</label>
                <input id="pw-notes" style={input} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div style={{ marginTop: 16 }}>
                <button type="button" onClick={submit} disabled={!valid || busy} style={btn(ACCENT, { disabled: !valid || busy })}>
                  {busy ? 'Envoi…' : 'Envoyer le virement'}
                </button>
              </div>
            </div>
          )}

          {/* Historique */}
          <div className="pw-row" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>Historique</h2>
            <select aria-label="Filtrer par statut" style={{ ...input, width: 'auto', minWidth: 170, height: 40 }} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="PENDING_VALIDATION">En attente</option>
              <option value="VALIDATED">Validés</option>
              <option value="REJECTED">Refusés</option>
              <option value="CANCELLED">Annulés</option>
            </select>
          </div>

          {items.length === 0 ? (
            <Empty>Aucun virement de commission pour le moment.</Empty>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {items.map((t) => (
                <div key={t.id} style={{ ...card, padding: '1rem 1.1rem' }}>
                  <div className="pw-row">
                    <div>
                      <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>{money(t.amount, t.currency)}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '.75rem', color: '#64748B', fontWeight: 600 }}>
                        {t.senderAntennaName} · {t.reference}
                      </p>
                    </div>
                    <StatusPill status={t.status} />
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '.78rem', color: '#475569' }}>
                    Envoyé le {dateFr(t.createdAt)} par {t.initiatedByName}
                    {t.periodLabel ? ` · ${t.periodLabel}` : ''}
                  </p>
                  {t.notes && <p style={{ margin: '4px 0 0', fontSize: '.78rem', color: '#64748B' }}>{t.notes}</p>}
                  {t.status === 'VALIDATED' && <p style={{ margin: '6px 0 0', fontSize: '.76rem', color: '#065F46', fontWeight: 700 }}>Validé le {dateFr(t.validatedAt)}</p>}
                  {t.status === 'REJECTED' && (
                    <p style={{ margin: '6px 0 0', fontSize: '.78rem', color: '#991B1B', fontWeight: 700 }}>Refusé : {t.rejectionReason}</p>
                  )}
                  {!readOnly && t.status === 'PENDING_VALIDATION' && (
                    <div style={{ marginTop: 10 }}>
                      <button type="button" onClick={() => cancel(t.id)} style={btn('#B91C1C', { ghost: true })}>Annuler ce virement</button>
                    </div>
                  )}
                </div>
              ))}
              {page < totalPages && (
                <div style={{ textAlign: 'center' }}>
                  <button type="button" style={btn(ACCENT, { ghost: true })} onClick={loadMore}>
                    Voir plus
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

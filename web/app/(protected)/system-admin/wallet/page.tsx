// web/app/(protected)/system-admin/wallet/page.tsx
//
// v1.0 — Console du Grand Chef : wallet de la plateforme (EUR / USD / GNF / XOF, devises paramétrables),
//   validation ou refus des commissions reçues, historique des mouvements, retrait / ajustement.
//   Cartes ombrées uniquement (jamais de tableau).
//
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import {
  ALL_CURRENCIES,
  newIdempotencyKey,
  platformWalletApi,
  type CurrencyCode,
  type PlatformTransfer,
  type WalletEntry,
  type WalletOverview,
} from '../../../../lib/platform-wallet-api';
import { Alert, btn, card, CUR_FLAG, dateFr, Empty, input, label, money, PAGE_CSS, StatusPill } from '../../../../components/platform-wallet/ui';

const ACCENT = '#7C3AED';
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Une erreur est survenue.');
const TYPE_LABEL: Record<WalletEntry['type'], string> = {
  COMMISSION_IN: 'Commission reçue',
  ADJUSTMENT_IN: 'Ajustement (+)',
  ADJUSTMENT_OUT: 'Ajustement (−)',
  WITHDRAWAL_OUT: 'Retrait',
};

type Tab = 'pending' | 'transfers' | 'entries';

export default function SystemWalletPage() {
  const [ov, setOv] = useState<WalletOverview | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<PlatformTransfer[]>([]);
  const [transfers, setTransfers] = useState<PlatformTransfer[]>([]);
  const [tPage, setTPage] = useState(1);
  const [tPages, setTPages] = useState(1);
  const [tStatus, setTStatus] = useState('');
  const [tCurrency, setTCurrency] = useState('');
  const [tQuery, setTQuery] = useState('');

  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [ePage, setEPage] = useState(1);
  const [ePages, setEPages] = useState(1);
  const [eCurrency, setECurrency] = useState('');

  const [rejecting, setRejecting] = useState<PlatformTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState('');
  const [showMove, setShowMove] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  // Chargement : soldes + à valider + 1re page des virements / mouvements (filtres inclus).
  useEffect(() => {
    let alive = true;
    Promise.all([
      platformWalletApi.overview(),
      platformWalletApi.listTransfers({ status: 'PENDING_VALIDATION', pageSize: 50 }),
      platformWalletApi.listTransfers({ page: 1, pageSize: 10, status: tStatus || undefined, currency: tCurrency || undefined, q: tQuery.trim() || undefined }),
      platformWalletApi.listEntries({ page: 1, pageSize: 15, currency: eCurrency || undefined }),
    ])
      .then(([o, pend, tr, en]) => {
        if (!alive) return;
        setOv(o); setPending(pend.items);
        setTransfers(tr.items); setTPage(tr.page); setTPages(tr.totalPages);
        setEntries(en.items); setEPage(en.page); setEPages(en.totalPages);
      })
      .catch((e) => alive && setError(errMsg(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tStatus, tCurrency, tQuery, eCurrency, tick]);

  async function moreTransfers() {
    try {
      const r = await platformWalletApi.listTransfers({ page: tPage + 1, pageSize: 10, status: tStatus || undefined, currency: tCurrency || undefined, q: tQuery.trim() || undefined });
      setTransfers((p) => [...p, ...r.items]); setTPage(r.page); setTPages(r.totalPages);
    } catch (e) { setError(errMsg(e)); }
  }
  async function moreEntries() {
    try {
      const r = await platformWalletApi.listEntries({ page: ePage + 1, pageSize: 15, currency: eCurrency || undefined });
      setEntries((p) => [...p, ...r.items]); setEPage(r.page); setEPages(r.totalPages);
    } catch (e) { setError(errMsg(e)); }
  }

  async function validate(t: PlatformTransfer) {
    if (!window.confirm(`Valider ${money(t.amount, t.currency)} de « ${t.senderAntennaName} » ?\nLe montant sera débité de l'antenne et crédité à ton wallet.`)) return;
    setBusyId(t.id); setError(''); setFlash('');
    try {
      await platformWalletApi.validateTransfer(t.id);
      setFlash(`Commission ${t.reference} validée : ${money(t.amount, t.currency)} crédités.`);
    } catch (e) { setError(errMsg(e)); }
    setBusyId('');
    refresh();
  }

  async function confirmReject() {
    if (!rejecting || rejectReason.trim().length < 3) return;
    setBusyId(rejecting.id); setError(''); setFlash('');
    try {
      await platformWalletApi.rejectTransfer(rejecting.id, rejectReason.trim());
      setFlash(`Commission ${rejecting.reference} refusée.`);
      setRejecting(null); setRejectReason('');
    } catch (e) { setError(errMsg(e)); }
    setBusyId('');
    refresh();
  }

  return (
    <AppShell title="Wallet Grand Chef">
      <style>{PAGE_CSS}</style>
      <div className="pw-wrap">
        <div className="pw-row" style={{ marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: '.7rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: ACCENT, margin: 0 }}>Console Grand Chef</p>
            <h1 style={{ fontSize: 'clamp(1.35rem,3vw,1.7rem)', fontWeight: 800, color: '#0F172A', margin: '.2rem 0 0' }}>
              Mon <span style={{ color: ACCENT }}>wallet</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={btn(ACCENT)} onClick={() => setShowMove(true)}>Retrait / ajustement</button>
            <button type="button" style={btn('#475569', { ghost: true })} onClick={() => setShowSettings(true)}>Devises</button>
          </div>
        </div>
        <p style={{ color: '#64748B', fontSize: '.88rem', margin: '0 0 1.2rem' }}>
          Toutes les commissions des antennes arrivent ici, par virement validé par toi — séparées de l&apos;argent des associations.
        </p>

        {error && <Alert kind="error">{error}</Alert>}
        {flash && <Alert kind="success">{flash}</Alert>}

        {loading && !ov ? <Empty>Chargement…</Empty> : (
          <>
            <div className="pw-grid4" style={{ marginBottom: 22 }}>
              {ov?.wallets.map((w) => (
                <div key={w.currency} style={{ ...card, padding: '1.1rem 1.2rem', borderTop: `3px solid ${ACCENT}`, opacity: w.active ? 1 : 0.7 }}>
                  <div className="pw-row">
                    <span style={{ fontWeight: 800, color: '#475569', fontSize: '.85rem' }}>{CUR_FLAG[w.currency]} {w.currency}</span>
                    {w.pendingCount > 0 && (
                      <span style={{ fontSize: '.68rem', fontWeight: 800, background: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', borderRadius: 99, padding: '.15rem .6rem' }}>
                        {w.pendingCount} à valider
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '10px 0 2px', fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', wordBreak: 'break-word' }}>{money(w.balance, w.currency)}</p>
                  <p style={{ margin: 0, fontSize: '.74rem', color: '#64748B', fontWeight: 600 }}>
                    Reçu {money(w.received, w.currency)} · Retiré {money(w.withdrawn, w.currency)}
                  </p>
                  {!w.active && <p style={{ margin: '6px 0 0', fontSize: '.7rem', color: '#B45309', fontWeight: 700 }}>Devise désactivée</p>}
                </div>
              ))}
            </div>

            {ov && ov.bySource.length > 0 && (
              <div style={{ ...card, padding: '1rem 1.1rem', marginBottom: 22 }}>
                <h2 style={{ margin: '0 0 10px', fontSize: '.95rem', fontWeight: 800, color: '#0F172A' }}>Commissions par association</h2>
                <div className="pw-grid2">
                  {ov.bySource.slice(0, 8).map((s) => (
                    <div key={`${s.associationId}${s.currency}`} style={{ background: '#F8FAFC', borderRadius: 12, padding: '.7rem .85rem' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '.84rem', color: '#0F172A' }}>{s.associationName}</p>
                      <p style={{ margin: '2px 0 0', fontWeight: 800, color: ACCENT }}>{money(s.total, s.currency)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pw-tabs" style={{ marginBottom: 14 }} role="tablist">
              <button className="pw-tab" role="tab" data-on={tab === 'pending' ? 1 : 0} onClick={() => setTab('pending')}>À valider ({pending.length})</button>
              <button className="pw-tab" role="tab" data-on={tab === 'transfers' ? 1 : 0} onClick={() => setTab('transfers')}>Tous les virements</button>
              <button className="pw-tab" role="tab" data-on={tab === 'entries' ? 1 : 0} onClick={() => setTab('entries')}>Mouvements du wallet</button>
            </div>

            {tab === 'pending' && (pending.length === 0 ? <Empty>Aucune commission en attente. 🎉</Empty> : (
              <div style={{ display: 'grid', gap: 12 }}>
                {pending.map((t) => (
                  <TransferCard key={t.id} t={t}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                      <button type="button" disabled={busyId === t.id} style={btn('#059669', { disabled: busyId === t.id })} onClick={() => validate(t)}>
                        {busyId === t.id ? '…' : 'Valider'}
                      </button>
                      <button type="button" disabled={busyId === t.id} style={btn('#B91C1C', { ghost: true, disabled: busyId === t.id })} onClick={() => { setRejecting(t); setRejectReason(''); }}>
                        Refuser
                      </button>
                    </div>
                  </TransferCard>
                ))}
              </div>
            ))}

            {tab === 'transfers' && (
              <>
                <div className="pw-grid2" style={{ marginBottom: 12 }}>
                  <input aria-label="Rechercher" style={input} placeholder="Référence, association, antenne…" value={tQuery} onChange={(e) => setTQuery(e.target.value)} />
                  <select aria-label="Statut" style={input} value={tStatus} onChange={(e) => setTStatus(e.target.value)}>
                    <option value="">Tous les statuts</option>
                    <option value="PENDING_VALIDATION">En attente</option>
                    <option value="VALIDATED">Validés</option>
                    <option value="REJECTED">Refusés</option>
                    <option value="CANCELLED">Annulés</option>
                  </select>
                  <select aria-label="Devise" style={input} value={tCurrency} onChange={(e) => setTCurrency(e.target.value)}>
                    <option value="">Toutes les devises</option>
                    {ov?.wallets.map((w) => <option key={w.currency} value={w.currency}>{w.currency}</option>)}
                  </select>
                </div>
                {transfers.length === 0 ? <Empty>Aucun virement.</Empty> : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {transfers.map((t) => <TransferCard key={t.id} t={t} />)}
                    {tPage < tPages && <div style={{ textAlign: 'center' }}><button type="button" style={btn(ACCENT, { ghost: true })} onClick={moreTransfers}>Voir plus</button></div>}
                  </div>
                )}
              </>
            )}

            {tab === 'entries' && (
              <>
                <div style={{ marginBottom: 12, maxWidth: 260 }}>
                  <select aria-label="Devise" style={input} value={eCurrency} onChange={(e) => setECurrency(e.target.value)}>
                    <option value="">Toutes les devises</option>
                    {ov?.wallets.map((w) => <option key={w.currency} value={w.currency}>{w.currency}</option>)}
                  </select>
                </div>
                {entries.length === 0 ? <Empty>Aucun mouvement.</Empty> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {entries.map((e) => (
                      <div key={e.id} style={{ ...card, padding: '.85rem 1rem' }}>
                        <div className="pw-row">
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: '.9rem', color: '#0F172A' }}>{e.title}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '.74rem', color: '#64748B', fontWeight: 600 }}>
                              {TYPE_LABEL[e.type]} · {dateFr(e.effectiveDate)}{e.referenceCode ? ` · ${e.referenceCode}` : ''}
                            </p>
                          </div>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: e.direction === 'IN' ? '#059669' : '#B91C1C' }}>
                            {e.direction === 'IN' ? '+' : '−'} {money(e.amount, e.currency)}
                          </p>
                        </div>
                        {e.description && <p style={{ margin: '6px 0 0', fontSize: '.76rem', color: '#64748B' }}>{e.description}</p>}
                      </div>
                    ))}
                    {ePage < ePages && <div style={{ textAlign: 'center' }}><button type="button" style={btn(ACCENT, { ghost: true })} onClick={moreEntries}>Voir plus</button></div>}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {rejecting && (
        <div className="pw-overlay" onClick={() => !busyId && setRejecting(null)}>
          <div className="pw-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800 }}>Refuser la commission</h2>
            <p style={{ margin: '0 0 14px', color: '#64748B', fontSize: '.84rem' }}>{money(rejecting.amount, rejecting.currency)} · {rejecting.senderAntennaName} · {rejecting.reference}</p>
            <label style={label} htmlFor="pw-reason">Motif (obligatoire)</label>
            <textarea id="pw-reason" style={{ ...input, height: 90, padding: '.7rem .9rem', resize: 'vertical' }} maxLength={500} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" style={btn('#475569', { ghost: true })} onClick={() => setRejecting(null)}>Retour</button>
              <button type="button" disabled={rejectReason.trim().length < 3 || !!busyId} style={btn('#B91C1C', { disabled: rejectReason.trim().length < 3 || !!busyId })} onClick={confirmReject}>Refuser</button>
            </div>
          </div>
        </div>
      )}

      {showMove && ov && (
        <MovementModal
          currencies={ov.wallets.filter((w) => w.active).map((w) => w.currency)}
          onClose={() => setShowMove(false)}
          onDone={(msg) => { setShowMove(false); setFlash(msg); refresh(); }}
        />
      )}
      {showSettings && ov && (
        <CurrenciesModal
          active={ov.wallets.filter((w) => w.active).map((w) => w.currency)}
          onClose={() => setShowSettings(false)}
          onDone={() => { setShowSettings(false); setFlash('Devises du wallet mises à jour.'); refresh(); }}
        />
      )}
    </AppShell>
  );
}

function TransferCard({ t, children }: { t: PlatformTransfer; children?: React.ReactNode }) {
  return (
    <div style={{ ...card, padding: '1rem 1.1rem' }}>
      <div className="pw-row">
        <div>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{money(t.amount, t.currency)}</p>
          <p style={{ margin: '2px 0 0', fontSize: '.78rem', color: '#475569', fontWeight: 700 }}>{t.associationName} · {t.senderAntennaName}</p>
        </div>
        <StatusPill status={t.status} />
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '.76rem', color: '#64748B' }}>
        {t.reference} · par {t.initiatedByName} · {dateFr(t.createdAt)}{t.periodLabel ? ` · ${t.periodLabel}` : ''}
      </p>
      {t.notes && <p style={{ margin: '4px 0 0', fontSize: '.78rem', color: '#64748B' }}>{t.notes}</p>}
      {t.status === 'REJECTED' && <p style={{ margin: '6px 0 0', fontSize: '.78rem', color: '#991B1B', fontWeight: 700 }}>Refusé : {t.rejectionReason}</p>}
      {t.status === 'VALIDATED' && <p style={{ margin: '6px 0 0', fontSize: '.76rem', color: '#065F46', fontWeight: 700 }}>Validé le {dateFr(t.validatedAt)}</p>}
      {children}
    </div>
  );
}

function MovementModal({ currencies, onClose, onDone }: { currencies: CurrencyCode[]; onClose: () => void; onDone: (msg: string) => void }) {
  const [type, setType] = useState<'WITHDRAWAL_OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('WITHDRAWAL_OUT');
  const [currency, setCurrency] = useState<CurrencyCode>(currencies[0] ?? 'EUR');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key] = useState(newIdempotencyKey);
  const n = Number(amount.replace(',', '.'));
  const ok = Number.isFinite(n) && n > 0 && title.trim().length >= 3;

  async function submit() {
    if (!ok || busy) return;
    setBusy(true); setError('');
    try {
      await platformWalletApi.createMovement({
        type, currency, amount: Math.round(n * 100) / 100, title: title.trim(),
        description: description.trim() || undefined, idempotencyKey: key,
      });
      onDone('Mouvement enregistré.');
    } catch (e) { setError(errMsg(e)); setBusy(false); }
  }

  return (
    <div className="pw-overlay" onClick={() => !busy && onClose()}>
      <div className="pw-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 800 }}>Retrait / ajustement</h2>
        {error && <Alert kind="error">{error}</Alert>}
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={label} htmlFor="mv-type">Type</label>
            <select id="mv-type" style={input} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="WITHDRAWAL_OUT">Retrait (virement vers mon compte bancaire)</option>
              <option value="ADJUSTMENT_IN">Ajustement en plus</option>
              <option value="ADJUSTMENT_OUT">Ajustement en moins</option>
            </select>
          </div>
          <div className="pw-grid2">
            <div>
              <label style={label} htmlFor="mv-cur">Devise</label>
              <select id="mv-cur" style={input} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                {currencies.map((c) => <option key={c} value={c}>{CUR_FLAG[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="mv-amount">Montant</label>
              <input id="mv-amount" style={input} inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={label} htmlFor="mv-title">Libellé</label>
            <input id="mv-title" style={input} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label style={label} htmlFor="mv-desc">Détail (facultatif)</label>
            <input id="mv-desc" style={input} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" style={btn('#475569', { ghost: true })} onClick={onClose}>Fermer</button>
          <button type="button" disabled={!ok || busy} style={btn(ACCENT, { disabled: !ok || busy })} onClick={submit}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}

function CurrenciesModal({ active, onClose, onDone }: { active: CurrencyCode[]; onClose: () => void; onDone: () => void }) {
  const [sel, setSel] = useState<CurrencyCode[]>(active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggle = (c: CurrencyCode) => setSel((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  async function save() {
    setBusy(true); setError('');
    try { await platformWalletApi.updateSettings(sel); onDone(); } catch (e) { setError(errMsg(e)); setBusy(false); }
  }

  return (
    <div className="pw-overlay" onClick={() => !busy && onClose()}>
      <div className="pw-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800 }}>Devises du wallet</h2>
        <p style={{ margin: '0 0 14px', color: '#64748B', fontSize: '.82rem' }}>Les antennes ne peuvent envoyer que dans ces devises. Une devise qui contient encore de l&apos;argent ne peut pas être retirée.</p>
        {error && <Alert kind="error">{error}</Alert>}
        <div style={{ display: 'grid', gap: 8 }}>
          {ALL_CURRENCIES.map((c) => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, background: sel.includes(c) ? '#F5F3FF' : '#F8FAFC', borderRadius: 12, padding: '.6rem .8rem', fontWeight: 700, cursor: 'pointer' }}>
              <input type="checkbox" checked={sel.includes(c)} onChange={() => toggle(c)} /> {CUR_FLAG[c]} {c}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" style={btn('#475569', { ghost: true })} onClick={onClose}>Fermer</button>
          <button type="button" disabled={sel.length === 0 || busy} style={btn(ACCENT, { disabled: sel.length === 0 || busy })} onClick={save}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// web/app/(protected)/super-admin/contributions/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Contribution, ContributionStatus } from '../../../../types/contribution';
import { ContributionsTable } from '../../../../components/super-admin/ContributionsTable';
import { formatCurrency } from '../../../../lib/format';

type CurrencyBucket = Record<string, number>;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  VALIDATED: { label: 'Validée', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  REJECTED: { label: 'Rejetée', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  CANCELLED: { label: 'Annulée', color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div className="stat-val" style={{ color }}>{value}</div>
        <div className="stat-lbl">{label}</div>
      </div>
      <div className="stat-ico" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
    </div>
  );
}

function sumAmountsByCurrency(entries: Contribution[]): CurrencyBucket {
  return entries.reduce<CurrencyBucket>((acc, item) => {
    const currency = item.currency || 'EUR';
    acc[currency] = (acc[currency] ?? 0) + Number(item.amount ?? 0);
    return acc;
  }, {});
}

function renderCurrencyBucket(bucket: CurrencyBucket, color?: string) {
  const entries = Object.entries(bucket);
  if (entries.length === 0) return null;

  return (
    <div className="sc-currency-wrap">
      {entries.map(([currency, amount]) => (
        <span
          key={currency}
          className="sc-currency-badge"
          style={{ color: color ?? '#111827' }}
        >
          {formatCurrency(amount, currency)}
        </span>
      ))}
    </div>
  );
}

export default function SuperAdminContributionsPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (statusVal?: string) => {
      setError(null);
      setLoading(true);

      try {
        const res = await api.listContributions({
          page: 1,
          pageSize: 100,
          status: (statusVal ?? status) || undefined,
        });
        setItems(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des cotisations');
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    void load('');
  }, [load]);

  // Filtrage local instantané
  const displayedItems = useMemo(() => {
    if (!status) return items;
    return items.filter((c) => {
      if (status === 'PENDING_VALIDATION' || status === 'PENDING') {
        return c.status === 'PENDING_VALIDATION' || c.status === 'PENDING';
      }
      return c.status === status;
    });
  }, [items, status]);

  const total = items.length;
  const pending = items.filter((c) => c.status === 'PENDING' || c.status === 'PENDING_VALIDATION').length;
  const validated = items.filter((c) => c.status === 'VALIDATED').length;

  const pendingItems = useMemo(
    () => items.filter((c) => c.status === 'PENDING' || c.status === 'PENDING_VALIDATION'),
    [items],
  );

  const pendingByCurrency = useMemo(
    () => sumAmountsByCurrency(pendingItems),
    [pendingItems],
  );

  const hasPending = pending > 0;

  return (
    <AppShell title="Cotisations globales">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .sc-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1200px;margin:0 auto}
        .sc-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:scin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .sc-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sc-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:scpulse 2s ease-in-out infinite}
        @keyframes scpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sc-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .sc-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        .sc-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.7rem;
            margin-bottom: 1.4rem;
            opacity: 0;
            transform: translateY(10px);
            animation: scin 0.5s 0.08s cubic-bezier(.22,1,.36,1) forwards;
        }
        .stat-card {
            background: rgba(253,253,255,.93);
            border-radius: 14px;
            border: 1px solid rgba(220,38,38,.09);
            box-shadow: 0 2px 8px rgba(220,38,38,.04);
            padding: 0.8rem 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
        }
        .stat-val { font-family: 'Cormorant Garamond',serif; font-size: 1.55rem; font-weight: 700; line-height: 1; margin-bottom: 0.3rem; }
        .stat-lbl { font-size: 0.64rem; font-weight: 900; color: #6B7280; text-transform: uppercase; letter-spacing: 0.07em; line-height: 1.2; }
        .stat-ico { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        @media(max-width: 600px) {
            .sc-stats { gap: 0.4rem; }
            .stat-card { padding: 0.6rem 0.4rem; gap: 0.25rem; flex-direction: column-reverse; justify-content: center; }
            .stat-val { font-size: 1.3rem; margin-bottom: 0.1rem; }
            .stat-lbl { font-size: 0.55rem; letter-spacing: 0; text-align: center; }
            .stat-ico { width: 26px; height: 26px; margin-bottom: 0.2rem; }
            .stat-ico svg { width: 14px; height: 14px; }
        }

        .sc-urgent{display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1.1rem;background:linear-gradient(135deg,rgba(217,119,6,.07),rgba(245,158,11,.04));border:1px solid rgba(217,119,6,.2);border-radius:13px;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:scin .5s .12s cubic-bezier(.22,1,.36,1) forwards}
        .sc-urgent-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#92400E,#D97706);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 8px rgba(217,119,6,.3)}
        .sc-urgent-text strong{font-size:.85rem;font-weight:800;color:#111827;display:block;margin-bottom:.35rem}
        .sc-urgent-text span{font-size:.75rem;font-weight:600;color:#6B7280}

        .sc-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:scin .5s .16s cubic-bezier(.22,1,.36,1) forwards}
        .sc-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:nowrap; overflow: hidden;}
        .sc-panel-titlerow{display:flex;align-items:center;gap:.55rem; min-width: 0;}
        .sc-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        
        .sc-panel-title {
            font-size: clamp(0.7rem, 2.5vw, 0.75rem);
            font-weight: 900;
            letter-spacing: .05em;
            text-transform: uppercase;
            color: #1F2937;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .sc-count-chip{font-size:.68rem;font-weight:900;padding:.2rem .6rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA; flex-shrink:0;}

        .sc-toolbar {
            display: flex;
            flex-direction: row;
            gap: 0.6rem;
            align-items: center;
            flex-wrap: nowrap;
            padding: 0.9rem 1.4rem;
            border-bottom: 1px solid rgba(220,38,38,.07);
        }
        .sc-field {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
            min-width: 0;
        }
        .sc-label {
            font-size: 0.7rem;
            font-weight: 900;
            color: #374151;
            letter-spacing: .05em;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .sc-select {
            flex: 1;
            height: 40px;
            border-radius: 11px;
            border: 1px solid rgba(220,38,38,.18);
            background: rgba(255,255,255,.9);
            padding: 0 1.8rem 0 .85rem;
            font-family: 'DM Sans',sans-serif;
            font-size: .84rem;
            font-weight: 700;
            color: #111827;
            outline: none;
            appearance: none;
            cursor: pointer;
            background-image: url("data:image/svg+xml,%3Csvg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right .65rem center;
            transition: border-color .2s,box-shadow .2s;
            min-width: 0;
            text-overflow: ellipsis;
        }
        .sc-select:focus { border-color: rgba(220,38,38,.42); box-shadow: 0 0 0 3px rgba(220,38,38,.09); }
        .sc-filter-btn {
            height: 40px;
            padding: 0 1.2rem;
            border-radius: 11px;
            background: linear-gradient(135deg,#991B1B,#DC2626);
            border: none;
            color: white;
            cursor: pointer;
            font-family: 'DM Sans',sans-serif;
            font-size: .84rem;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: .45rem;
            box-shadow: 0 3px 10px rgba(220,38,38,.3);
            transition: all .18s;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .sc-filter-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(220,38,38,.42); }
        .sc-filter-btn:disabled { opacity: .6; cursor: not-allowed; }
        @media(max-width: 500px) {
            .sc-toolbar { padding: 0.7rem 0.8rem; gap: 0.4rem; }
            .sc-field { gap: 0.35rem; }
            .sc-label { font-size: 0.6rem; letter-spacing: 0; }
            .sc-select { padding: 0 1.2rem 0 0.5rem; font-size: 0.75rem; background-position: right 0.4rem center; }
            .sc-filter-btn { padding: 0 0.8rem; font-size: 0.75rem; }
        }

        /* LIGNE 1 : Statuts forcés sur une ligne sans scroll */
        .sc-status-chips {
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
            justify-content: center;
            gap: clamp(0.2rem, 1.5vw, 0.6rem);
            padding: 0.75rem clamp(0.3rem, 2vw, 1.4rem);
            border-bottom: 1px solid rgba(220,38,38,.06);
            background: rgba(254,242,242,.18);
            width: 100%;
            overflow: hidden;
        }
        .sc-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.15rem;
            font-size: clamp(0.5rem, 2.5vw, 0.68rem);
            font-weight: 800;
            border-radius: 99px;
            padding: 0.15rem clamp(0.25rem, 1.5vw, 0.6rem);
            border: 1px solid;
            cursor: pointer;
            transition: all 0.15s;
            white-space: nowrap;
            flex-shrink: 1;
            min-width: 0;
        }
        .sc-chip span:last-child {
            font-family: 'DM Mono', monospace;
            font-size: clamp(0.5rem, 2.5vw, 0.68rem);
            margin-left: 0.1rem;
        }

        /* Gestion de l'affichage des devises multiples - EMPILEMENT VERTICAL */
        .sc-currency-wrap {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            align-items: center;
            justify-content: center;
            width: 100%;
        }
        .sc-currency-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 0.25rem 0.5rem;
            font-size: clamp(0.55rem, 2.2vw, 0.72rem);
            font-weight: 800;
            background: rgba(255,255,255,.9);
            border: 1px solid rgba(0,0,0,.08);
            white-space: nowrap;
            width: max-content;
            max-width: 100%;
        }

        .sc-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin:1rem}
        .sc-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .sc-ring{width:24px;height:24px;border:2.5px solid rgba(220,38,38,.12);border-top-color:#DC2626;border-radius:50%;animation:scspin .8s linear infinite}

        .sc-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF}
        .sc-empty-title{font-size:.9rem;font-weight:800;color:#374151}
        .sc-empty-sub{font-size:.78rem;font-weight:600}

        @keyframes scin{to{opacity:1;transform:translateY(0)}}
        @keyframes scspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="sc-wrap">
        <div className="sc-header">
          <div className="sc-eyebrow"><div className="sc-dot" />Super Admin</div>
          <h1 className="sc-title">Cotisations <span>globales</span></h1>
        </div>

        <div className="sc-stats">
          <StatCard
            label="Total cotisations"
            value={total}
            color="#DC2626"
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            label="Validées"
            value={validated}
            color="#059669"
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="En attente"
            value={pending}
            color="#D97706"
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {hasPending && (
          <div className="sc-urgent">
            <div className="sc-urgent-ico">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
                <path strokeLinecap="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="sc-urgent-text">
              <strong>{pending} cotisation{pending > 1 ? 's' : ''} en attente</strong>
              {renderCurrencyBucket(pendingByCurrency, '#92400E')}
              <span style={{ display: 'block', marginTop: '0.4rem' }}>Ces cotisations n&apos;ont pas encore été validées par les administrateurs d&apos;antenne.</span>
            </div>
          </div>
        )}

        <div className="sc-panel">
          <div className="sc-panel-head">
            <div className="sc-panel-titlerow">
              <div className="sc-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="sc-panel-title">Suivi des cotisations</span>
              {displayedItems.length > 0 && <span className="sc-count-chip">{displayedItems.length}</span>}
            </div>
          </div>

          <div className="sc-toolbar">
            <div className="sc-field">
              <label className="sc-label">Statut</label>
              <select
                className="sc-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="PENDING_VALIDATION">En attente</option>
                <option value="VALIDATED">Validées</option>
                <option value="REJECTED">Rejetées</option>
                <option value="CANCELLED">Annulées</option>
              </select>
            </div>

            <button
              className="sc-filter-btn"
              disabled={loading}
              onClick={() => void load(status)}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 13,
                      height: 13,
                      border: '2px solid rgba(255,255,255,.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'scspin .7s linear infinite',
                    }}
                  />
                  Chargement…
                </>
              ) : (
                <>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Actualiser
                </>
              )}
            </button>
          </div>

          {/* GROUPE 1 : Statuts (Ligne forcée sans scroll) */}
          {!loading && items.length > 0 && (
            <div className="sc-status-chips">
              {(Object.entries(STATUS_MAP) as [ContributionStatus, typeof STATUS_MAP[ContributionStatus]][]).map(([key, s]) => {
                const count = items.filter((c) => c.status === key).length;
                if (count === 0) return null;

                return (
                  <button
                    key={key}
                    className="sc-chip"
                    style={{ color: s.color, background: s.bg, borderColor: s.border }}
                    onClick={() => {
                      setStatus(key);
                      void load(key);
                    }}
                  >
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    {s.label}
                    <span>{count}</span>
                  </button>
                );
              })}

              {status && (
                <button
                  className="sc-chip"
                  style={{ color: '#6B7280', background: '#F9FAFB', borderColor: '#E5E7EB' }}
                  onClick={() => {
                    setStatus('');
                    void load('');
                  }}
                >
                  <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Réinitialiser
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="sc-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="sc-loader"><div className="sc-ring" />Chargement…</div>
          ) : !error && displayedItems.length === 0 ? (
            <div className="sc-empty">
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3">
                <path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="sc-empty-title">Aucune cotisation trouvée pour ce statut</div>
              <div className="sc-empty-sub">Essayez de modifier le filtre ou de réinitialiser.</div>
            </div>
          ) : !error ? (
            <ContributionsTable items={displayedItems} />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
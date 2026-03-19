//web/app/(protected)/super-admin/settings/page.tsx
'use client';

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';
import type { Association } from '../../../../types/association';

type PricingMap = Record<string, { monthlyQuota: string; membershipCard: string }>;
const SUPPORTED_CURRENCIES = ['EUR', 'GNF', 'USD', 'XOF'];

/* ══════════════════════════════════════════════════════ INFO ROW */
function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: '.75rem 0', borderBottom: '1px solid rgba(220,38,38,.07)' }}>
      <div style={{ fontSize: '.63rem', fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '.3rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: mono ? "'DM Mono',monospace" : "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 700, color: '#111827', wordBreak: 'break-all' }}>
        {value || '—'}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ STATUS TOGGLE */
function StatusToggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => { if (!disabled) onChange(!checked); }}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 99, border: 'none', 
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'linear-gradient(135deg,#059669,#10B981)' : '#D1D5DB',
        position: 'relative', transition: 'background .25s, opacity .2s', flexShrink: 0,
        boxShadow: (checked && !disabled) ? '0 2px 8px rgba(5,150,105,.35)' : 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        transition: 'left .22s cubic-bezier(.22,1,.36,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,.18)',
      }} />
    </button>
  );
}

/* ══════════════════════════════════════════════════════ FIELD */
function Field({
  label, value, onChange, placeholder, required = false, mono = false, hint, type = 'text', step, disabled = false
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; mono?: boolean; hint?: string; type?: string; step?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{
          width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box',
          border: disabled ? '1.5px solid transparent' : `1.5px solid ${focused ? 'rgba(220,38,38,.45)' : 'rgba(220,38,38,.18)'}`,
          background: disabled ? '#F3F4F6' : focused ? 'white' : 'rgba(255,255,255,.88)',
          padding: '0 .95rem',
          fontFamily: mono ? "'DM Mono',monospace" : "'DM Sans',sans-serif",
          fontSize: '.86rem', fontWeight: 700, 
          color: disabled ? '#6B7280' : '#111827', 
          outline: 'none',
          transition: 'border-color .2s, box-shadow .2s, background .2s',
          boxShadow: focused && !disabled ? '0 0 0 3px rgba(220,38,38,.09)' : 'none',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <p style={{ marginTop: '.35rem', fontSize: '.71rem', fontWeight: 600, color: '#9CA3AF', lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminSettingsPage() {
  const [association, setAssociation] = useState<Association | null>(null);
  
  // Settings Association
  const [name,        setName]        = useState('');
  const [code,        setCode]        = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Settings Pricing Multi-Devises
  const [activeCurrency, setActiveCurrency] = useState('EUR');
  const [pricingMap, setPricingMap] = useState<PricingMap>({});
  const [initialPricingMap, setInitialPricingMap] = useState<PricingMap>({});

  const [loading,  setLoading]  = useState(false);
  const [initLoad, setInitLoad] = useState(true);
  const [isEditing, setIsEditing] = useState(false); // État pour verrouiller/déverrouiller
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [a, pricingData] = await Promise.all([
          api.getAssociation(),
          api.getPricingSuperAdmin().catch(() => ({} as Record<string, { monthlyQuota: number; membershipCard: number }>)),
        ]);
        
        setAssociation(a);
        setName(a.name);
        setCode(a.code);
        setIsActive(a.isActive);
        
        // Formatter le dictionnaire de l'API pour les inputs (en string)
        const formattedMap: PricingMap = {};
        SUPPORTED_CURRENCIES.forEach(cur => {
          const apiPrices = pricingData[cur] || { monthlyQuota: 0, membershipCard: 0 };
          formattedMap[cur] = {
            monthlyQuota: apiPrices.monthlyQuota ? apiPrices.monthlyQuota.toString() : '',
            membershipCard: apiPrices.membershipCard ? apiPrices.membershipCard.toString() : '',
          };
        });

        setPricingMap(formattedMap);
        setInitialPricingMap(JSON.parse(JSON.stringify(formattedMap)));
      } catch (err) {
        setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur de chargement' });
      } finally {
        setInitLoad(false);
      }
    })();
  }, []);

  const handlePricingChange = (field: 'monthlyQuota' | 'membershipCard', value: string) => {
    setPricingMap(prev => ({
      ...prev,
      [activeCurrency]: {
        ...prev[activeCurrency],
        [field]: value
      }
    }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setMsg(null);
    if (association) {
      setName(association.name);
      setCode(association.code);
      setIsActive(association.isActive);
    }
    setPricingMap(JSON.parse(JSON.stringify(initialPricingMap)));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null); setLoading(true);
    try {
      // Préparer le payload numérique
      const payload: Record<string, { monthlyQuota: number; membershipCard: number }> = {};
      SUPPORTED_CURRENCIES.forEach(cur => {
        payload[cur] = {
          monthlyQuota: Number(pricingMap[cur]?.monthlyQuota) || 0,
          membershipCard: Number(pricingMap[cur]?.membershipCard) || 0,
        };
      });

      await Promise.all([
        api.updateAssociation({ name, code, isActive }),
        api.updatePricingSuperAdmin(payload),
      ]);
      
      const updated = await api.getAssociation();
      setAssociation(updated);
      setInitialPricingMap(JSON.parse(JSON.stringify(pricingMap)));
      setMsg({ type: 'success', text: 'Param\u00e8tres mis \u00e0 jour avec succ\u00e8s !' });
      setIsEditing(false); // On reverrouille après sauvegarde réussie
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur de sauvegarde' });
    } finally {
      setLoading(false);
    }
  }

  const isDirty = association
    ? name !== association.name || 
      code !== association.code || 
      isActive !== association.isActive ||
      JSON.stringify(pricingMap) !== JSON.stringify(initialPricingMap)
    : false;

  return (
    <AppShell title="Paramètres Généraux">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .ss-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1050px;margin:0 auto}

        /* Header */
        .ss-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:ssin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .ss-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ss-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:sspulse 2s ease-in-out infinite}
        @keyframes sspulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ss-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .ss-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* Layout 2-col */
        .ss-layout{display:grid;grid-template-columns:1fr 380px;gap:1.4rem;align-items:start}
        @media(max-width:900px){.ss-layout{grid-template-columns:1fr}}

        /* Panel */
        .ss-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden}
        .ss-panel-left{opacity:0;transform:translateY(10px);animation:ssin .5s .10s cubic-bezier(.22,1,.36,1) forwards}
        .ss-panel-right{opacity:0;transform:translateY(10px);animation:ssin .5s .16s cubic-bezier(.22,1,.36,1) forwards}
        
        .ss-panel-head{padding:1rem 1.5rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.55rem}
        .ss-panel-head-left{display:flex;align-items:center;gap:.55rem}
        .ss-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .ss-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        
        .ss-panel-body{padding:1.5rem}
        @media(max-width:540px){.ss-panel-body{padding:1.1rem}}

        /* Form stack */
        .ss-form-stack{display:flex;flex-direction:column;gap:1.1rem}

        /* Buttons */
        .ss-edit-btn { padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid #E5E7EB; background: white; color: #374151; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.35rem; transition: all 0.2s; }
        .ss-edit-btn:hover { background: #F9FAFB; border-color: #D1D5DB; }
        
        .ss-cancel-btn { height: 42px; padding: 0 1.2rem; border-radius: 11px; background: transparent; border: 1px solid #D1D5DB; color: #4B5563; font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 0.84rem; cursor: pointer; transition: all 0.2s; }
        .ss-cancel-btn:hover { background: #F3F4F6; color: #111827; }

        /* Currencies Tabs */
        .ss-tabs { display: flex; gap: 0.4rem; padding: 0.4rem; background: rgba(220,38,38,.05); border-radius: 12px; margin-bottom: 1rem; }
        .ss-tab { flex: 1; padding: 0.55rem 0; text-align: center; font-size: 0.76rem; font-weight: 800; color: #6B7280; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: none; background: transparent; }
        .ss-tab.active { background: white; color: #DC2626; box-shadow: 0 2px 6px rgba(220,38,38,.15); }
        .ss-tab:hover:not(.active) { color: #111827; background: rgba(255,255,255,0.5); }

        /* Toggle row */
        .ss-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 1rem;background:rgba(254,242,242,.3);border:1px solid rgba(220,38,38,.1);border-radius:12px}
        .ss-toggle-label{font-size:.84rem;font-weight:800;color:#111827;margin-bottom:.18rem}
        .ss-toggle-sub{font-size:.72rem;font-weight:600;color:#6B7280;line-height:1.45}

        /* Form footer */
        .ss-form-footer{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding-top:1rem;border-top:1px solid rgba(220,38,38,.08);margin-top:.25rem}
        .ss-msg-success{display:flex;align-items:center;gap:.45rem;font-size:.8rem;font-weight:800;color:#059669; padding: 0.5rem 0;}
        .ss-msg-error{display:flex;align-items:center;gap:.45rem;font-size:.8rem;font-weight:800;color:#DC2626; padding: 0.5rem 0;}
        
        .ss-submit-btn{height:42px;padding:0 1.4rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:800;display:flex;align-items:center;gap:.45rem;box-shadow:0 4px 14px rgba(220,38,38,.32);transition:all .18s;white-space:nowrap}
        .ss-submit-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(220,38,38,.42)}
        .ss-submit-btn:disabled{opacity:.6;cursor:not-allowed}
        .ss-dirty-chip{font-size:.68rem;font-weight:800;padding:.2rem .55rem;border-radius:99px;background:#FFFBEB;color:#D97706;border:1px solid #FDE68A}

        /* System info */
        .ss-info-stack{padding:.25rem 0}
        .ss-info-last{border-bottom:none !important}

        /* Governance notice */
        .ss-governance{display:flex;gap:.7rem;align-items:flex-start;padding:.95rem 1.1rem;background:linear-gradient(135deg,rgba(220,38,38,.05),rgba(239,68,68,.03));border:1px solid rgba(220,38,38,.14);border-radius:13px;margin-top:.5rem}
        .ss-gov-ico{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 6px rgba(220,38,38,.28)}
        .ss-gov-title{font-size:.8rem;font-weight:900;color:#111827;margin-bottom:.3rem}
        .ss-gov-body{font-size:.76rem;font-weight:600;color:#6B7280;line-height:1.55}

        /* Skeleton loader */
        .ss-skeleton{height:42px;border-radius:11px;background:linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%);background-size:200% 100%;animation:ssshimmer 1.4s infinite}
        @keyframes ssshimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        @keyframes ssin{to{opacity:1;transform:translateY(0)}}
        @keyframes ssspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="ss-wrap">

        {/* Header */}
        <div className="ss-header">
          <div className="ss-eyebrow"><div className="ss-dot" />Super Admin</div>
          <h1 className="ss-title">Param&egrave;tres de <span>l&apos;association</span></h1>
        </div>

        <div className="ss-layout">

          {/* ── LEFT : Form ── */}
          <div className="ss-panel ss-panel-left">
            <div className="ss-panel-head">
              <div className="ss-panel-head-left">
                <div className="ss-panel-ico">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <span className="ss-panel-title">Configuration de l&apos;association</span>
              </div>
              {!isEditing && !initLoad && (
                <button type="button" className="ss-edit-btn" onClick={(e) => { e.preventDefault(); setIsEditing(true); setMsg(null); }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Modifier
                </button>
              )}
            </div>
            <div className="ss-panel-body">
              {initLoad ? (
                <div className="ss-form-stack">
                  {[1, 2, 3, 4].map(i => <div key={i} className="ss-skeleton" />)}
                </div>
              ) : (
                <form onSubmit={(e: FormEvent<HTMLFormElement>) => void onSubmit(e)} className="ss-form-stack">

                  {/* Message (visible in read-only mode if recently saved) */}
                  {!isEditing && msg?.type === 'success' && (
                    <div className="ss-msg-success">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {msg.text}
                    </div>
                  )}

                  <Field
                    label="Nom officiel de l'organisation"
                    value={name}
                    onChange={setName}
                    placeholder="Ex : Ma Super Association"
                    required
                    disabled={!isEditing}
                    hint="Ce nom appara&icirc;t sur tous les documents et communications officiels."
                  />

                  <Field
                    label="Identifiant unique (Code)"
                    value={code}
                    onChange={v => setCode(v.toUpperCase())}
                    placeholder="Ex : ASSOC-01"
                    required
                    mono
                    disabled={!isEditing}
                    hint="Uniquement des lettres majuscules, chiffres et tirets. Utilis&eacute; comme r&eacute;f&eacute;rence interne."
                  />

                  {/* Tarification Multi-devises */}
                  <div style={{ marginTop: '.8rem', marginBottom: '.2rem', paddingBottom: '.5rem', borderBottom: '1px solid rgba(220,38,38,.07)' }}>
                    <span style={{ fontSize: '.75rem', fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: '#1F2937' }}>
                      Tarification Globale par devise
                    </span>
                  </div>

                  {/* Tabs always clickable to let user view different currencies */}
                  <div className="ss-tabs">
                    {SUPPORTED_CURRENCIES.map(cur => (
                      <button
                        key={cur}
                        type="button"
                        className={`ss-tab ${activeCurrency === cur ? 'active' : ''}`}
                        onClick={() => setActiveCurrency(cur)}
                      >
                        {cur}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <Field
                      label={`Cotisation (${activeCurrency})`}
                      value={pricingMap[activeCurrency]?.monthlyQuota || ''}
                      onChange={(val) => handlePricingChange('monthlyQuota', val)}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      disabled={!isEditing}
                      hint="Prix de base pour un mois."
                    />
                    <Field
                      label={`Carte membre (${activeCurrency})`}
                      value={pricingMap[activeCurrency]?.membershipCard || ''}
                      onChange={(val) => handlePricingChange('membershipCard', val)}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      disabled={!isEditing}
                      hint="Prix pour la carte annuelle."
                    />
                  </div>

                  {/* Toggle statut */}
                  <div className="ss-toggle-row" style={{ marginTop: '.5rem' }}>
                    <div>
                      <div className="ss-toggle-label">Statut de l&apos;association</div>
                      <div className="ss-toggle-sub">
                        {isActive
                          ? 'Association active \u2014 les membres ont acc\u00e8s \u00e0 la plateforme.'
                          : 'Association d\u00e9sactiv\u00e9e \u2014 tous les acc\u00e8s membres sont bloqu\u00e9s.'}
                      </div>
                    </div>
                    <StatusToggle checked={isActive} onChange={setIsActive} disabled={!isEditing} />
                  </div>

                  {/* Footer - Visible only when editing */}
                  {isEditing && (
                    <div className="ss-form-footer">
                      <div>
                        {msg?.type === 'error' && (
                          <div className="ss-msg-error">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
                            {msg.text}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                        <button type="button" onClick={handleCancel} className="ss-cancel-btn" disabled={loading}>
                          Annuler
                        </button>
                        <button type="submit" className="ss-submit-btn" disabled={loading || !isDirty}>
                          {loading
                            ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ssspin .7s linear infinite' }} />Enregistrement&#8230;</>
                            : <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M5 13l4 4L19 7" /></svg>Enregistrer</>
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* ── RIGHT : System info ── */}
          <div className="ss-panel ss-panel-right">
            <div className="ss-panel-head">
              <div className="ss-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
              <span className="ss-panel-title">D&eacute;tails syst&egrave;me</span>
            </div>
            <div className="ss-panel-body">
              <div className="ss-info-stack">
                <InfoRow label="ID Syst&egrave;me"          value={association?.id ?? '—'}                          mono />
                <InfoRow label="Code actuel"              value={association?.code ?? '—'}                        mono />
                <InfoRow label="Date de cr&eacute;ation"    value={association ? formatDate(association.createdAt) : '—'} />
                <div style={{ borderBottom: 'none' }}>
                  <InfoRow label="Derni&egrave;re modification" value={association ? formatDate(association.updatedAt) : '—'} />
                </div>
              </div>

              {/* Governance notice */}
              <div className="ss-governance">
                <div className="ss-gov-ico">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="ss-gov-title">R&egrave;gle de gouvernance</div>
                  <div className="ss-gov-body">
                    Ces param&egrave;tres impactent l&apos;ensemble des antennes et de leurs membres.
                    Seul le profil <strong style={{ color: '#111827' }}>Super Admin</strong> dispose
                    des privil&egrave;ges n&eacute;cessaires pour modifier ces informations.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
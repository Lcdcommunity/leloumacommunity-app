// web/app/(protected)/super-admin/settings/page.tsx
'use client';

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';
import type { Association } from '../../../../types/association';

type Theme = 'light' | 'dark' | 'system';
type PricingMap = Record<string, { monthlyQuota: string; membershipCard: string; expenseValidationThreshold: string }>;
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

/* ══════════════════════════════════════════════════════ FIELD COMPONENT */
function Field({
  label, value, onChange, placeholder, required = false, mono = false, hint, type = 'text', step, disabled = false, autoComplete
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; mono?: boolean; hint?: string; type?: string; step?: string; disabled?: boolean; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          step={step}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          style={{
            width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box',
            border: disabled ? '1.5px solid transparent' : `1.5px solid ${focused ? 'rgba(220,38,38,.45)' : 'rgba(220,38,38,.18)'}`,
            background: disabled ? '#F3F4F6' : focused ? 'white' : 'rgba(255,255,255,.88)',
            padding: '0 .95rem',
            paddingRight: isPassword ? '2.5rem' : '.95rem',
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
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            style={{
              position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
            }}
          >
            {showPassword ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.543 7-1.275 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        )}
      </div>
      {hint && <p style={{ marginTop: '.35rem', fontSize: '.71rem', fontWeight: 600, color: '#9CA3AF', lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminSettingsPage() {
  const [association, setAssociation] = useState<Association | null>(null);
  
  // Settings Association
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Settings Pricing Multi-Devises
  const [activeCurrency, setActiveCurrency] = useState('EUR');
  const [pricingMap, setPricingMap] = useState<PricingMap>({});
  const [initialPricingMap, setInitialPricingMap] = useState<PricingMap>({});

  const [loading, setLoading] = useState(false);
  const [initLoad, setInitLoad] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [language, setLanguage] = useState('fr');
  const [theme, setTheme] = useState<Theme>('system');
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefMsg, setPrefMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings Security
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secLoading, setSecLoading] = useState(false);
  const [secMsg, setSecMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [secFormKey, setSecFormKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [a, pricingData] = await Promise.all([
          api.getAssociation(),
          api.getPricingSuperAdmin().catch(() => ({} as Record<string, { monthlyQuota: number; membershipCard: number; expenseValidationThreshold?: number }>)),
        ]);
        
        if (!mounted) return;
        setAssociation(a);
        setName(a.name);
        setCode(a.code);
        setIsActive(a.isActive);
        
        const formattedMap: PricingMap = {};
        SUPPORTED_CURRENCIES.forEach(cur => {
          const apiPrices = pricingData[cur] || { monthlyQuota: 0, membershipCard: 0, expenseValidationThreshold: null };
          formattedMap[cur] = {
            monthlyQuota: apiPrices.monthlyQuota ? apiPrices.monthlyQuota.toString() : '',
            membershipCard: apiPrices.membershipCard ? apiPrices.membershipCard.toString() : '',
            expenseValidationThreshold: apiPrices.expenseValidationThreshold ? apiPrices.expenseValidationThreshold.toString() : '',
          };
        });

        setPricingMap(formattedMap);
        setInitialPricingMap(JSON.parse(JSON.stringify(formattedMap)));
      } catch {
        if (mounted) setMsg({ type: 'error', text: 'Erreur de chargement' });
      } finally {
        if (mounted) setInitLoad(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handlePricingChange = (field: keyof PricingMap[string], value: string) => {
    setPricingMap(prev => ({ ...prev, [activeCurrency]: { ...prev[activeCurrency], [field]: value } }));
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
      const payload: Record<string, { monthlyQuota: number; membershipCard: number; expenseValidationThreshold: number | null }> = {};
      SUPPORTED_CURRENCIES.forEach(cur => {
        payload[cur] = {
          monthlyQuota: Number(pricingMap[cur]?.monthlyQuota) || 0,
          membershipCard: Number(pricingMap[cur]?.membershipCard) || 0,
          expenseValidationThreshold: pricingMap[cur]?.expenseValidationThreshold ? Number(pricingMap[cur]?.expenseValidationThreshold) : null,
        };
      });

      await Promise.all([
        api.updateAssociation({ name, code, isActive }),
        api.updatePricingSuperAdmin(payload),
      ]);
      
      const updated = await api.getAssociation();
      setAssociation(updated);
      setInitialPricingMap(JSON.parse(JSON.stringify(pricingMap)));
      setMsg({ type: 'success', text: 'Paramètres mis à jour avec succès !' });
      setIsEditing(false);
    } catch {
      setMsg({ type: 'error', text: 'Erreur de sauvegarde' });
    } finally {
      setLoading(false);
    }
  }

  async function handlePreferencesSubmit(e: FormEvent) {
    e.preventDefault();
    setPrefLoading(true);
    setPrefMsg(null);
    try {
      await api.updateMemberPreferences({ emailNotifications, smsNotifications, pushNotifications, language, theme });
      setPrefMsg({ type: 'success', text: 'Préférences enregistrées avec succès.' });
    } catch {
      setPrefMsg({ type: 'error', text: 'Erreur lors de l\'enregistrement des préférences.' });
    } finally {
      setPrefLoading(false);
    }
  }

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSecMsg(null);
    if (password !== confirmPassword) {
      setSecMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setSecLoading(true);
    try {
      // ✅ APPEL API RÉEL
      await api.updateMyPassword(password);
      
      setSecMsg({ type: 'success', text: 'Mot de passe mis à jour avec succès.' });
      setPassword('');
      setConfirmPassword('');
      setSecFormKey(prev => prev + 1); // 🔥 Détruit l'ancien formulaire pour effacer le cache navigateur

      setTimeout(() => {
        setIsEditingPassword(false);
        setSecMsg(null);
      }, 2500);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour.';
      setSecMsg({ type: 'error', text: errorMsg });
    } finally {
      setSecLoading(false);
    }
  };

  const handleCancelPassword = () => {
    setIsEditingPassword(false);
    setPassword('');
    setConfirmPassword('');
    setSecMsg(null);
    setSecFormKey(prev => prev + 1);
  };

  const isDirty = association
    ? name !== association.name || 
      code !== association.code || 
      isActive !== association.isActive ||
      JSON.stringify(pricingMap) !== JSON.stringify(initialPricingMap)
    : false;

  const isPasswordDirty = password.length > 0 || confirmPassword.length > 0;

  return (
    <AppShell title="Paramètres Généraux">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .ss-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1050px;margin:0 auto}
        .ss-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:ssin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .ss-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ss-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:sspulse 2s ease-in-out infinite}
        @keyframes sspulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ss-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .ss-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .ss-layout{display:grid;grid-template-columns:1fr 380px;gap:1.4rem;align-items:start}
        .ss-left-col { display: flex; flex-direction: column; gap: 1.4rem; }
        @media(max-width:900px){.ss-layout{grid-template-columns:1fr}}
        .ss-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden}
        .ss-panel-left{opacity:0;transform:translateY(10px);animation:ssin .5s .10s cubic-bezier(.22,1,.36,1) forwards}
        .ss-panel-right{opacity:0;transform:translateY(10px);animation:ssin .5s .16s cubic-bezier(.22,1,.36,1) forwards}
        .ss-panel-head{padding:1rem 1.5rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.55rem}
        .ss-panel-head-left{display:flex;align-items:center;gap:.55rem}
        .ss-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .ss-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .ss-panel-body{padding:1.5rem}
        .ss-form-stack{display:flex;flex-direction:column;gap:1.1rem}
        .ss-section { padding: 1.2rem 1.5rem; border-bottom: 1px solid rgba(220,38,38,0.06); }
        .ss-section:last-child { border-bottom: none; }
        .ss-section-label { font-size: 0.65rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 0.85rem; }
        .ss-edit-btn { padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid #E5E7EB; background: white; color: #374151; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.35rem; transition: all 0.2s; }
        .ss-edit-btn:hover { background: #F9FAFB; border-color: #D1D5DB; }
        .ss-cancel-btn { height: 42px; padding: 0 1.2rem; border-radius: 11px; background: transparent; border: 1px solid #D1D5DB; color: #4B5563; font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 0.84rem; cursor: pointer; transition: all 0.2s; }
        .ss-cancel-btn:hover { background: #F3F4F6; color: #111827; }
        .ss-toggle-pref-row { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0.85rem; border-radius: 12px; border: 1px solid rgba(220,38,38,0.09); background: rgba(254,242,242,0.3); margin-bottom: 0.55rem; gap: 0.75rem; transition: background 0.2s, border-color 0.2s; cursor: pointer; }
        .ss-toggle-pref-row:hover { background: #FEF2F2; border-color: rgba(220,38,38,0.18); }
        .ss-toggle-pref-row.active { background: #FEF2F2; border-color: rgba(220,38,38,0.22); }
        .ss-toggle-info { display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0; pointer-events: none; }
        .ss-toggle-ico { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ss-toggle-name { font-size: 0.83rem; font-weight: 700; color: #111827; }
        .ss-toggle-desc { font-size: 0.68rem; font-weight: 500; color: #9CA3AF; margin-top: 1px; }
        .ss-switch { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
        .ss-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
        .ss-switch-track { position: absolute; inset: 0; border-radius: 99px; background: #E2E8F0; transition: background 0.2s; cursor: pointer; }
        .ss-switch input:checked + .ss-switch-track { background: #DC2626; }
        .ss-switch-thumb { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.2s cubic-bezier(.22,1,.36,1); box-shadow: 0 1px 4px rgba(0,0,0,0.15); pointer-events: none; }
        .ss-switch input:checked ~ .ss-switch-thumb { transform: translateX(18px); }
        .ss-field-group { display: flex; flex-direction: column; gap: 0.38rem; margin-bottom: 0.7rem; }
        .ss-field-label { font-size: 0.68rem; font-weight: 900; letter-spacing: 0.09em; text-transform: uppercase; color: #DC2626; }
        .ss-select-wrap { position: relative; }
        .ss-select { width: 100%; height: 44px; padding: 0 2.2rem 0 1rem; border-radius: 11px; border: 1px solid rgba(220,38,38,0.15); background: rgba(255,255,255,0.85); font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; color: #111827; outline: none; -webkit-appearance: none; appearance: none; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
        .ss-select:focus { border-color: rgba(220,38,38,0.5); box-shadow: 0 0 0 3px rgba(220,38,38,0.09); background: white; }
        .ss-select-chevron { position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .ss-theme-row { display: flex; gap: 0.5rem; }
        .ss-theme-pill { flex: 1; height: 38px; border-radius: 10px; border: 1.5px solid rgba(220,38,38,0.13); background: rgba(255,255,255,0.8); cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 700; color: #374151; display: flex; align-items: center; justify-content: center; gap: 0.35rem; transition: all 0.2s; }
        .ss-theme-pill.active { border-color: #DC2626; background: #FEF2F2; color: #991B1B; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
        .ss-tabs { display: flex; gap: 0.4rem; padding: 0.4rem; background: rgba(220,38,38,.05); border-radius: 12px; margin-bottom: 1rem; }
        .ss-tab { flex: 1; padding: 0.55rem 0; text-align: center; font-size: 0.76rem; font-weight: 800; color: #6B7280; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: none; background: transparent; }
        .ss-tab.active { background: white; color: #DC2626; box-shadow: 0 2px 6px rgba(220,38,38,.15); }
        .ss-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 1rem;background:rgba(254,242,242,.3);border:1px solid rgba(220,38,38,.1);border-radius:12px}
        .ss-toggle-label{font-size:.84rem;font-weight:800;color:#111827;margin-bottom:.18rem}
        .ss-toggle-sub{font-size:.72rem;font-weight:600;color:#6B7280;line-height:1.45}
        .ss-form-footer{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:1.2rem 1.5rem;border-top:1px solid rgba(220,38,38,.08);}
        .ss-msg-success{display:flex;align-items:center;gap:.45rem;font-size:.8rem;font-weight:800;color:#059669;}
        .ss-msg-error{display:flex;align-items:center;gap:.45rem;font-size:.8rem;font-weight:800;color:#DC2626;}
        .ss-toast { display: flex; align-items: center; gap: 0.45rem; padding: 0.6rem 0.9rem; border-radius: 10px; font-size: 0.77rem; font-weight: 700; border: 1px solid; animation: ssin 0.3s cubic-bezier(.22,1,.36,1); }
        .ss-toast.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
        .ss-toast.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }
        .ss-submit-btn{height:42px;padding:0 1.4rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:800;display:flex;align-items:center;gap:.45rem;box-shadow:0 4px 14px rgba(220,38,38,.32);transition:all .18s;white-space:nowrap}
        .ss-submit-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(220,38,38,.42)}
        .ss-submit-btn:disabled{opacity:.6;cursor:not-allowed}
        .ss-info-stack{padding:.25rem 0}
        .ss-governance{display:flex;gap:.7rem;align-items:flex-start;padding:.95rem 1.1rem;background:linear-gradient(135deg,rgba(220,38,38,.05),rgba(239,68,68,.03));border:1px solid rgba(220,38,38,.14);border-radius:13px;margin-top:.5rem}
        .ss-gov-ico{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 6px rgba(220,38,38,.28)}
        .ss-gov-title{font-size:.8rem;font-weight:900;color:#111827;margin-bottom:.3rem}
        .ss-gov-body{font-size:.76rem;font-weight:600;color:#6B7280;line-height:1.55}
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

          {/* ── LEFT COLUMN ── */}
          <div className="ss-left-col">
            
            {/* Panel 1 : Configuration Globale */}
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
                  <button type="button" className="ss-edit-btn" onClick={() => setIsEditing(true)}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Modifier
                  </button>
                )}
              </div>
              
              {!initLoad && (
                <form onSubmit={(e: FormEvent<HTMLFormElement>) => void onSubmit(e)}>
                  <div className="ss-panel-body" style={{ paddingBottom: isEditing ? '1rem' : '1.5rem' }}>
                    <div className="ss-form-stack">
                      {!isEditing && msg?.type === 'success' && (
                        <div className="ss-msg-success" style={{ marginBottom: '.5rem' }}>
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

                      <div style={{ marginTop: '.8rem', marginBottom: '.2rem', paddingBottom: '.5rem', borderBottom: '1px solid rgba(220,38,38,.07)' }}>
                        <span style={{ fontSize: '.75rem', fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: '#1F2937' }}>
                          Tarification Globale par devise
                        </span>
                      </div>

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

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
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
                          hint="Prix de la carte annuelle."
                        />
                        <Field
                          label={`Seuil dépenses (${activeCurrency})`}
                          value={pricingMap[activeCurrency]?.expenseValidationThreshold || ''}
                          onChange={(val) => handlePricingChange('expenseValidationThreshold', val)}
                          placeholder="Ex: 500"
                          type="number"
                          step="0.01"
                          disabled={!isEditing}
                          hint="Approbation requise au-delà."
                        />
                      </div>

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
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="ss-form-footer" style={{ paddingTop: '1rem' }}>
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
              {initLoad && (
                <div className="ss-panel-body">
                  <div className="ss-form-stack">
                    {[1, 2, 3, 4].map(i => <div key={i} className="ss-skeleton" />)}
                  </div>
                </div>
              )}
            </div>

            {/* Panel 2 : Paramètres & Préférences */}
            <form onSubmit={handlePreferencesSubmit}>
              <div className="ss-panel ss-panel-left" style={{ animationDelay: '.12s' }}>
                <div className="ss-panel-head">
                  <div className="ss-panel-head-left">
                    <div className="ss-panel-ico" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                      </svg>
                    </div>
                    <span className="ss-panel-title">Paramètres & préférences</span>
                  </div>
                </div>

                <div className="ss-section">
                  <div className="ss-section-label">Canaux de notification</div>
                  {[
                    {
                      key: 'email', checked: emailNotifications, onChange: (v: boolean) => setEmailNotifications(v),
                      name: 'Notifications e-mail', desc: 'Recevez les alertes directement dans votre bo\u00eete mail',
                      color: '#DC2626', bg: '#FEF2F2',
                      icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
                    },
                    {
                      key: 'sms', checked: smsNotifications, onChange: (v: boolean) => setSmsNotifications(v),
                      name: 'Notifications SMS', desc: 'Recevez un SMS pour les alertes importantes',
                      color: '#059669', bg: '#ECFDF5',
                      icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
                    },
                    {
                      key: 'push', checked: pushNotifications, onChange: (v: boolean) => setPushNotifications(v),
                      name: 'Notifications push', desc: 'Notifications navigateur si activ\u00e9es sur votre appareil',
                      color: '#7C3AED', bg: '#F5F3FF',
                      icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
                    },
                  ].map(row => (
                    <label key={row.key} className={`ss-toggle-pref-row${row.checked ? ' active' : ''}`}>
                      <div className="ss-toggle-info">
                        <div className="ss-toggle-ico" style={{ background: row.bg, color: row.color }}>{row.icon}</div>
                        <div className="ss-toggle-text">
                          <div className="ss-toggle-name">{row.name}</div>
                          <div className="ss-toggle-desc">{row.desc}</div>
                        </div>
                      </div>
                      <div className="ss-switch">
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => row.onChange(e.target.checked)}
                        />
                        <div className="ss-switch-track" />
                        <div className="ss-switch-thumb" />
                      </div>
                    </label>
                  ))}
                </div>

                <div className="ss-section">
                  <div className="ss-section-label">Langue &amp; affichage</div>
                  <div className="ss-field-group">
                    <label className="ss-field-label">Langue de l&apos;interface</label>
                    <div className="ss-select-wrap">
                      <select
                        className="ss-select"
                        value={language}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value)}
                      >
                        <option value="fr">Fran&ccedil;ais</option>
                        <option value="en">English</option>
                      </select>
                      <span className="ast-select-chevron">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="ss-field-group">
                    <label className="ss-field-label">Th&egrave;me</label>
                    <div className="ss-theme-row">
                      {([
                        { value: 'light', label: 'Clair', icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
                        { value: 'dark',  label: 'Sombre', icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> },
                        { value: 'system',label: 'Syst\u00e8me', icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                      ] as const).map(t => (
                        <button
                          key={t.value} type="button"
                          className={`ss-theme-pill${theme === t.value ? ' active' : ''}`}
                          onClick={() => setTheme(t.value)}
                        >
                          {t.icon}{t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ss-form-footer" style={{ justifyContent: 'flex-start' }}>
                  <button type="submit" className="ss-submit-btn" disabled={prefLoading}>
                    {prefLoading ? (
                      <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ssspin .7s linear infinite' }} />Enregistrement...</>
                    ) : (
                      <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Enregistrer les préférences</>
                    )}
                  </button>
                  {prefMsg && (
                    <div className={`ss-toast${prefMsg.type === 'success' ? ' ok' : ' err'}`}>
                      {prefMsg.type === 'success'
                        ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                      }
                      {prefMsg.text}
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Panel 3 : Sécurité du compte */}
            <div className="ss-panel ss-panel-left" style={{ animationDelay: '.18s' }}>
              <div className="ss-panel-head">
                <div className="ss-panel-head-left">
                  <div className="ss-panel-ico">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </div>
                  <span className="ss-panel-title">Sécurité du compte</span>
                </div>
                {!isEditingPassword && (
                  <button type="button" className="ss-edit-btn" onClick={() => setIsEditingPassword(true)}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Modifier
                  </button>
                )}
              </div>
              <div className="ss-panel-body">
                {isEditingPassword ? (
                  <form key={secFormKey} onSubmit={handlePasswordSubmit} className="ss-form-stack">
                    <Field
                      label="Nouveau mot de passe"
                      type="password"
                      value={password}
                      onChange={setPassword}
                      placeholder="Entrez votre nouveau mot de passe"
                      required
                      hint="Utilisez au moins 8 caractères."
                      autoComplete="new-password"
                    />
                    <Field
                      label="Confirmer nouveau mot de passe"
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Retapez le mot de passe"
                      required
                      autoComplete="new-password"
                    />

                    <div className="ss-form-footer" style={{ padding: '1rem 0 0 0', marginTop: '.25rem', borderTop: 'none' }}>
                      <div>
                        {secMsg?.type === 'error' && (
                          <div className="ss-msg-error">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
                            {secMsg.text}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.65rem' }}>
                        <button type="button" onClick={handleCancelPassword} className="ss-cancel-btn" disabled={secLoading}>
                          Annuler
                        </button>
                        <button type="submit" className="ss-submit-btn" disabled={secLoading || !isPasswordDirty}>
                          {secLoading
                            ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ssspin .7s linear infinite' }} />Mise à jour...</>
                            : <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M5 13l4 4L19 7" /></svg>Mettre à jour</>
                          }
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    Votre mot de passe est s&eacute;curis&eacute; et cach&eacute;. Cliquez sur &quot;Modifier&quot; pour le changer.
                  </div>
                )}
                {secMsg?.type === 'success' && !isEditingPassword && (
                  <div className="ss-msg-success" style={{ marginTop: '1rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {secMsg.text}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN : System info ── */}
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
                <InfoRow label="ID Syst&egrave;me"           value={association?.id ?? '—'}                          mono />
                <InfoRow label="Code actuel"               value={association?.code ?? '—'}                        mono />
                <InfoRow label="Date de cr&eacute;ation"    value={association ? formatDate(association.createdAt) : '—'} />
                <div style={{ borderBottom: 'none' }}>
                  <InfoRow label="Derni&egrave;re modification" value={association ? formatDate(association.updatedAt) : '—'} />
                </div>
              </div>

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
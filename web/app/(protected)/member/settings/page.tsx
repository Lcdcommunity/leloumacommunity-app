// web/app/(protected)/member/settings/page.tsx
'use client';

import { type FormEvent, useState, type ChangeEvent, useEffect } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

/* ══════════════════════════════════════════════════════ UTILS PUSH NOTIFICATIONS */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/* ══════════════════════════════════════════════════════ FIELD COMPONENT (Thème Bleu) */
function Field({
  label, value, onChange, placeholder, required = false, mono = false, hint, type = 'text', disabled = false, autoComplete, isRTL = false
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; mono?: boolean; hint?: string; type?: string; disabled?: boolean;
  autoComplete?: string; isRTL?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
        {label}{required && <span style={{ color: '#2563EB', [isRTL ? 'marginRight' : 'marginLeft']: 3 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          style={{
            width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box',
            border: disabled ? '1.5px solid transparent' : `1.5px solid ${focused ? 'rgba(37,99,235,.45)' : 'rgba(37,99,235,.18)'}`,
            background: disabled ? '#F3F4F6' : focused ? 'white' : 'rgba(255,255,255,.88)',
            padding: '0 .95rem',
            paddingLeft: isPassword && isRTL ? '2.5rem' : '.95rem',
            paddingRight: isPassword && !isRTL ? '2.5rem' : '.95rem',
            fontFamily: mono ? "'DM Mono',monospace" : "'DM Sans',sans-serif",
            fontSize: '.86rem', fontWeight: 700,
            color: disabled ? '#6B7280' : '#111827',
            outline: 'none',
            transition: 'border-color .2s, box-shadow .2s, background .2s',
            boxShadow: focused && !disabled ? '0 0 0 3px rgba(37,99,235,.09)' : 'none',
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
              position: 'absolute', 
              right: isRTL ? 'auto' : '0.75rem', 
              left: isRTL ? '0.75rem' : 'auto', 
              top: '50%', transform: 'translateY(-50%)',
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

export default function MemberSettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isRTL = i18n.language === 'ar';

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Security states
  const [showSecurityFields, setShowSecurityFields] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secLoading, setSecLoading] = useState(false);
  const [secMsg, setSecMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);

    // 🔥 CORRECTION : Charger les préférences utilisateur depuis le backend
    const loadPreferences = async () => {
      try {
        const prefs = await api.getMemberPreferences();
        if (prefs) {
          setEmailNotifications(prefs.emailNotifications ?? true);
          setSmsNotifications(prefs.smsNotifications ?? false);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des préférences:', error);
      }
    };
    
    loadPreferences();

    // Vérification locale pour le Push navigateur
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          if (subscription) setPushNotifications(true);
        });
      });
    }
  }, []);

  const STEPS = [
    {
      icon: (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      ),
      title: t('settings.emailValidation', 'Validation e-mail'),
      desc: t('settings.emailValidationDesc', 'Obligatoire après l’enrôlement pour activer le compte.'),
      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
    },
    {
      icon: (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      ),
      title: t('settings.adminValidation', 'Validation admin antenne'),
      desc: t('settings.adminValidationDesc', 'Obligatoire avant activation complète de l’espace membre.'),
      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
    },
    {
      icon: (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      title: t('settings.contributions', 'Cotisations'),
      desc: t('settings.contributionsDesc', 'Validation manuelle par l’admin après confirmation de réception réelle.'),
      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
    },
    {
      icon: (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      ),
      title: t('settings.proposals', 'Propositions de projets'),
      desc: t('settings.proposalsDesc', 'Soumises puis traitées par les responsables d’antenne.'),
      color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
    },
  ];

  /* ── Gestion des Notifications Push ── */
  const togglePushNotifications = async (enable: boolean) => {
    setPushNotifications(enable); 
    if (enable) {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          throw new Error("Push non supporté par ce navigateur.");
        }
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error("Permission refusée.");

        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!vapidPublicKey) throw new Error("Clé VAPID manquante.");

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }

        const subJson = subscription.toJSON();
        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
          await api.subscribeToPushNotifications({
             endpoint: subJson.endpoint,
             expirationTime: subJson.expirationTime ?? null,
             keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth }
          });
          setMessage({ text: t('settings.pushEnabled', 'Notifications push activées !'), ok: true });
        }
      } catch (error) {
        console.error('Erreur Push:', error);
        setPushNotifications(false); 
        setMessage({ text: error instanceof Error ? error.message : "Erreur d'activation", ok: false });
      }
    } else {
       try {
         const registration = await navigator.serviceWorker.ready;
         const subscription = await registration.pushManager.getSubscription();
         if (subscription) await subscription.unsubscribe();
         setMessage({ text: t('settings.pushDisabled', 'Notifications push désactivées.'), ok: true });
       } catch(e) { console.error(e); }
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.updateMemberPreferences({ 
        emailNotifications, 
        smsNotifications, 
        pushNotifications, 
        language: i18n.language, 
        theme: theme 
      });
      setMessage({ text: t('settings.saveSuccess', 'Préférences enregistrées avec succès.'), ok: true });
    } catch {
      setMessage({ text: t('settings.saveError', 'Erreur lors de l\'enregistrement des préférences.'), ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSecMsg(null);
    if (password !== confirmPassword) {
      setSecMsg({ type: 'error', text: t('settings.passwordMismatch', 'Les mots de passe ne correspondent pas.') });
      return;
    }
    setSecLoading(true);
    try {
      await api.updateMyPassword(password);
      setSecMsg({ type: 'success', text: t('settings.passwordSuccess', 'Mot de passe mis à jour avec succès.') });
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowSecurityFields(false);
        setSecMsg(null);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour.';
      setSecMsg({ type: 'error', text: msg });
    } finally {
      setSecLoading(false);
    }
  }

  const handleCancelPassword = () => {
    setShowSecurityFields(false);
    setSecMsg(null);
    setPassword('');
    setConfirmPassword('');
  };

  const isPasswordDirty = password.length > 0 || confirmPassword.length > 0;

  return (
    <AppShell title={t('settings.pageTitleShort', 'Paramètres')}>
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');

          .ms-wrap {
            font-family: 'DM Sans', sans-serif;
            padding: clamp(1.25rem, 3vw, 2rem);
            max-width: 1050px; margin: 0 auto;
          }
          .ms-header {
            margin-bottom: 1.75rem;
            opacity: 0; transform: translateY(10px);
            animation: msin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
          }
          .ms-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
          .ms-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: mspulse 2s ease-in-out infinite; }
          @keyframes mspulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
          .ms-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
          .ms-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

          .ms-layout { display: grid; grid-template-columns: 1fr 380px; gap: 1.4rem; align-items: start; }
          .ms-left-col { display: flex; flex-direction: column; gap: 1.4rem; }
          @media (max-width: 900px) { .ms-layout { grid-template-columns: 1fr; } }

          .ms-panel {
            background: rgba(253,253,255,0.92);
            backdrop-filter: blur(12px);
            border-radius: 20px;
            border: 1px solid rgba(37,99,235,0.09);
            box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
            overflow: hidden;
          }
          .ms-panel-left { opacity: 0; transform: translateY(10px); animation: msin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards; }
          .ms-panel-right { opacity: 0; transform: translateY(10px); animation: msin 0.5s 0.17s cubic-bezier(.22,1,.36,1) forwards; }

          .ms-panel-head { padding: 1rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,0.07); display: flex; align-items: center; gap: 0.55rem; }
          .ms-panel-ico { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ms-panel-title { font-size: 0.73rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; }
          .ms-panel-body { padding: 1.3rem; }

          .ms-section { padding: 1.2rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,0.06); }
          .ms-section:last-child { border-bottom: none; }
          .ms-section-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 0.85rem; }

          .ms-toggle-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.7rem 0.85rem; border-radius: 12px;
            border: 1px solid rgba(37,99,235,0.09);
            background: rgba(249,250,251,0.6);
            margin-bottom: 0.55rem; gap: 0.75rem;
            transition: background 0.2s, border-color 0.2s;
            cursor: pointer;
          }
          .ms-toggle-row:last-child { margin-bottom: 0; }
          .ms-toggle-row:hover { background: #EFF6FF; border-color: rgba(37,99,235,0.18); }
          .ms-toggle-row.active { background: #EFF6FF; border-color: rgba(37,99,235,0.22); }

          .ms-toggle-info { display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0; pointer-events: none; }
          .ms-toggle-ico { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ms-toggle-name { font-size: 0.83rem; font-weight: 600; color: #111827; }
          .ms-toggle-desc { font-size: 0.68rem; color: #9CA3AF; margin-top: 1px; }

          .ms-switch { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
          .ms-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
          .ms-switch-track { position: absolute; inset: 0; border-radius: 99px; background: #E2E8F0; transition: background 0.2s; cursor: pointer; }
          .ms-switch input:checked + .ms-switch-track { background: #2563EB; }
          .ms-switch-thumb { position: absolute; top: 3px; left: ${isRTL ? 'auto' : '3px'}; right: ${isRTL ? '3px' : 'auto'}; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.2s cubic-bezier(.22,1,.36,1); box-shadow: 0 1px 4px rgba(0,0,0,0.15); pointer-events: none; }
          .ms-switch input:checked ~ .ms-switch-thumb { transform: translateX(${isRTL ? '-18px' : '18px'}); }

          .ms-field { display: flex; flex-direction: column; gap: 0.38rem; margin-bottom: 0.7rem; }
          .ms-field:last-child { margin-bottom: 0; }
          .ms-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: #2563EB; }
          .ms-select-wrap { position: relative; }
          .ms-select { width: 100%; height: 44px; padding: 0 ${isRTL ? '1rem' : '2.2rem'} 0 ${isRTL ? '2.2rem' : '1rem'}; border-radius: 11px; border: 1px solid rgba(37,99,235,0.15); background: rgba(255,255,255,0.85); font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #111827; outline: none; -webkit-appearance: none; appearance: none; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
          .ms-select:focus { border-color: rgba(37,99,235,0.5); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); background: white; }
          .ms-select-chevron { position: absolute; right: ${isRTL ? 'auto' : '0.85rem'}; left: ${isRTL ? '0.85rem' : 'auto'}; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }

          .ms-theme-row { display: flex; gap: 0.5rem; }
          .ms-theme-pill { flex: 1; height: 38px; border-radius: 10px; border: 1.5px solid rgba(37,99,235,0.13); background: rgba(255,255,255,0.8); cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 600; color: #374151; display: flex; align-items: center; justify-content: center; gap: 0.35rem; transition: all 0.2s; }
          .ms-theme-pill:hover { border-color: rgba(37,99,235,0.35); background: #EFF6FF; color: #1D4ED8; }
          .ms-theme-pill.active { border-color: #2563EB; background: #EFF6FF; color: #1D4ED8; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

          .ms-form-stack { display: flex; flex-direction: column; gap: 1.1rem; }
          .ms-footer { padding: 1.1rem 1.3rem; border-top: 1px solid rgba(37,99,235,0.07); display: flex; align-items: center; justify-content: space-between; gap: 0.85rem; flex-wrap: wrap; }
          .ms-footer-left { display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; }
          .ms-submit { height: 42px; padding: 0 1.4rem; border-radius: 11px; background: linear-gradient(135deg,#1D4ED8,#2563EB,#3B82F6); background-size: 200%; background-position: 0%; border: none; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: .84rem; font-weight: 800; display: flex; align-items: center; gap: .45rem; box-shadow: 0 4px 14px rgba(37,99,235,.32); transition: all .18s; white-space: nowrap; }
          .ms-submit:hover:not(:disabled) { background-position: 100%; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,.38); }
          .ms-submit:disabled { opacity: 0.6; cursor: not-allowed; }
          .ms-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: msspin 0.7s linear infinite; }
          
          .ms-toast { display: flex; align-items: center; gap: 0.45rem; padding: 0.6rem 0.9rem; border-radius: 10px; font-size: 0.77rem; font-weight: 600; border: 1px solid; animation: msin 0.3s cubic-bezier(.22,1,.36,1); }
          .ms-toast.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
          .ms-toast.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }
          
          .ms-msg-success { display: flex; align-items: center; gap: .45rem; font-size: .8rem; font-weight: 800; color: #059669; }
          .ms-msg-error { display: flex; align-items: center; gap: .45rem; font-size: .8rem; font-weight: 800; color: #DC2626; }

          .ms-steps { display: flex; flex-direction: column; }
          .ms-step { display: flex; gap: 0.75rem; padding: 0.9rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,0.05); transition: background 0.15s; }
          .ms-step:last-child { border-bottom: none; }
          .ms-step:hover { background: rgba(37,99,235,0.02); }
          .ms-step-ico { width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 1px; border: 1px solid; }
          .ms-step-title { font-size: 0.82rem; font-weight: 700; color: #111827; margin-bottom: 2px; }
          .ms-step-desc { font-size: 0.72rem; color: #6B7280; line-height: 1.55; }

          .ms-unlock-btn {
            width: 100%; padding: 1rem; border-radius: 12px; border: 1.5px dashed rgba(37,99,235,0.25);
            background: rgba(37,99,235,0.02); color: #2563EB; font-weight: 700; font-size: 0.85rem;
            cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.6rem;
          }
          .ms-unlock-btn:hover { background: rgba(37,99,235,0.06); border-color: #2563EB; }

          @keyframes msspin { to { transform: rotate(360deg); } }
          @keyframes msin { to { opacity: 1; transform: translateY(0); } }
        `}</style>

        <div className="ms-wrap">
          <div className="ms-header">
            <div className="ms-eyebrow"><div className="ms-eyebrow-dot" />{t('settings.memberSpace', 'Espace membre')}</div>
            <h1 className="ms-title">{t('settings.pageTitleMember', 'Paramètres')} <span>{t('settings.pageTitleMemberHighlight', '& préférences')}</span></h1>
          </div>

          <div className="ms-layout">
            <div className="ms-left-col">

              {/* Panel 1 : Préférences */}
              <div className="ms-panel-left">
                <form onSubmit={handleSubmit}>
                  <div className="ms-panel">
                    <div className="ms-panel-head">
                      <div className="ms-panel-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                        </svg>
                      </div>
                      <span className="ms-panel-title">{t('settings.notifications', 'Notifications')}</span>
                    </div>

                    <div className="ms-section">
                      <div className="ms-section-label">{t('settings.notificationChannels', 'Canaux de notification')}</div>
                      {[
                        {
                          key: 'email', checked: emailNotifications, onChange: (v: boolean) => setEmailNotifications(v),
                          name: t('settings.emailNotif', 'Notifications e-mail'), desc: t('settings.emailNotifDesc', 'Recevez les alertes directement dans votre boîte mail'),
                          color: '#2563EB', bg: '#EFF6FF',
                          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
                        },
                        {
                          key: 'sms', checked: smsNotifications, onChange: (v: boolean) => setSmsNotifications(v),
                          name: t('settings.smsNotif', 'Notifications SMS'), desc: t('settings.smsNotifDesc', 'Recevez un SMS pour les alertes importantes'),
                          color: '#059669', bg: '#ECFDF5',
                          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
                        },
                        {
                          key: 'push', checked: pushNotifications, onChange: togglePushNotifications,
                          name: t('settings.pushNotif', 'Notifications push'), desc: t('settings.pushNotifDesc', 'Notifications navigateur si activées sur votre appareil'),
                          color: '#7C3AED', bg: '#F5F3FF',
                          icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
                        },
                      ].map(row => (
                        <label key={row.key} className={`ms-toggle-row${row.checked ? ' active' : ''}`}>
                          <div className="ms-toggle-info">
                            <div className="ms-toggle-ico" style={{ background: row.bg, color: row.color }}>{row.icon}</div>
                            <div className="ms-toggle-text">
                              <div className="ms-toggle-name">{row.name}</div>
                              <div className="ms-toggle-desc">{row.desc}</div>
                            </div>
                          </div>
                          <div className="ms-switch">
                            <input
                              type="checkbox"
                              checked={row.checked}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => row.onChange(e.target.checked)}
                            />
                            <div className="ms-switch-track" />
                            <div className="ms-switch-thumb" />
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="ms-section">
                      <div className="ms-section-label">{t('settings.languageDisplay', 'Langue & affichage')}</div>
                      <div className="ms-field">
                        <label className="ms-label">{t('settings.interfaceLanguage', 'Langue de l\'interface')}</label>
                        <div className="ms-select-wrap">
                          <select
                            className="ms-select"
                            value={i18n.language}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => i18n.changeLanguage(e.target.value)}
                          >
                            <option value="fr">Fran&ccedil;ais</option>
                            <option value="en">English</option>
                            <option value="es">Espa&ntilde;ol</option>
                            <option value="pt">Portugu&ecirc;s</option>
                            <option value="ff">Peulh (Pulaar)</option>
                            <option value="ar">&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577; (Arabe)</option>
                          </select>
                          <span className="ms-select-chevron">
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                            </svg>
                          </span>
                        </div>
                      </div>

                      <div className="ms-field">
                        <label className="ms-label">{t('settings.theme', 'Thème')}</label>
                        <div className="ms-theme-row">
                          {([
                            { value: 'light', label: t('settings.themeLight', 'Clair'), icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
                            { value: 'dark',  label: t('settings.themeDark', 'Sombre'), icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> },
                            { value: 'system',label: t('settings.themeSystem', 'Système'), icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                          ] as const).map(tPill => (
                            <button
                              key={tPill.value} type="button"
                              className={`ms-theme-pill${mounted && theme === tPill.value ? ' active' : ''}`}
                              onClick={() => setTheme(tPill.value)}
                            >
                              {tPill.icon}{tPill.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="ms-footer" style={{ justifyContent: 'flex-start' }}>
                      <button type="submit" className="ms-submit" disabled={saving}>
                        {saving ? (
                          <><div className="ms-spinner" />{t('settings.saving', 'Enregistrement...')}</>
                        ) : (
                          <>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            {t('settings.savePreferences', 'Enregistrer les préférences')}
                          </>
                        )}
                      </button>
                      {message && (
                        <div className={`ms-toast${message.ok ? ' ok' : ' err'}`}>
                          {message.ok
                            ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                            : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                          }
                          {message.text}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Panel 2 : Sécurité (Masqué par défaut) */}
              <div className="ms-panel-left" style={{ animationDelay: '.15s' }}>
                <div className="ms-panel">
                  <div className="ms-panel-head">
                    <div className="ms-panel-ico" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', boxShadow: '0 2px 8px rgba(37,99,235,.3)' }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </div>
                    <span className="ms-panel-title">{t('settings.securityTitle', 'Sécurité du compte')}</span>
                  </div>

                  <div className="ms-panel-body">
                    {!showSecurityFields ? (
                      <button 
                        type="button" 
                        className="ms-unlock-btn"
                        onClick={() => {
                          setPassword('');
                          setConfirmPassword('');
                          setShowSecurityFields(true);
                        }}
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {t('settings.changePasswordBtn', 'Modifier le mot de passe')}
                      </button>
                    ) : (
                      <form onSubmit={handlePasswordSubmit} className="ms-form-stack" style={{ animation: 'msin 0.3s ease-out' }}>
                        <Field
                          label={t('settings.newPassword', 'Nouveau mot de passe')}
                          type="password"
                          value={password}
                          onChange={setPassword}
                          placeholder={t('settings.newPasswordPlaceholder', 'Entrez votre nouveau mot de passe')}
                          required
                          hint={t('settings.passwordHint', 'Utilisez au moins 8 caractères.')}
                          autoComplete="new-password"
                          isRTL={isRTL}
                        />
                        <Field
                          label={t('settings.confirmPassword', 'Confirmer nouveau mot de passe')}
                          type="password"
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          placeholder={t('settings.confirmPasswordPlaceholder', 'Retapez le mot de passe')}
                          required
                          autoComplete="new-password"
                          isRTL={isRTL}
                        />

                        <div className="ms-footer" style={{ padding: '1rem 0 0 0', marginTop: '.25rem', borderTop: 'none' }}>
                          <div className="ms-footer-left">
                            {secMsg?.type === 'success' && (
                              <div className="ms-msg-success">
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {secMsg.text}
                              </div>
                            )}
                            {secMsg?.type === 'error' && (
                              <div className="ms-msg-error">
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
                                {secMsg.text}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button 
                              type="button" 
                              onClick={handleCancelPassword}
                              style={{ background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#6B7280', cursor: 'pointer' }}
                            >
                              {t('settings.cancel', 'Annuler')}
                            </button>
                            <button type="submit" className="ms-submit" disabled={secLoading || !isPasswordDirty}>
                              {secLoading
                                ? <><div className="ms-spinner" />{t('settings.updating', 'Mise à jour...')}</>
                                : <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M5 13l4 4L19 7" /></svg>{t('settings.update', 'Mettre à jour')}</>
                              }
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN : Status steps */}
            <div className="ms-panel-right">
              <div className="ms-panel">
                <div className="ms-panel-head">
                  <div className="ms-panel-ico" style={{ background: '#FFFBEB', color: '#D97706' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <span className="ms-panel-title">{t('settings.statusTitle', 'Rappel — Statut de compte')}</span>
                </div>
                <div className="ms-steps">
                  {STEPS.map((s, i) => (
                    <div key={i} className="ms-step">
                      <div className="ms-step-ico" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                        {s.icon}
                      </div>
                      <div>
                        <div className="ms-step-title">{s.title}</div>
                        <div className="ms-step-desc">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
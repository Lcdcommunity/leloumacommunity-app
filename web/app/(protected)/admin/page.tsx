// web/app/(protected)/admin/settings/page.tsx
'use client';

import { type ChangeEvent, type FormEvent, useState, useEffect } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { api } from '../../../lib/api-client';
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

/* ══════════════════════════════════════════════════════ FIELD COMPONENT */
function Field({
  label, value, onChange, placeholder, required = false, mono = false, hint, type = 'text', disabled = false, autoComplete, isRTL = false
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; mono?: boolean; hint?: string; type?: string; disabled?: boolean; autoComplete?: string; isRTL?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
        {label}{required && <span style={{ color: '#2563EB', margin: isRTL ? '0 3px 0 0' : '0 0 0 3px' }}>*</span>}
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

export default function AdminSettingsPage() {
  // Traduction et Thème
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // La vérification parfaite pour l'Arabe (RTL)
  const isRTL = i18n.language === 'ar';

  // Preferences states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefMsg, setPrefMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Security states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secLoading, setSecLoading] = useState(false);
  const [secMsg, setSecMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    // Vérifier au chargement si l'utilisateur a déjà activé les notifications Push
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          if (subscription) {
            setPushNotifications(true);
          }
        });
      });
    }
  }, []);

  const RULES = [
    {
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
        </svg>
      ),
      title: t('settings.rule1Title', 'Admins & Antennes'),
      desc: t('settings.rule1Desc', 'La création d\'antennes et l\'ajout de nouveaux administrateurs sont strictement réservés au Super Admin.'),
      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
    },
    {
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      ),
      title: t('settings.rule2Title', 'Validation des membres'),
      desc: t('settings.rule2Desc', 'Vous ne pouvez valider que les membres rattachés spécifiquement à votre antenne.'),
      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
    },
    {
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      title: t('settings.rule3Title', 'Cotisations'),
      desc: t('settings.rule3Desc', 'Ne validez les cotisations qu\'après confirmation d\'une réception réelle sur les comptes.'),
      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
    }
  ];

  /* ── Gestion des Notifications Push ── */
  const togglePushNotifications = async (enable: boolean) => {
    if (!enable) {
      // Désactivation
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          // Notifie le backend de supprimer la subscription
          if (subscription.endpoint) {
             await api.unsubscribePushNotifications(subscription.endpoint).catch(() => {});
          }
        }
        setPushNotifications(false);
        setPrefMsg({ text: t('settings.pushDisabled', 'Notifications push désactivées.'), ok: true });
      } catch(e) {
        console.error('Erreur désactivation push:', e);
      }
      return;
    }

    // Activation
    try {
      // Vérifie la support navigateur
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error(t('settings.pushNotSupported', 'Votre navigateur ne supporte pas les notifications push.'));
      }

      // Vérifie la clé VAPID côté client
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidPublicKey) {
        throw new Error(t('settings.vapidMissing', 'Configuration push manquante. Contactez l\'administrateur.'));
      }

      // Demande la permission
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        throw new Error(t('settings.pushPermissionDenied', 'Permission refusée. Activez les notifications dans les paramètres de votre navigateur.'));
      }
      if (permission !== 'granted') {
        throw new Error(t('settings.pushPermissionRequired', 'Permission nécessaire pour les notifications push.'));
      }

      // Enregistre le Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Souscrit au push
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      // Envoie au backend
      const subJson = subscription.toJSON();
      if (subJson.endpoint && subJson.keys && subJson.keys.p256dh && subJson.keys.auth) {
        await api.subscribeToPushNotifications({
          endpoint: subJson.endpoint,
          expirationTime: subJson.expirationTime ?? null,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth
          }
        });

        setPushNotifications(true);
        setPrefMsg({ text: t('settings.pushEnabled', 'Notifications push activées !'), ok: true });
      }

    } catch (error) {
      console.error('Erreur Push:', error);
      setPushNotifications(false);
      
      // Message user-friendly
      const errorMessage = error instanceof Error 
        ? error.message 
        : t('settings.pushError', 'Erreur lors de l\'activation des notifications push.');
      
      setPrefMsg({ text: errorMessage, ok: false });
    }
  };

  async function handlePreferencesSubmit(e: FormEvent) {
    e.preventDefault();
    setPrefLoading(true);
    setPrefMsg(null);
    try {
      await api.updateMemberPreferences({
        emailNotifications,
        smsNotifications,
        pushNotifications,
        language: i18n.language,
        theme: theme
      });
      setPrefMsg({ text: t('settings.saveSuccess', 'Préférences enregistrées avec succès.'), ok: true });
    } catch {
      setPrefMsg({ text: t('settings.saveError', 'Erreur lors de l\'enregistrement des préférences.'), ok: false });
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
      await api.updateMyPassword(password);
      setSecMsg({ type: 'success', text: 'Mot de passe mis à jour avec succès.' });
      setPassword('');
      setConfirmPassword('');
      setFormKey(prev => prev + 1);

      setTimeout(() => {
        setIsChangingPassword(false);
        setSecMsg(null);
      }, 2500);
      
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour.';
      setSecMsg({ type: 'error', text: errorMsg });
    } finally {
      setSecLoading(false);
    }
  };

  const cancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPassword('');
    setConfirmPassword('');
    setSecMsg(null);
    setFormKey(prev => prev + 1);
  };

  const isPasswordDirty = password.length > 0 || confirmPassword.length > 0;

  return (
    <AppShell title={`${t('settings.pageTitle', 'Paramètres &')} ${t('settings.pageTitleHighlight', 'Règles')}`}>
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');

          .ast-wrap {
            font-family: 'DM Sans', sans-serif;
            padding: clamp(1.25rem, 3vw, 2rem);
            max-width: 1050px; margin: 0 auto;
          }

          /* Header */
          .ast-header { margin-bottom: 1.75rem; opacity: 0; transform: translateY(10px); animation: astin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
          .ast-eyebrow { font-size: 0.67rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
          .ast-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: astpulse 2s ease-in-out infinite; }
          @keyframes astpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
          .ast-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.9rem); font-weight: 700; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
          .ast-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

          /* Layout 2-col */
          .ast-layout { display: grid; grid-template-columns: 1fr 380px; gap: 1.4rem; align-items: start; }
          .ast-left-col { display: flex; flex-direction: column; gap: 1.4rem; }
          @media(max-width:900px) { .ast-layout { grid-template-columns: 1fr; } }

          /* Panel */
          .ast-panel {
            background: rgba(253,253,255,0.93); backdrop-filter: blur(12px); border-radius: 20px;
            border: 1px solid rgba(37,99,235,0.09); box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
            overflow: hidden;
            opacity: 0; transform: translateY(10px); animation: astin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
          }

          .ast-panel-head { padding: 1.2rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.07); display: flex; align-items: center; gap: 0.6rem; }
          .ast-panel-ico { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ast-panel-title { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; }
          .ast-panel-body { padding: 1.5rem; }

          /* Form stack & Sections */
          .ast-form-stack { display: flex; flex-direction: column; gap: 1.1rem; }
          .ast-section { padding: 1.2rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.06); }
          .ast-section:last-child { border-bottom: none; }
          .ast-section-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 0.85rem; }
          
          /* Toggles */
          .ast-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0.85rem; border-radius: 12px; border: 1px solid rgba(37,99,235,0.09); background: rgba(249,250,251,0.6); margin-bottom: 0.55rem; gap: 0.75rem; transition: background 0.2s, border-color 0.2s; cursor: pointer; }
          .ast-toggle-row:last-child { margin-bottom: 0; }
          .ast-toggle-row:hover { background: #EFF6FF; border-color: rgba(37,99,235,0.18); }
          .ast-toggle-row.active { background: #EFF6FF; border-color: rgba(37,99,235,0.22); }
          .ast-toggle-info { display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0; pointer-events: none; }
          .ast-toggle-ico { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ast-toggle-name { font-size: 0.83rem; font-weight: 600; color: #111827; }
          .ast-toggle-desc { font-size: 0.68rem; color: #9CA3AF; margin-top: 1px; }
          
          .ast-switch { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
          .ast-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
          .ast-switch-track { position: absolute; inset: 0; border-radius: 99px; background: #E2E8F0; transition: background 0.2s; cursor: pointer; }
          .ast-switch input:checked + .ast-switch-track { background: #2563EB; }
          .ast-switch-thumb { position: absolute; top: 3px; left: ${isRTL ? 'auto' : '3px'}; right: ${isRTL ? '3px' : 'auto'}; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.2s cubic-bezier(.22,1,.36,1); box-shadow: 0 1px 4px rgba(0,0,0,0.15); pointer-events: none; }
          .ast-switch input:checked ~ .ast-switch-thumb { transform: translateX(${isRTL ? '-18px' : '18px'}); }

          /* Preferences Fields */
          .ast-field-group { display: flex; flex-direction: column; gap: 0.38rem; margin-bottom: 0.7rem; }
          .ast-field-group:last-child { margin-bottom: 0; }
          .ast-field-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: #2563EB; }
          .ast-select-wrap { position: relative; }
          .ast-select { width: 100%; height: 44px; padding: 0 ${isRTL ? '1rem' : '2.2rem'} 0 ${isRTL ? '2.2rem' : '1rem'}; border-radius: 11px; border: 1px solid rgba(37,99,235,0.15); background: rgba(255,255,255,0.85); font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #111827; outline: none; -webkit-appearance: none; appearance: none; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
          .ast-select:focus { border-color: rgba(37,99,235,0.5); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); background: white; }
          .ast-select-chevron { position: absolute; right: ${isRTL ? 'auto' : '0.85rem'}; left: ${isRTL ? '0.85rem' : 'auto'}; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }

          .ast-theme-row { display: flex; gap: 0.5rem; }
          .ast-theme-pill { flex: 1; height: 38px; border-radius: 10px; border: 1.5px solid rgba(37,99,235,0.13); background: rgba(255,255,255,0.8); cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 600; color: #374151; display: flex; align-items: center; justify-content: center; gap: 0.35rem; transition: all 0.2s; }
          .ast-theme-pill:hover { border-color: rgba(37,99,235,0.35); background: #EFF6FF; color: #1D4ED8; }
          .ast-theme-pill.active { border-color: #2563EB; background: #EFF6FF; color: #1D4ED8; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

          /* Form footer & Messages */
          .ast-form-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; padding: 1.2rem 1.4rem; border-top: 1px solid rgba(37,99,235,.08); }
          .ast-msg-success { display: flex; align-items: center; gap: .45rem; font-size: .8rem; font-weight: 800; color: #059669; }
          .ast-msg-error { display: flex; align-items: center; gap: .45rem; font-size: .8rem; font-weight: 800; color: #DC2626; }
          
          .ast-toast { display: flex; align-items: center; gap: 0.45rem; padding: 0.6rem 0.9rem; border-radius: 10px; font-size: 0.77rem; font-weight: 600; border: 1px solid; animation: astin 0.3s cubic-bezier(.22,1,.36,1); }
          .ast-toast.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
          .ast-toast.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }
          
          .ast-submit-btn { height: 42px; padding: 0 1.4rem; border-radius: 11px; background: linear-gradient(135deg,#1D4ED8,#3B82F6); border: none; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: .84rem; font-weight: 800; display: flex; align-items: center; gap: .45rem; box-shadow: 0 4px 14px rgba(37,99,235,.32); transition: all .18s; white-space: nowrap; }
          .ast-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,.42); }
          .ast-submit-btn:disabled { opacity: .6; cursor: not-allowed; }

          .ast-cancel-btn { height: 42px; padding: 0 1.4rem; border-radius: 11px; background: white; border: 1.5px solid #E5E7EB; color: #4B5563; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: .84rem; font-weight: 800; transition: all .18s; white-space: nowrap; }
          .ast-cancel-btn:hover { background: #F9FAFB; border-color: #D1D5DB; }

          /* Status steps */
          .ast-steps { display: flex; flex-direction: column; }
          .ast-step { display: flex; gap: 1rem; padding: 1.4rem 1.5rem; border-bottom: 1px solid rgba(37,99,235,0.05); transition: background 0.15s; }
          .ast-step:last-child { border-bottom: none; }
          .ast-step:hover { background: rgba(37,99,235,0.02); }
          .ast-step-ico { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid; }
          .ast-step-title { font-size: 0.9rem; font-weight: 800; color: #111827; margin-bottom: 4px; }
          .ast-step-desc { font-size: 0.8rem; color: #6B7280; line-height: 1.55; }

          @keyframes astin { to { opacity: 1; transform: translateY(0); } }
          @keyframes astspin { to { transform: rotate(360deg); } }
        `}</style>

        <div className="ast-wrap">
          {/* Header */}
          <div className="ast-header">
            <div className="ast-eyebrow"><div className="ast-eyebrow-dot" />{t('settings.adminAntenna', 'Admin antenne')}</div>
            <h1 className="ast-title">{t('settings.pageTitle', 'Paramètres &')} <span>{t('settings.pageTitleHighlight', 'Règles')}</span></h1>
          </div>

          <div className="ast-layout">
            
            {/* ── LEFT COLUMN : Settings ── */}
            <div className="ast-left-col">
              
              {/* 1. Panel Préférences (Notifications / Affichage) */}
              <form onSubmit={handlePreferencesSubmit}>
                <div className="ast-panel">
                  <div className="ast-panel-head">
                    <div className="ast-panel-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                      </svg>
                    </div>
                    <span className="ast-panel-title">{t('settings.preferencesTitle', 'Paramètres & préférences')}</span>
                  </div>

                  <div className="ast-section">
                    <div className="ast-section-label">{t('settings.notificationChannels', 'Canaux de notification')}</div>
                    {[
                      {
                        key: 'email', checked: emailNotifications, onChange: (v: boolean) => setEmailNotifications(v),
                        name: t('settings.emailNotif', 'Notifications e-mail'), desc: t('settings.emailNotifDesc', 'Recevez les alertes directement dans votre boîte mail'),
                        color: '#2563EB', bg: '#EFF6FF',
                        icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
                      },
                      {
                        key: 'sms', checked: smsNotifications, onChange: (v: boolean) => setSmsNotifications(v),
                        name: t('settings.smsNotif', 'Notifications SMS'), desc: t('settings.smsNotifDesc', 'Recevez un SMS pour les alertes importantes'),
                        color: '#059669', bg: '#ECFDF5',
                        icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
                      },
                      {
                        key: 'push', checked: pushNotifications, onChange: togglePushNotifications,
                        name: t('settings.pushNotif', 'Notifications push'), desc: t('settings.pushNotifDesc', 'Notifications navigateur si activées sur votre appareil'),
                        color: '#7C3AED', bg: '#F5F3FF',
                        icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
                      },
                    ].map(row => (
                      <label key={row.key} className={`ast-toggle-row${row.checked ? ' active' : ''}`}>
                        <div className="ast-toggle-info">
                          <div className="ast-toggle-ico" style={{ background: row.bg, color: row.color }}>{row.icon}</div>
                          <div className="ast-toggle-text">
                            <div className="ast-toggle-name">{row.name}</div>
                            <div className="ast-toggle-desc">{row.desc}</div>
                          </div>
                        </div>
                        <div className="ast-switch">
                          <input
                            type="checkbox"
                            checked={row.checked}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => row.onChange(e.target.checked)}
                          />
                          <div className="ast-switch-track" />
                          <div className="ast-switch-thumb" />
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="ast-section">
                    <div className="ast-section-label">{t('settings.languageDisplay', 'Langue & affichage')}</div>
                    <div className="ast-field-group">
                      <label className="ast-field-label">{t('settings.interfaceLanguage', 'Langue de l\'interface')}</label>
                      <div className="ast-select-wrap">
                        <select
                          className="ast-select"
                          value={i18n.language}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                            i18n.changeLanguage(e.target.value);
                          }}
                        >
                          <option value="fr">Français</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="pt">Português</option>
                          <option value="ff">Peulh (Pulaar)</option>
                          <option value="ar">العربية (Arabe)</option>
                        </select>
                        <span className="ast-select-chevron">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div className="ast-field-group">
                      <label className="ast-field-label">{t('settings.theme', 'Thème')}</label>
                      <div className="ast-theme-row">
                        {([
                          { value: 'light', label: t('settings.themeLight', 'Clair'), icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
                          { value: 'dark',  label: t('settings.themeDark', 'Sombre'), icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> },
                          { value: 'system',label: t('settings.themeSystem', 'Système'), icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                        ] as const).map(t => (
                          <button
                            key={t.value} type="button"
                            className={`ast-theme-pill${mounted && theme === t.value ? ' active' : ''}`}
                            onClick={() => setTheme(t.value)}
                          >
                            {t.icon}{t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ast-form-footer" style={{ justifyContent: 'flex-start' }}>
                    <button type="submit" className="ast-submit-btn" disabled={prefLoading}>
                      {prefLoading ? (
                        <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'astspin .7s linear infinite' }} />{t('settings.saving', 'Enregistrement...')}</>
                      ) : (
                        <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{t('settings.savePreferences', 'Enregistrer les préférences')}</>
                      )}
                    </button>
                    {prefMsg && (
                      <div className={`ast-toast${prefMsg.ok ? ' ok' : ' err'}`}>
                        {prefMsg.ok
                          ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                          : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                        }
                        {prefMsg.text}
                      </div>
                    )}
                  </div>
                </div>
              </form>

              {/* 2. Panel Sécurité du compte */}
              <div className="ast-panel" style={{ animationDelay: '.15s' }}>
                <div className="ast-panel-head">
                  <div className="ast-panel-ico" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', color: 'white', boxShadow: '0 2px 8px rgba(37,99,235,.3)' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </div>
                  <span className="ast-panel-title">{t('settings.securityTitle', 'Sécurité du compte')}</span>
                </div>
                
                {!isChangingPassword ? (
                  <div className="ast-panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.5rem' }}>
                    {secMsg?.type === 'success' && (
                      <div className="ast-toast ok" style={{ marginBottom: '1.5rem' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {secMsg.text}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(true);
                        setPassword('');
                        setConfirmPassword('');
                      }}
                      className="ast-cancel-btn"
                      style={{ color: '#2563EB', borderColor: '#BFDBFE', display: 'flex', alignItems: 'center', gap: '.4rem' }}
                    >
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      {t('settings.changePasswordBtn', 'Modifier mon mot de passe')}
                    </button>
                    <p style={{ fontSize: '.75rem', color: '#9CA3AF', marginTop: '1rem' }}>
                      {t('settings.passwordSecureDesc', 'Votre mot de passe est sécurisé. Vous pouvez le changer à tout moment.')}
                    </p>
                  </div>
                ) : (
                  <div className="ast-panel-body">
                    <form key={formKey} onSubmit={handlePasswordSubmit} className="ast-form-stack">
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

                      <div className="ast-form-footer" style={{ padding: '1.2rem 0 0 0', marginTop: '.25rem', borderTop: 'none' }}>
                        <div style={{ flex: 1 }}>
                          {secMsg?.type === 'error' && (
                            <div className="ast-msg-error">
                              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
                              {secMsg.text}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '.7rem' }}>
                          <button type="button" onClick={cancelPasswordChange} className="ast-cancel-btn">
                            {t('settings.cancel', 'Annuler')}
                          </button>
                          <button type="submit" className="ast-submit-btn" disabled={secLoading || !isPasswordDirty}>
                            {secLoading
                              ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'astspin .7s linear infinite' }} />{t('settings.updating', 'Mise à jour...')}</>
                              : <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M5 13l4 4L19 7" /></svg>{t('settings.update', 'Mettre à jour')}</>
                            }
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
              
            </div>

            {/* ── RIGHT COLUMN : Rules ── */}
            <div className="ast-panel" style={{ animationDelay: '.15s' }}>
              <div className="ast-panel-head">
                <div className="ast-panel-ico" style={{ background: '#FFFBEB', color: '#D97706' }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="ast-panel-title">{t('settings.managementRules', 'Règles de gestion')}</span>
              </div>
              
              <div className="ast-steps">
                {RULES.map((s, i) => (
                  <div key={i} className="ast-step">
                    <div className="ast-step-ico" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="ast-step-title">{s.title}</div>
                      <div className="ast-step-desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
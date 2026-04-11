/////// web/app/(protected)/system-admin/settings/page.tsx
'use client';

import { type FormEvent, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';

type Theme = 'light' | 'dark' | 'system';

/* ══════════════════════════════════════════════════════ FIELD COMPONENT */
function Field({
  label, value, onChange, placeholder, required = false, type = 'text', hint, disabled = false
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string; hint?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, color: '#4C1D95', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.4rem' }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{
          width: '100%', height: 44, borderRadius: 12, boxSizing: 'border-box',
          border: `1.5px solid ${disabled ? 'transparent' : focused ? '#7C3AED' : '#EDE9FE'}`,
          background: disabled ? '#F9FAFB' : 'white',
          padding: '0 1rem',
          fontSize: '.9rem', fontWeight: 600, color: '#1F2937', outline: 'none',
          transition: 'all .2s', 
          boxShadow: focused && !disabled ? '0 0 0 4px rgba(124,58,237,0.1)' : 'none'
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <p style={{ marginTop: '.3rem', fontSize: '.7rem', color: '#6B7280', fontWeight: 500 }}>{hint}</p>}
    </div>
  );
}

export default function SystemSettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [platformName, setPlatformName] = useState('LCD Platform');
  const [contactEmail, setContactEmail] = useState('contact@lcd-community.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleCancel = () => {
    setIsEditing(false);
    setPassword('');
    setConfirmPassword('');
    setMsg(null);
  };

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    // 🔒 AJOUT CHIRURGICAL : Vérification de la correspondance des mots de passe
    if (password && password !== confirmPassword) {
      setMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setLoading(true);
    try {
      // TODO: Remplacer ceci par le véritable appel API vers ton backend
      // await api.updateSystemSettings({ platformName, contactEmail, maintenanceMode, theme, password });
      await new Promise(r => setTimeout(r, 1000)); 
      
      setMsg({ type: 'success', text: 'Paramètres enregistrés avec succès !' });
      setIsEditing(false);
      setPassword(''); 
      setConfirmPassword('');
    } catch {
      setMsg({ type: 'error', text: 'Une erreur est survenue lors de l\'enregistrement.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Paramètres Plateforme">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        .set-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.5rem, 4vw, 2.5rem); max-width: 1000px; margin: 0 auto; animation: setin 0.4s ease-out; }
        .set-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .set-title { font-size: 2rem; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin: 0; }
        .set-title span { color: #7C3AED; }
        .set-grid { display: grid; grid-template-columns: 1fr 350px; gap: 1.5rem; }
        @media (max-width: 900px) { .set-grid { grid-template-columns: 1fr; } }
        .set-card { background: white; border-radius: 24px; border: 1px solid #EDE9FE; overflow: hidden; box-shadow: 0 4px 20px rgba(124,58,237,0.05); margin-bottom: 1.5rem; }
        .set-card-head { padding: 1.2rem 1.5rem; border-bottom: 1px solid #F5F3FF; background: #FAF9FF; display: flex; align-items: center; justify-content: space-between; }
        .set-card-title { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #4C1D95; display: flex; align-items: center; gap: 0.6rem; }
        .set-card-body { padding: 1.5rem; }
        .set-btn-edit { padding: 0.5rem 1rem; border-radius: 10px; border: 1px solid #DDD6FE; background: white; color: #7C3AED; font-weight: 700; cursor: pointer; font-size: 0.8rem; }
        .set-footer-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; padding: 1.2rem 1.5rem; background: #F9FAFB; border-top: 1px solid #EDE9FE; }
        .btn-save { background: #7C3AED; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .btn-cancel { background: transparent; color: #6B7280; border: 1px solid #E5E7EB; padding: 0.6rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .set-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-radius: 14px; background: #F5F3FF; border: 1px solid #DDD6FE; }
        .theme-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
        .theme-btn { padding: 0.75rem; border-radius: 12px; border: 2px solid #F3F4F6; background: white; cursor: pointer; font-weight: 700; font-size: 0.8rem; color: #6B7280; }
        .theme-btn.active { border-color: #7C3AED; background: #F5F3FF; color: #7C3AED; }
        @keyframes setin { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <form onSubmit={onSave} className="set-wrap">
        <header className="set-header">
          <div>
            <h1 className="set-title">Paramètres <span>SaaS</span></h1>
            <p style={{ color: '#6B7280', fontWeight: 500, margin: '0.4rem 0 0' }}>Gestion globale de la plateforme LCD.</p>
          </div>
          {!isEditing && (
            <button type="button" className="set-btn-edit" onClick={() => setIsEditing(true)}>
              Modifier les réglages
            </button>
          )}
        </header>

        {msg && (
          <div style={{ 
            padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', 
            background: msg.type === 'success' ? '#ECFDF5' : '#FEF2F2', 
            color: msg.type === 'success' ? '#065F46' : '#991B1B',
            fontWeight: 700, fontSize: '0.9rem', border: `1px solid ${msg.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`
          }}>
            {msg.text}
          </div>
        )}

        <div className="set-grid">
          <div className="set-main">
            <div className="set-card">
              <div className="set-card-head"><span className="set-card-title">🏢 Identité de la Plateforme</span></div>
              <div className="set-card-body">
                <Field label="Nom de la plateforme" value={platformName} onChange={setPlatformName} disabled={!isEditing} />
                <Field label="Email de contact système" value={contactEmail} onChange={setContactEmail} disabled={!isEditing} />
              </div>
            </div>

            <div className="set-card">
              <div className="set-card-head"><span className="set-card-title">🔒 Sécurité du compte</span></div>
              <div className="set-card-body">
                <Field label="Nouveau mot de passe" type="password" value={password} onChange={setPassword} disabled={!isEditing} placeholder={isEditing ? "Laissez vide pour ne pas changer" : "••••••••"} />
                {isEditing && password && (
                  <Field label="Confirmer le mot de passe" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Répétez le mot de passe" />
                )}
                {!isEditing && <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Le mot de passe a été configuré lors de l&apos;installation.</p>}
              </div>
            </div>
          </div>

          <div className="set-side">
            <div className="set-card">
              <div className="set-card-head"><span className="set-card-title">⚙️ État du système</span></div>
              <div className="set-card-body">
                <div className="set-toggle-row">
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>Maintenance</div>
                    <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>Couper les accès</div>
                  </div>
                  <input type="checkbox" checked={maintenanceMode} onChange={e => setMaintenanceMode(e.target.checked)} disabled={!isEditing} style={{ width: 18, height: 18 }} />
                </div>
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#F9FAFB', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.2rem' }}>Version</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1F2937' }}>v1.0.4-stable</div>
                </div>
              </div>
            </div>

            <div className="set-card">
              <div className="set-card-head"><span className="set-card-title">🎨 Affichage</span></div>
              <div className="set-card-body">
                <div className="theme-grid">
                  {(['light', 'dark', 'system'] as Theme[]).map(t => (
                    <button key={t} type="button" className={`theme-btn ${theme === t ? 'active' : ''}`} onClick={() => setTheme(t)} disabled={!isEditing}>
                      {t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Auto'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="set-footer-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel} disabled={loading}>Annuler</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        )}
      </form>
    </AppShell>
  );
}
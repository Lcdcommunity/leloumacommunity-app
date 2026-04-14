// web/app/(protected)/super-admin/communication/page.tsx
'use client';

import React, { type FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { useTranslation } from 'react-i18next';

export default function SuperAdminCommunicationPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [antennas, setAntennas] = useState<{id: string, name: string}[]>([]);
  
  // États du formulaire
  const [targetType, setTargetType] = useState<'ALL' | 'ANTENNA' | 'MEMBER'>('ALL');
  const [targetId, setTargetId] = useState(''); // Contiendra l'ID de l'antenne ou du membre
  
  const [channels, setChannels] = useState({
    inApp: true,
    push: false,
    email: false,
    sms: false,
  });

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Charger la liste des antennes au montage
    api.listAntennas().then(res => {
      setAntennas(res.items || []);
    }).catch(console.error);
  }, []);

  const toggleChannel = (key: keyof typeof channels) => {
    setChannels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (targetType !== 'ALL' && !targetId) {
        throw new Error("Veuillez sélectionner une cible valide.");
      }
      if (!title.trim() || !message.trim()) {
        throw new Error("Le titre et le message sont requis.");
      }

      await api.sendCustomCommunication({
        targetType,
        targetId: targetType === 'ALL' ? undefined : targetId,
        channels,
        title: title.trim(),
        message: message.trim()
      });

      setMsg({ type: 'success', text: "Message envoyé avec succès à la cible !" });
      setTitle('');
      setMessage('');
      setTargetId('');
      
      setTimeout(() => setMsg(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'envoi.";
      setMsg({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Communication">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .comm-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:900px;margin:0 auto}
        
        .comm-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:commin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .comm-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .comm-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:commpulse 2s ease-in-out infinite}
        .comm-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .comm-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        .comm-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:commin .5s .10s cubic-bezier(.22,1,.36,1) forwards}
        .comm-panel-head{padding:1.2rem 1.5rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;gap:.6rem}
        .comm-panel-ico{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3);color:white}
        .comm-panel-title{font-size:.8rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .comm-panel-body{padding:1.5rem}

        .comm-field-group{margin-bottom:1.2rem}
        .comm-label{display:block;font-size:.72rem;font-weight:900;color:#374151;letter-spacing:.07em;text-transform:uppercase;margin-bottom:.45rem}
        .comm-input, .comm-select, .comm-textarea{width:100%;border-radius:11px;border:1.5px solid rgba(220,38,38,.18);background:rgba(255,255,255,.88);padding:0 .95rem;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:600;color:#111827;outline:none;transition:all .2s;box-sizing:border-box}
        .comm-input, .comm-select { height: 44px; }
        .comm-textarea { padding: .75rem .95rem; min-height: 120px; resize: vertical; }
        .comm-input:focus, .comm-select:focus, .comm-textarea:focus{border-color:rgba(220,38,38,.45);background:white;box-shadow:0 0 0 3px rgba(220,38,38,.09)}

        .comm-tabs{display:flex;gap:.5rem;background:rgba(220,38,38,.05);padding:.35rem;border-radius:12px}
        .comm-tab{flex:1;padding:.6rem 0;text-align:center;font-size:.78rem;font-weight:800;color:#6B7280;border-radius:9px;cursor:pointer;transition:all .2s;border:none;background:transparent}
        .comm-tab.active{background:white;color:#DC2626;box-shadow:0 2px 6px rgba(220,38,38,.12)}

        .comm-channels{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.7rem}
        .comm-channel{display:flex;align-items:center;gap:.6rem;padding:.7rem;border:1.5px solid rgba(220,38,38,.1);border-radius:10px;cursor:pointer;transition:all .2s;background:rgba(254,242,242,.3)}
        .comm-channel:hover{background:#FEF2F2;border-color:rgba(220,38,38,.2)}
        .comm-channel.active{background:#FEF2F2;border-color:#DC2626;box-shadow:0 0 0 2px rgba(220,38,38,.1)}
        .comm-channel-name{font-size:.8rem;font-weight:700;color:#1F2937}

        .comm-footer{padding:1.2rem 1.5rem;border-top:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between}
        .comm-submit{height:44px;padding:0 1.5rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:800;display:flex;align-items:center;gap:.5rem;box-shadow:0 4px 14px rgba(220,38,38,.32);transition:all .2s}
        .comm-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(220,38,38,.42)}
        .comm-submit:disabled{opacity:.6;cursor:not-allowed}

        .comm-msg-success{display:flex;align-items:center;gap:.45rem;font-size:.82rem;font-weight:800;color:#059669}
        .comm-msg-error{display:flex;align-items:center;gap:.45rem;font-size:.82rem;font-weight:800;color:#DC2626}
        
        @keyframes commin{to{opacity:1;transform:translateY(0)}}
        @keyframes commpulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes commspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="comm-wrap" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="comm-header">
          <div className="comm-eyebrow"><div className="comm-dot" />Super Admin</div>
          <h1 className="comm-title">Centre de <span>Diffusion</span></h1>
        </div>

        <form onSubmit={(e: FormEvent<HTMLFormElement>) => void handleSubmit(e)} className="comm-panel">
          <div className="comm-panel-head">
            <div className="comm-panel-ico">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <span className="comm-panel-title">Nouveau message</span>
          </div>

          <div className="comm-panel-body">
            
            {/* CIBLE */}
            <div className="comm-field-group">
              <label className="comm-label">1. Définir la cible</label>
              <div className="comm-tabs">
                <button type="button" className={`comm-tab ${targetType === 'ALL' ? 'active' : ''}`} onClick={() => { setTargetType('ALL'); setTargetId(''); }}>
                  Toute l&apos;association
                </button>
                <button type="button" className={`comm-tab ${targetType === 'ANTENNA' ? 'active' : ''}`} onClick={() => { setTargetType('ANTENNA'); setTargetId(''); }}>
                  Une antenne
                </button>
                <button type="button" className={`comm-tab ${targetType === 'MEMBER' ? 'active' : ''}`} onClick={() => { setTargetType('MEMBER'); setTargetId(''); }}>
                  Un membre
                </button>
              </div>
            </div>

            {targetType === 'ANTENNA' && (
              <div className="comm-field-group" style={{ animation: 'commin 0.3s forwards' }}>
                <label className="comm-label">Sélectionner l&apos;antenne</label>
                <select className="comm-select" value={targetId} onChange={e => setTargetId(e.target.value)} required>
                  <option value="">-- Choisir une antenne --</option>
                  {antennas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

            {targetType === 'MEMBER' && (
              <div className="comm-field-group" style={{ animation: 'commin 0.3s forwards' }}>
                <label className="comm-label">ID du Membre (Temporaire pour test)</label>
                <input 
                  type="text" 
                  className="comm-input" 
                  placeholder="Collez l'ID du membre ici..." 
                  value={targetId} 
                  onChange={e => setTargetId(e.target.value)} 
                  required 
                />
              </div>
            )}

            {/* CANAUX */}
            <div className="comm-field-group" style={{ marginTop: '2rem' }}>
              <label className="comm-label">2. Canaux de diffusion</label>
              <div className="comm-channels">
                <div className={`comm-channel ${channels.inApp ? 'active' : ''}`} onClick={() => toggleChannel('inApp')}>
                  <input type="checkbox" checked={channels.inApp} readOnly style={{ accentColor: '#DC2626' }}/>
                  <span className="comm-channel-name">In-App (Cloche)</span>
                </div>
                <div className={`comm-channel ${channels.push ? 'active' : ''}`} onClick={() => toggleChannel('push')}>
                  <input type="checkbox" checked={channels.push} readOnly style={{ accentColor: '#DC2626' }}/>
                  <span className="comm-channel-name">Push Mobile</span>
                </div>
                <div className={`comm-channel ${channels.email ? 'active' : ''}`} onClick={() => toggleChannel('email')}>
                  <input type="checkbox" checked={channels.email} readOnly style={{ accentColor: '#DC2626' }}/>
                  <span className="comm-channel-name">Email</span>
                </div>
                <div className={`comm-channel ${channels.sms ? 'active' : ''}`} onClick={() => toggleChannel('sms')}>
                  <input type="checkbox" checked={channels.sms} readOnly style={{ accentColor: '#DC2626' }}/>
                  <span className="comm-channel-name">SMS</span>
                </div>
              </div>
            </div>

            {/* MESSAGE */}
            <div className="comm-field-group" style={{ marginTop: '2rem' }}>
              <label className="comm-label">3. Rédiger le message</label>
              <input 
                type="text" 
                className="comm-input" 
                placeholder="Titre de la notification..." 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
                style={{ marginBottom: '1rem' }}
              />
              <textarea 
                className="comm-textarea" 
                placeholder="Votre message complet ici..." 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                required 
              />
            </div>

          </div>

          <div className="comm-footer">
            <div>
              {msg?.type === 'success' && (
                <div className="comm-msg-success">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {msg.text}
                </div>
              )}
              {msg?.type === 'error' && (
                <div className="comm-msg-error">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
                  {msg.text}
                </div>
              )}
            </div>
            <button type="submit" className="comm-submit" disabled={loading || (!channels.inApp && !channels.push && !channels.email && !channels.sms)}>
              {loading 
                ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'commspin .7s linear infinite' }} />Envoi en cours...</>
                : <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Envoyer la diffusion</>
              }
            </button>
          </div>
        </form>

      </div>
    </AppShell>
  );
}
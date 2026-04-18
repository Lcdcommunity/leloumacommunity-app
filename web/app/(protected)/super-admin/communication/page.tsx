// web/app/(protected)/super-admin/communication/page.tsx
'use client';

import React, { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';

export default function SuperAdminCommunicationPage() {
  const router = useRouter();

  // Données
  const [antennas, setAntennas] = useState<{id: string, name: string}[]>([]);
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // États du formulaire
  const [targetType, setTargetType] = useState<'ALL' | 'ANTENNA' | 'MEMBER'>('ALL');
  
  // Sélections multiples
  const [selectedAntennaIds, setSelectedAntennaIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  
  // Filtre pour la vue "Membres"
  const [selectedAntennaFilter, setSelectedAntennaFilter] = useState<string>('');

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

  // Charger la liste des antennes au montage
  useEffect(() => {
    api.listAntennas({ pageSize: 100, isActive: true })
      .then(res => setAntennas(res.items || []))
      .catch(console.error);
  }, []);

  // Charger les membres quand le filtre d'antenne change (pour le mode MEMBER)
  useEffect(() => {
    if (targetType === 'MEMBER') {
      setLoadingMembers(true);
      api.listMembers({ 
        pageSize: 500, 
        status: 'ACTIVE',
        ...(selectedAntennaFilter ? { antennaId: selectedAntennaFilter } : {})
      })
      .then(res => setMembers(res.items || []))
      .catch(console.error)
      .finally(() => setLoadingMembers(false));
    }
  }, [targetType, selectedAntennaFilter]);

  const toggleChannel = (key: keyof typeof channels) => {
    setChannels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAntenna = (id: string) => {
    setSelectedAntennaIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleToggleMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSelectAllAntennas = () => {
    if (selectedAntennaIds.length === antennas.length) {
      setSelectedAntennaIds([]); // Tout décocher
    } else {
      setSelectedAntennaIds(antennas.map(a => a.id)); // Tout cocher
    }
  };

  const handleSelectAllMembers = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]); 
    } else {
      setSelectedMemberIds(members.map(m => m.id)); 
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (targetType === 'ANTENNA' && selectedAntennaIds.length === 0) {
        throw new Error("Veuillez sélectionner au moins une antenne.");
      }
      if (targetType === 'MEMBER' && selectedMemberIds.length === 0) {
        throw new Error("Veuillez sélectionner au moins un membre.");
      }
      if (!title.trim() || !message.trim()) {
        throw new Error("Le titre et le message sont requis.");
      }

      let finalTargetIds: string[] = [];
      if (targetType === 'ANTENNA') finalTargetIds = selectedAntennaIds;
      if (targetType === 'MEMBER') finalTargetIds = selectedMemberIds;

      await api.sendCustomCommunication({
        targetType,
        targetIds: targetType === 'ALL' ? undefined : finalTargetIds,
        channels,
        title: title.trim(),
        message: message.trim()
      });

      setMsg({ type: 'success', text: "Message diffusé avec succès !" });
      setTitle('');
      setMessage('');
      setSelectedAntennaIds([]);
      setSelectedMemberIds([]);

      setTimeout(() => setMsg(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'envoi.";
      setMsg({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const isSendDisabled = 
    loading || 
    !title.trim() || 
    !message.trim() || 
    (targetType === 'ANTENNA' && selectedAntennaIds.length === 0) || 
    (targetType === 'MEMBER' && selectedMemberIds.length === 0) || 
    (!channels.inApp && !channels.push && !channels.email && !channels.sms);

  return (
    <AppShell title="Communication">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .comm-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:900px;margin:0 auto}
        
        .comm-back-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 700;
          color: #6B7280; background: none; border: none; cursor: pointer;
          transition: all 0.2s cubic-bezier(.22,1,.36,1); padding: 0; margin-bottom: 1.25rem;
          opacity: 0; transform: translateX(-10px); animation: commin 0.4s ease forwards;
        }
        .comm-back-btn:hover { color: #111827; transform: translateX(-4px); }

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
        .comm-label{display:flex;justify-content:space-between;align-items:center;font-size:.72rem;font-weight:900;color:#374151;letter-spacing:.07em;text-transform:uppercase;margin-bottom:.6rem}
        
        .comm-input, .comm-select, .comm-textarea{width:100%;border-radius:11px;border:1.5px solid rgba(220,38,38,.18);background:rgba(255,255,255,.88);padding:0 .95rem;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:600;color:#111827;outline:none;transition:all .2s;box-sizing:border-box}
        .comm-input, .comm-select { height: 44px; }
        .comm-select { cursor: pointer; }
        .comm-textarea { padding: .75rem .95rem; min-height: 120px; resize: vertical; }
        .comm-input:focus, .comm-select:focus, .comm-textarea:focus{border-color:rgba(220,38,38,.45);background:white;box-shadow:0 0 0 3px rgba(220,38,38,.09)}

        .comm-tabs{display:flex;gap:.5rem;background:rgba(220,38,38,.05);padding:.35rem;border-radius:12px}
        .comm-tab{flex:1;padding:.6rem 0;text-align:center;font-size:.78rem;font-weight:800;color:#6B7280;border-radius:9px;cursor:pointer;transition:all .2s;border:none;background:transparent}
        .comm-tab.active{background:white;color:#DC2626;box-shadow:0 2px 6px rgba(220,38,38,.12)}

        /* SÉLECTEUR MULTIPLE MODERNE */
        .comm-select-all { font-size: .65rem; font-weight: 800; color: #DC2626; cursor: pointer; text-transform: none; letter-spacing: 0; background: rgba(254,242,242,.6); padding: .2rem .6rem; border-radius: 6px; border: 1px solid rgba(220,38,38,.2); transition: all .2s; }
        .comm-select-all:hover { background: rgba(220,38,38,.1); }
        .comm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: .6rem; margin-top: .8rem; max-height: 280px; overflow-y: auto; padding-right: .4rem; }
        .comm-card { display: flex; align-items: center; gap: .7rem; padding: .6rem .8rem; border: 1.5px solid rgba(229,231,235,1); border-radius: 10px; cursor: pointer; transition: all .2s; background: white; }
        .comm-card.active { border-color: #DC2626; background: #FEF2F2; }
        .comm-card:hover:not(.active) { border-color: rgba(220,38,38,.3); transform: translateY(-1px); }
        .comm-chk { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid #D1D5DB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .2s; }
        .active .comm-chk { background: #DC2626; border-color: #DC2626; color: white; }

        .comm-channels{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.7rem}
        .comm-channel{display:flex;align-items:center;gap:.6rem;padding:.7rem;border:1.5px solid rgba(220,38,38,.1);border-radius:10px;cursor:pointer;transition:all .2s;background:rgba(254,242,242,.3)}
        .comm-channel:hover{background:#FEF2F2;border-color:rgba(220,38,38,.2)}
        .comm-channel.active{background:#FEF2F2;border-color:#DC2626;box-shadow:0 0 0 2px rgba(220,38,38,.1)}
        .comm-channel-name{font-size:.8rem;font-weight:700;color:#1F2937}

        .comm-footer{padding:1.2rem 1.5rem;border-top:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between; flex-wrap: wrap; gap: 1rem;}
        .comm-submit{height:44px;padding:0 1.5rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:800;display:flex;align-items:center;gap:.5rem;box-shadow:0 4px 14px rgba(220,38,38,.32);transition:all .2s}
        .comm-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(220,38,38,.42)}
        .comm-submit:disabled{opacity:.6;cursor:not-allowed}

        .comm-msg-success{display:flex;align-items:center;gap:.45rem;font-size:.82rem;font-weight:800;color:#059669; padding: .4rem .8rem; background: #ECFDF5; border-radius: 8px; border: 1px solid #A7F3D0;}
        .comm-msg-error{display:flex;align-items:center;gap:.45rem;font-size:.82rem;font-weight:800;color:#DC2626; padding: .4rem .8rem; background: #FEF2F2; border-radius: 8px; border: 1px solid #FECACA;}
        
        @keyframes commin{to{opacity:1;transform:translateY(0);transform:translateX(0);}}
        @keyframes commpulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes commspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="comm-wrap">

        <button type="button" className="comm-back-btn" onClick={() => router.back()}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour
        </button>

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
                <button type="button" className={`comm-tab ${targetType === 'ALL' ? 'active' : ''}`} onClick={() => setTargetType('ALL')}>
                  Toute l&apos;association
                </button>
                <button type="button" className={`comm-tab ${targetType === 'ANTENNA' ? 'active' : ''}`} onClick={() => setTargetType('ANTENNA')}>
                  Antennes
                </button>
                <button type="button" className={`comm-tab ${targetType === 'MEMBER' ? 'active' : ''}`} onClick={() => setTargetType('MEMBER')}>
                  Membres
                </button>
              </div>
            </div>

            {/* VUE: ANTENNES */}
            {targetType === 'ANTENNA' && (
              <div className="comm-field-group" style={{ animation: 'commin 0.3s forwards' }}>
                <label className="comm-label">
                  <span>Sélectionner les antennes ciblées</span>
                  <button type="button" className="comm-select-all" onClick={handleSelectAllAntennas}>
                    {selectedAntennaIds.length === antennas.length ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                </label>
                <div className="comm-grid">
                  {antennas.map(a => (
                    <div key={a.id} className={`comm-card ${selectedAntennaIds.includes(a.id) ? 'active' : ''}`} onClick={() => handleToggleAntenna(a.id)}>
                      <div className="comm-chk">
                        {selectedAntennaIds.includes(a.id) && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div style={{ fontSize: '.84rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VUE: MEMBRES */}
            {targetType === 'MEMBER' && (
              <div className="comm-field-group" style={{ animation: 'commin 0.3s forwards' }}>
                
                {/* 1. Filtre par antenne */}
                <div style={{ marginBottom: '1.25rem' }}>
                   <label className="comm-label" style={{ textTransform: 'none', letterSpacing: '0', color: '#6B7280' }}>1. Filtrer par antenne (Optionnel)</label>
                   <select 
                     className="comm-select" 
                     value={selectedAntennaFilter} 
                     onChange={e => setSelectedAntennaFilter(e.target.value)}
                   >
                     <option value="">Toutes les antennes</option>
                     {antennas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                   </select>
                </div>

                {/* 2. Liste des membres */}
                <label className="comm-label">
                  <span>2. Sélectionner les membres</span>
                  <button type="button" className="comm-select-all" onClick={handleSelectAllMembers} disabled={loadingMembers || members.length === 0}>
                    {selectedMemberIds.length === members.length && members.length > 0 ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                </label>

                {loadingMembers ? (
                   <span style={{ fontSize: '.8rem', color: '#6B7280' }}>Chargement de la liste...</span>
                ) : members.length === 0 ? (
                   <span style={{ fontSize: '.8rem', color: '#6B7280' }}>Aucun membre trouvé pour cette sélection.</span>
                ) : (
                  <div className="comm-grid">
                    {members.map(m => (
                      <div key={m.id} className={`comm-card ${selectedMemberIds.includes(m.id) ? 'active' : ''}`} onClick={() => handleToggleMember(m.id)}>
                        <div className="comm-chk">
                           {selectedMemberIds.includes(m.id) && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '.82rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.firstName} {m.lastName}
                          </div>
                          <div style={{ fontSize: '.7rem', color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CANAUX */}
            <div className="comm-field-group" style={{ marginTop: '2rem' }}>
              <label className="comm-label" style={{ marginBottom: '.8rem' }}>2. Canaux de diffusion</label>
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
              <label className="comm-label" style={{ marginBottom: '.8rem' }}>3. Rédiger le message</label>
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
            <div style={{ flex: 1 }}>
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
            <button type="submit" className="comm-submit" disabled={isSendDisabled}>
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
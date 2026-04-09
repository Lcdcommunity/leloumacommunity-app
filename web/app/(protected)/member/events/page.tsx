// web/app/(protected)/member/events/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type EventItem } from '../../../../lib/api-client';

// Fonction locale de formatage si formatDate n'est pas dispo dans lib/format
function formatDateTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_MAP: Record<string, string> = { 
  GENERAL_ASSEMBLY: 'A.G.', 
  ANTENNA_MEETING: 'Réunion', 
  FUNDRAISER: 'Levée de fonds', 
  OTHER: 'Autre' 
};

function MemberEventModal({ event, onClose, onSuccess }: { event: EventItem; onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);

  async function handleRSVP(status: 'attending' | 'absent') {
    setSaving(true);
    try {
      await api.registerEventAttendance(event.id, { status });
      onSuccess();
    } catch (err) { 
      console.error(err);
      alert("Erreur lors de l'enregistrement de votre réponse. Veuillez réessayer."); 
    } finally { 
      setSaving(false); 
    }
  }

  return (
    <div className="mev-modal-overlay" onClick={onClose}>
      <div className="mev-modal" onClick={e => e.stopPropagation()}>
        <div style={{ height: 6, background: 'linear-gradient(90deg, #059669, #34D399)' }} />
        
        <div className="mev-modal-head">
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.8rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
            {event.title}
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: 6, fontWeight: 500 }}>
            {formatDateTime(event.startsAt)}
          </div>
        </div>

        <div className="mev-modal-body">
          <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: 16, border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Lieu / Lien
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>
              {event.isOnline ? (
                <a href={event.meetingLink || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Rejoindre la visio
                </a>
              ) : (
                event.locationText || 'Lieu à définir'
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button className="mev-btn-yes" onClick={() => handleRSVP('attending')} disabled={saving}>
              {saving ? 'En cours...' : (
                <>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Je participe
                </>
              )}
            </button>
            <button className="mev-btn-no" onClick={() => handleRSVP('absent')} disabled={saving}>
              {saving ? 'En cours...' : (
                <>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  Je serai absent
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MemberEventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      const res = await api.listEvents(); 
      setItems(res.items); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell title="Mes Événements">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@500;600;700;800&display=swap');
        
        .mev-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 1000px; margin: 0 auto; }
        .mev-title { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem; line-height: 1.1; }
        .mev-title span { color: #059669; }
        
        .mev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
        
        .mev-card { background: white; border: 1px solid #A7F3D0; border-radius: 20px; padding: 1.25rem; box-shadow: 0 4px 15px rgba(5,150,105,0.04); cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; }
        .mev-card:hover { transform: translateY(-4px); box-shadow: 0 12px 25px rgba(5,150,105,0.12); border-color: #34D399; }
        
        .mev-type-badge { position: absolute; top: 1.25rem; right: 1.25rem; background: #ECFDF5; color: #059669; padding: 0.3rem 0.6rem; border-radius: 8px; font-size: 0.65rem; font-weight: 800; border: 1px solid #D1FAE5; }
        
        .mev-date { font-size: 0.75rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
        .mev-name { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; font-weight: 700; color: #111827; line-height: 1.2; margin-bottom: 0.6rem; padding-right: 3rem; }
        .mev-loc { font-size: 0.85rem; color: #6B7280; font-weight: 600; display: flex; align-items: center; gap: 0.3rem; }
        
        /* MODAL RESPONSIVE ET MODERNE */
        .mev-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; padding: 1.2rem; backdrop-filter: blur(5px); }
        .mev-modal { background: white; width: 100%; max-width: 420px; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: mev-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .mev-modal-head { padding: 1.5rem; background: #ECFDF5; border-bottom: 1px solid #A7F3D0; }
        .mev-modal-body { padding: 1.5rem; }
        
        /* BOUTONS */
        .mev-btn-yes { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: linear-gradient(135deg, #059669, #10B981); color: white; border: none; padding: 0.9rem; border-radius: 14px; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: opacity 0.15s, transform 0.1s; }
        .mev-btn-yes:active { transform: scale(0.97); }
        .mev-btn-yes:disabled { opacity: 0.7; cursor: not-allowed; }
        
        .mev-btn-no { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 0.9rem; border-radius: 14px; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: background 0.15s, transform 0.1s; }
        .mev-btn-no:hover { background: #FEE2E2; }
        .mev-btn-no:active { transform: scale(0.97); }
        .mev-btn-no:disabled { opacity: 0.7; cursor: not-allowed; }

        @keyframes mev-pop {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      
      <div className="mev-wrap">
        <h1 className="mev-title">Agenda <span>Associatif</span></h1>

        <div className="mev-grid">
          {loading ? (
            <div style={{ color: '#6B7280', padding: '1rem', fontWeight: 600 }}>Chargement des événements...</div>
          ) : items.length === 0 ? (
            <div style={{ color: '#9CA3AF', padding: '1rem', background: 'white', borderRadius: 16, border: '1px dashed #D1D5DB', textAlign: 'center' }}>
              Aucun événement à venir pour le moment.
            </div>
          ) : (
            items.map(e => (
              <div key={e.id} className="mev-card" onClick={() => setSelectedEvent(e)}>
                <div className="mev-type-badge">{TYPE_MAP[e.type] || 'Événement'}</div>
                <div className="mev-date">{formatDateTime(e.startsAt)}</div>
                <div className="mev-name">{e.title}</div>
                <div className="mev-loc">
                  {e.isOnline ? (
                    <>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      En ligne
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {e.locationText || 'Lieu à définir'}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedEvent && (
        <MemberEventModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          onSuccess={() => { 
            setSelectedEvent(null); 
            void load(); 
          }} 
        />
      )}
    </AppShell>
  );
}
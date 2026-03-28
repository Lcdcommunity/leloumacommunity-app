// web/app/(protected)/member/events/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type EventItem } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';

function MemberEventModal({ event, onClose, onSuccess }: { event: EventItem; onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);

  async function handleRSVP(status: 'ATTENDING' | 'ABSENT') {
    setSaving(true);
    try {
      await api.registerEventAttendance(event.id, { status });
      onSuccess();
    } catch (err) { 
      console.error(err);
      alert('Erreur lors de l\'enregistrement'); 
    } finally { 
      setSaving(false); 
    }
  }

  return (
    <div className="mev-modal-overlay" onClick={onClose}>
      <div className="mev-modal" onClick={e => e.stopPropagation()}>
        <div style={{ height: 4, background: 'linear-gradient(90deg, #059669, #10B981)' }} />
        <div className="mev-modal-head">
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>{event.title}</h2>
          <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 4 }}>{formatDate(event.startsAt)}</div>
        </div>
        <div className="mev-modal-body">
          <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Lieu / Lien</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#059669' }}>
              {event.isOnline ? <a href={event.meetingLink || '#'} target="_blank" rel="noreferrer">Rejoindre la visio</a> : event.locationText || 'Lieu à définir'}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button className="mev-btn-yes" onClick={() => handleRSVP('ATTENDING')} disabled={saving}>✔ Je participe</button>
            <button className="mev-btn-no" onClick={() => handleRSVP('ABSENT')} disabled={saving}>✖ Je serai absent</button>
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
        .mev-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem; }
        .mev-title span { color: #059669; }
        .mev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
        .mev-card { background: white; border: 1px solid #A7F3D0; border-radius: 16px; padding: 1.25rem; box-shadow: 0 4px 12px rgba(5,150,105,0.05); cursor: pointer; transition: transform 0.15s; }
        .mev-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(5,150,105,0.1); }
        .mev-date { font-size: 0.72rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
        .mev-name { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 700; color: #111827; line-height: 1.2; margin-bottom: 0.5rem; }
        .mev-loc { font-size: 0.8rem; color: #6B7280; font-weight: 500; }
        
        .mev-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .mev-modal { background: white; width: 100%; max-width: 420px; border-radius: 20px; overflow: hidden; }
        .mev-modal-head { padding: 1.25rem 1.5rem; background: #ECFDF5; border-bottom: 1px solid #A7F3D0; }
        .mev-modal-body { padding: 1.5rem; }
        .mev-btn-yes { background: linear-gradient(135deg, #059669, #10B981); color: white; border: none; padding: 0.8rem; border-radius: 12px; font-weight: 800; cursor: pointer; }
        .mev-btn-no { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 0.8rem; border-radius: 12px; font-weight: 800; cursor: pointer; }
      `}</style>
      <div className="mev-wrap">
        <h1 className="mev-title">Agenda <span>Associatif</span></h1>
        
        <div className="mev-grid">
          {loading ? (
            <div style={{ color: '#6B7280', padding: '1rem' }}>Chargement des événements...</div>
          ) : items.length === 0 ? (
            <div style={{ color: '#9CA3AF', padding: '1rem' }}>Aucun événement à venir.</div>
          ) : (
            items.map(e => (
              <div key={e.id} className="mev-card" onClick={() => setSelectedEvent(e)}>
                <div className="mev-date">{formatDate(e.startsAt)}</div>
                <div className="mev-name">{e.title}</div>
                <div className="mev-loc">{e.isOnline ? 'En ligne' : e.locationText || 'Lieu à définir'}</div>
              </div>
            ))
          )}
        </div>
      </div>
      {selectedEvent && <MemberEventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onSuccess={() => { setSelectedEvent(null); void load(); }} />}
    </AppShell>
  );
}
// web/app/(protected)/admin/events/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type EventItem } from '../../../../lib/api-client';

const TYPE_MAP: Record<string, string> = { GENERAL_ASSEMBLY: 'A.G.', ANTENNA_MEETING: 'Réunion', FUNDRAISER: 'Levée de fonds', OTHER: 'Autre' };
const STATUS_MAP: Record<string, { label: string, color: string, bg: string }> = {
  DRAFT: { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6' },
  PUBLISHED: { label: 'Publié', color: '#2563EB', bg: '#EFF6FF' },
  COMPLETED: { label: 'Terminé', color: '#059669', bg: '#ECFDF5' },
  CANCELLED: { label: 'Annulé', color: '#DC2626', bg: '#FEF2F2' },
};

function formatDateTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function EventModal({ event, onClose, onSuccess }: { event?: EventItem | null; onClose: () => void; onSuccess: () => void }) {
  const [isEditing, setIsEditing] = useState(!event); 
  
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [type, setType] = useState(event?.type || 'ANTENNA_MEETING');
  const [status, setStatus] = useState(event?.status || 'DRAFT');
  const [startsAt, setStartsAt] = useState(event ? new Date(event.startsAt).toISOString().slice(0, 16) : '');
  const [locationText, setLocationText] = useState(event?.locationText || '');
  const [isOnline, setIsOnline] = useState(event?.isOnline || false);
  const [meetingLink, setMeetingLink] = useState(event?.meetingLink || '');
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { title, description, type, status, startsAt: new Date(startsAt).toISOString(), locationText, isOnline, meetingLink };
      if (event) await api.updateEvent(event.id, payload);
      else await api.createEvent(payload);
      onSuccess();
    } catch (err) { 
      console.error(err); 
      alert('Erreur lors de la sauvegarde'); 
      setSaving(false); 
    }
  }

  async function executeDelete() {
    if (!event) return;
    setDeleting(true);
    setShowDeleteConfirm(false);
    try {
      await api.deleteEvent(event.id);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
      setDeleting(false);
    }
  }

  return (
    <div className="aev-modal-overlay" onClick={onClose}>
      <div className="aev-modal" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        
        {showDeleteConfirm && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #FECACA', textAlign: 'center', maxWidth: 340, animation: 'aescale 0.2s cubic-bezier(.22,1,.36,1)' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem' }}>Supprimer l&apos;événement ?</h3>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 0 1.5rem', lineHeight: 1.5 }}>Cette action est définitive. L&apos;événement sera effacé de l&apos;agenda de tous les membres.</p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: '1px solid #D1D5DB', background: 'white', fontWeight: 700, color: '#4B5563', cursor: 'pointer', transition: 'background 0.15s' }} onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
                <button style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: 'none', background: '#DC2626', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.25)' }} onClick={executeDelete}>Supprimer</button>
              </div>
            </div>
          </div>
        )}

        <div className="aev-modal-head">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase' }}>
            {event ? (isEditing ? "Modifier l'événement" : "Détails de l'événement") : "Nouvel événement"}
          </h2>
          <button className="aev-modal-close" onClick={onClose} disabled={saving || deleting}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {!isEditing && event ? (
          <div className="aev-modal-body">
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem 0', lineHeight: 1.2 }}>
                {event.title}
              </h3>
              <span className="aev-status" style={{ background: STATUS_MAP[event.status].bg, color: STATUS_MAP[event.status].color }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_MAP[event.status].color }}/> {STATUS_MAP[event.status].label}
              </span>
            </div>

            <div className="aev-info-box">
              <span className="aev-info-lbl">Description</span>
              <span className="aev-info-val">{event.description || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Aucune description</span>}</span>
            </div>

            <div className="aev-grid-2">
              <div className="aev-info-box">
                <span className="aev-info-lbl">Date et Heure</span>
                <span className="aev-info-val">{formatDateTime(event.startsAt)}</span>
              </div>
              <div className="aev-info-box">
                <span className="aev-info-lbl">Type</span>
                <span className="aev-info-val">{TYPE_MAP[event.type]}</span>
              </div>
            </div>

            <div className="aev-info-box">
              <span className="aev-info-lbl">{event.isOnline ? 'Lien de la visioconférence' : 'Lieu physique'}</span>
              <span className="aev-info-val">
                {event.isOnline ? (
                  <a href={event.meetingLink || '#'} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'underline' }}>{event.meetingLink || 'Lien à définir'}</a>
                ) : (
                  event.locationText || 'Lieu à définir'
                )}
              </span>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
              <button type="button" className="aev-btn-del" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
              <button type="button" className="aev-btn-submit" onClick={() => setIsEditing(true)}>
                Modifier
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="aev-modal-body">
            <div className="aev-field" style={{ marginBottom: '1rem' }}>
              <label>Titre <span>*</span></label>
              <input className="aev-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex: Réunion mensuelle" />
            </div>

            <div className="aev-field" style={{ marginBottom: '1rem' }}>
              <label>Description</label>
              <textarea className="aev-input" style={{ minHeight: '80px', padding: '0.8rem 1rem', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails de l'événement..." />
            </div>

            <div className="aev-grid-2">
              <div className="aev-field"><label>Type</label><select className="aev-select" value={type} onChange={e => setType(e.target.value)}>{Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="aev-field"><label>Statut</label><select className="aev-select" value={status} onChange={e => setStatus(e.target.value)}>{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div className="aev-field" style={{ gridColumn: '1 / -1' }}><label>Date et heure <span>*</span></label><input type="datetime-local" className="aev-input" value={startsAt} onChange={e => setStartsAt(e.target.value)} required /></div>
            </div>

            <div style={{ marginTop: '1rem', background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <input type="checkbox" checked={isOnline} onChange={e => setIsOnline(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563EB' }} />
                <span style={{ fontWeight: 700, color: '#374151' }}>Événement en ligne (Visio)</span>
              </div>
              {isOnline ? (
                <div className="aev-field"><label>Lien de la réunion</label><input type="url" className="aev-input" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet..." /></div>
              ) : (
                <div className="aev-field"><label>Lieu physique</label><input className="aev-input" value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="Adresse complète..." /></div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
              <button type="button" className="aev-btn-cancel" onClick={() => event ? setIsEditing(false) : onClose()} disabled={saving}>Annuler</button>
              <button type="submit" className="aev-btn-submit" disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminEventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{ isOpen: boolean; event?: EventItem | null }>({ isOpen: false });

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
    <AppShell title="Événements">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@500;600;700;800&display=swap');
        .aev-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 1000px; margin: 0 auto; }
        .aev-header { margin-bottom: 1.5rem; }
        .aev-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; color: #111827; margin: 0; }
        .aev-title span { color: #2563EB; }
        .aev-panel { background: white; border-radius: 20px; border: 1px solid #BFDBFE; box-shadow: 0 4px 20px rgba(37,99,235,0.05); overflow: hidden; }
        .aev-panel-head { padding: 1rem 1.4rem; border-bottom: 1px solid #DBEAFE; display: flex; justify-content: space-between; align-items: center; background: #EFF6FF; }
        .aev-new-btn { background: linear-gradient(135deg, #1D4ED8, #3B82F6); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.25); transition: transform 0.15s; }
        .aev-new-btn:hover { transform: translateY(-1px); }
        .aev-table { width: 100%; border-collapse: collapse; }
        .aev-table th { padding: 0.85rem 1.4rem; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: #6B7280; text-align: left; }
        .aev-row { border-top: 1px solid #F3F4F6; cursor: pointer; transition: background 0.15s; } 
        .aev-row:hover { background: #F8FAFC; }
        .aev-table td { padding: 1rem 1.4rem; font-size: 0.85rem; font-weight: 600; color: #111827; }
        .aev-status { padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.65rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid rgba(0,0,0,0.05); }
        
        .aev-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px); }
        .aev-modal { background: white; width: 100%; max-width: 500px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        .aev-modal-head { padding: 1.25rem 1.5rem; background: #EFF6FF; border-bottom: 1px solid #BFDBFE; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .aev-modal-close { background: white; border: 1px solid #BFDBFE; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1D4ED8; }
        .aev-modal-body { padding: 1.5rem; overflow-y: auto; }
        .aev-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .aev-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .aev-field label { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; color: #1D4ED8; }
        .aev-field label span { color: #9CA3AF; }
        .aev-input, .aev-select { height: 42px; border-radius: 10px; border: 1px solid #D1D5DB; padding: 0 1rem; font-family: 'DM Sans'; font-size: 0.88rem; font-weight: 600; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .aev-input:focus, .aev-select:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .aev-select { appearance: none; padding-right: 2.2rem; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.8rem center; cursor: pointer; }
        
        .aev-info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.8rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
        .aev-info-lbl { font-size: 0.65rem; font-weight: 800; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.08em; }
        .aev-info-val { font-size: 0.9rem; font-weight: 600; color: #111827; white-space: pre-wrap; line-height: 1.4; }

        .aev-btn-submit { background: linear-gradient(135deg, #1D4ED8, #3B82F6); color: white; border: none; padding: 0 1.4rem; height: 42px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: transform 0.15s; }
        .aev-btn-cancel { background: white; border: 1px solid #D1D5DB; color: #4B5563; padding: 0 1.4rem; height: 42px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .aev-btn-del { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 0 1.4rem; height: 42px; border-radius: 10px; font-weight: 800; cursor: pointer; }
        
        @keyframes aescale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @media (max-width: 600px) { .aev-grid-2 { grid-template-columns: 1fr; } .hide-mobile { display: none; } }
      `}</style>
      <div className="aev-wrap">
        <div className="aev-header"><h1 className="aev-title">Calendrier des <span>Événements</span></h1></div>
        <div className="aev-panel">
          <div className="aev-panel-head">
            <span style={{ fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', fontSize: '0.8rem' }}>Agenda</span>
            <button className="aev-new-btn" onClick={() => setModalState({ isOpen: true })}>+ Organiser</button>
          </div>
          <table className="aev-table">
            <thead><tr><th>Titre</th><th className="hide-mobile">Date & Heure</th><th>Statut</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Chargement des événements...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>Aucun événement enregistré.</td></tr>
              ) : (
                items.map(e => {
                  const s = STATUS_MAP[e.status] || STATUS_MAP.DRAFT;
                  return (
                    <tr key={e.id} className="aev-row" onClick={() => setModalState({ isOpen: true, event: e })}>
                      <td>{e.title} <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2 }}>{TYPE_MAP[e.type]}</div></td>
                      <td className="hide-mobile" style={{ color: '#374151' }}>{formatDateTime(e.startsAt)}</td>
                      <td>
                        <span className="aev-status" style={{ background: s.bg, color: s.color }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }}/> {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modalState.isOpen && <EventModal event={modalState.event} onClose={() => setModalState({ isOpen: false })} onSuccess={() => { setModalState({ isOpen: false }); void load(); }} />}
    </AppShell>
  );
}
// web/app/(protected)/admin/events/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type EventItem } from '../../../../lib/api-client';

interface AttendanceItem {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
}

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

// ----------------------------------------------------------------------
// MODAL : GESTION DE L'ÉVÉNEMENT (CRÉATION / MODIFICATION ADMIN)
// ----------------------------------------------------------------------
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

  // 👇 CORRECTION : Blocage du scroll de l'arrière-plan quand le modal est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

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
                <input type="checkbox" checked={isOnline} onChange={e => setIsOnline(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563EB' }} id="cb-online" />
                <label htmlFor="cb-online" style={{ fontWeight: 700, color: '#374151', cursor: 'pointer', textTransform: 'none', fontSize: '0.9rem' }}>Événement en ligne (Visio)</label>
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

// ----------------------------------------------------------------------
// MODAL : GESTION DES PRÉSENCES (FILTRE OUI / NON) - ADMIN ANTENNE
// ----------------------------------------------------------------------
function AttendanceModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  // 👇 ICI: MAJUSCULES
  const [filter, setFilter] = useState<'ALL' | 'ATTENDING' | 'ABSENT'>('ALL');
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttendances() {
      setLoading(true);
      try {
        const res = await api.listEventAttendances(event.id, { 
          status: filter === 'ALL' ? undefined : filter,
          pageSize: 100 
        });
        setAttendances(res.items as unknown as AttendanceItem[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    void loadAttendances();
  }, [event.id, filter]);

  return (
    <div className="aev-modal-overlay" onClick={onClose}>
      <div className="aev-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="aev-modal-head">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase' }}>
            Présences : {event.title}
          </h2>
          <button className="aev-modal-close" onClick={onClose}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <div className="aev-tabs">
            {/* 👇 ICI: MAJUSCULES */}
            <button className={`aev-tab ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>Toutes les réponses</button>
            <button className={`aev-tab ${filter === 'ATTENDING' ? 'active' : ''}`} onClick={() => setFilter('ATTENDING')} style={filter === 'ATTENDING' ? { color: '#059669', borderColor: '#059669', background: '#ECFDF5' } : {}}>✅ Présents</button>
            <button className={`aev-tab ${filter === 'ABSENT' ? 'active' : ''}`} onClick={() => setFilter('ABSENT')} style={filter === 'ABSENT' ? { color: '#DC2626', borderColor: '#DC2626', background: '#FEF2F2' } : {}}>❌ Absents</button>
          </div>
        </div>

        <div className="aev-modal-body" style={{ background: '#F9FAFB' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280', fontWeight: 600 }}>Chargement des réponses...</div>
          ) : attendances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', background: 'white', borderRadius: 12, border: '1px dashed #D1D5DB' }}>Aucun membre n&apos;a répondu pour le moment.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {attendances.map(att => (
                <div key={att.id} style={{ background: 'white', padding: '1rem', borderRadius: 12, border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.95rem' }}>{att.user.firstName} {att.user.lastName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>{att.user.email} {att.user.phone ? `• ${att.user.phone}` : ''}</div>
                  </div>
                  <div>
                    {/* 👇 ICI: MAJUSCULES (FIN DU BUG ABSENT) */}
                    {att.status === 'ATTENDING' ? (
                      <span style={{ display: 'inline-block', padding: '0.3rem 0.8rem', background: '#D1FAE5', color: '#065F46', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800 }}>Participent</span>
                    ) : (
                      <span style={{ display: 'inline-block', padding: '0.3rem 0.8rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800 }}>Absents</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// PAGE PRINCIPALE : ADMIN D'ANTENNE
// ----------------------------------------------------------------------
export default function AdminEventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États des modaux
  const [modalState, setModalState] = useState<{ isOpen: boolean; event?: EventItem | null }>({ isOpen: false });
  const [attendanceModal, setAttendanceModal] = useState<{ isOpen: boolean; event?: EventItem | null }>({ isOpen: false });

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      const res = await api.listEvents(); 
      setItems(res?.items || []); 
    } catch (err) { 
      console.error(err); 
      setItems([]); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell title="Événements">
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@500;600;700;800&display=swap');
          
          /* 👇 CORRECTION : Sécurisation du layout principal */
          .aev-wrap { 
            font-family: 'DM Sans', sans-serif; 
            padding: clamp(1rem, 3vw, 2rem); 
            width: 100%;
            max-width: 1000px; 
            margin: 0 auto; 
            box-sizing: border-box;
          }
          
          .aev-header { margin-bottom: 1.5rem; }
          .aev-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; color: #111827; margin: 0; }
          .aev-title span { color: #2563EB; }
          
          .aev-panel { 
            background: white; 
            border-radius: 20px; 
            border: 1px solid #BFDBFE; 
            box-shadow: 0 4px 20px rgba(37,99,235,0.05); 
            width: 100%;
            overflow: hidden; 
            box-sizing: border-box;
          }
          
          .aev-panel-head { padding: 1rem 1.4rem; border-bottom: 1px solid #DBEAFE; display: flex; justify-content: space-between; align-items: center; background: #EFF6FF; }
          .aev-new-btn { background: linear-gradient(135deg, #1D4ED8, #3B82F6); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.25); transition: transform 0.15s; }
          
          /* 👇 CORRECTION : Container du tableau scrolable sans casser la page */
          .aev-table-container {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .aev-table { width: 100%; border-collapse: collapse; /* Suppression du min-width: 400px pour éviter le scroll */ }
          .aev-table th { padding: 0.75rem 0.75rem; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: #6B7280; text-align: left; white-space: nowrap; }
          .aev-row { border-top: 1px solid #F3F4F6; cursor: pointer; transition: background 0.15s; } 
          .aev-row:hover { background: #F8FAFC; }
          .aev-table td { padding: 0.85rem 0.75rem; font-size: 0.8rem; font-weight: 600; color: #111827; vertical-align: middle; }
          .aev-status { padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.65rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid rgba(0,0,0,0.05); white-space: nowrap; }
          
          .aev-action-btn { background: white; border: 1px solid #D1D5DB; color: #374151; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
          .aev-action-btn:hover { background: #F3F4F6; border-color: #9CA3AF; }
          .aev-action-btn.primary { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
          
          .aev-tabs { display: flex; gap: 0.5rem; background: #E2E8F0; padding: 0.25rem; border-radius: 10px; }
          .aev-tab { flex: 1; text-align: center; padding: 0.5rem; border-radius: 8px; font-size: 0.75rem; font-weight: 800; color: #6B7280; border: 1px solid transparent; background: transparent; cursor: pointer; transition: all 0.15s; }
          .aev-tab.active { background: white; color: #111827; border-color: #D1D5DB; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

          /* 👇 CORRECTION : Styles des modaux sécurisés */
          .aev-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px); }
          .aev-modal { background: white; width: 100%; max-width: 500px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
          .aev-modal-head { padding: 1.25rem 1.5rem; background: #EFF6FF; border-bottom: 1px solid #BFDBFE; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
          .aev-modal-close { background: white; border: 1px solid #BFDBFE; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1D4ED8; flex-shrink: 0; }
          
          /* 👇 CORRECTION : Overflow uniquement dans le body du modal */
          .aev-modal-body { padding: 1.5rem; overflow-y: auto; -webkit-overflow-scrolling: touch; }
          
          .aev-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .aev-field { display: flex; flex-direction: column; gap: 0.35rem; }
          .aev-field label { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; color: #1D4ED8; }
          .aev-input, .aev-select { width: 100%; box-sizing: border-box; height: 42px; border-radius: 10px; border: 1px solid #D1D5DB; padding: 0 1rem; font-family: 'DM Sans'; font-size: 0.88rem; font-weight: 600; outline: none; }
          .aev-input:focus, .aev-select:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
          
          .aev-btn-submit { background: linear-gradient(135deg, #1D4ED8, #3B82F6); color: white; border: none; padding: 0 1.4rem; height: 42px; border-radius: 10px; font-weight: 800; cursor: pointer; }
          .aev-btn-cancel { background: white; border: 1px solid #D1D5DB; color: #4B5563; padding: 0 1.4rem; height: 42px; border-radius: 10px; font-weight: 700; cursor: pointer; }
          
          @media (max-width: 600px) { 
            .aev-grid-2 { grid-template-columns: 1fr; } 
            .hide-mobile { display: none; } 
            .aev-actions-td > div { flex-direction: column; align-items: flex-end; gap: 0.3rem; } 
            /* Ajustements mobiles pour éviter le scroll */
            .aev-table th { padding: 0.5rem 0.4rem; font-size: 0.6rem; }
            .aev-table td { padding: 0.6rem 0.4rem; font-size: 0.75rem; }
            .aev-action-btn { padding: 0.3rem 0.5rem; font-size: 0.7rem; }
            .aev-status { padding: 0.15rem 0.4rem; font-size: 0.6rem; }
          }
        `}</style>
        
        <div className="aev-wrap">
          <div className="aev-header"><h1 className="aev-title">Calendrier des <span>Événements</span></h1></div>
          <div className="aev-panel">
            <div className="aev-panel-head">
              <span style={{ fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', fontSize: '0.8rem' }}>Agenda</span>
              <button className="aev-new-btn" onClick={() => setModalState({ isOpen: true })}>+ Organiser</button>
            </div>
            
            <div className="aev-table-container">
              <table className="aev-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th className="hide-mobile">Date & Heure</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Chargement des événements...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>Aucun événement enregistré.</td></tr>
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
                          <td className="aev-actions-td" style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                {e.type === 'ANTENNA_MEETING' && (
                                  <button className="aev-action-btn primary" onClick={(ev) => { ev.stopPropagation(); setAttendanceModal({ isOpen: true, event: e }); }}>
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    Présences
                                  </button>
                                )}
                                <button className="aev-action-btn" onClick={(ev) => { ev.stopPropagation(); setModalState({ isOpen: true, event: e }); }}>
                                  Détails
                                </button>
                              </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {modalState.isOpen && <EventModal event={modalState.event} onClose={() => setModalState({ isOpen: false })} onSuccess={() => { setModalState({ isOpen: false }); void load(); }} />}
        {attendanceModal.isOpen && attendanceModal.event && <AttendanceModal event={attendanceModal.event} onClose={() => setAttendanceModal({ isOpen: false })} />}
      </div>
    </AppShell>
  );
}
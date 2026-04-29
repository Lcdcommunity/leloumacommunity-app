// web/app/(protected)/super-admin/events/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type EventItem } from '../../../../lib/api-client';
import type { Antenna } from '../../../../types/antenna';

interface AttendanceItem {
  id: string;
  status: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string | null; };
}

interface MemberItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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
// MODAL : GESTION DE L'ÉVÉNEMENT (CRÉATION / MODIFICATION)
// ----------------------------------------------------------------------
function EventModal({ selectedEvent, onClose, onSuccess }: { selectedEvent?: EventItem | null; onClose: () => void; onSuccess: () => void }) {
  const [isEditing, setIsEditing] = useState(!selectedEvent); 

  const [title, setTitle] = useState(selectedEvent?.title || '');
  const [description, setDescription] = useState(selectedEvent?.description || '');
  const [type, setType] = useState(selectedEvent?.type || 'GENERAL_ASSEMBLY');
  const [status, setStatus] = useState(selectedEvent?.status || 'DRAFT');
  const [startsAt, setStartsAt] = useState(selectedEvent ? new Date(selectedEvent.startsAt).toISOString().slice(0, 16) : '');
  const [locationText, setLocationText] = useState(selectedEvent?.locationText || '');
  const [isOnline, setIsOnline] = useState(selectedEvent?.isOnline || false);
  const [meetingLink, setMeetingLink] = useState(selectedEvent?.meetingLink || '');

  const [availableAntennas, setAvailableAntennas] = useState<Antenna[]>([]);
  const [selectedAntennaIds, setSelectedAntennaIds] = useState<string[]>(selectedEvent?.antennas?.map(a => a.id) || []);

  const [inviteAll, setInviteAll] = useState(true);
  const [availableMembers, setAvailableMembers] = useState<MemberItem[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    async function fetchAntennas() {
      try {
        const res = await api.listAntennas({ pageSize: 100, isActive: true });
        setAvailableAntennas(res.items);
      } catch (err) { console.error(err); }
    }
    if (isEditing) void fetchAntennas();
  }, [isEditing]);

  useEffect(() => {
    if (inviteAll || selectedAntennaIds.length === 0) return;
    async function fetchMembers() {
      setLoadingMembers(true);
      try {
        const promises = selectedAntennaIds.map(id => api.listMembers({ antennaId: id, pageSize: 500 }));
        const results = await Promise.all(promises);
        const allMembers = results.flatMap(res => res.items);
        setAvailableMembers(allMembers as unknown as MemberItem[]);
      } catch (err) { console.error(err); } finally { setLoadingMembers(false); }
    }
    void fetchMembers();
  }, [selectedAntennaIds, inviteAll]);

  const toggleAntenna = (id: string) => {
    setSelectedAntennaIds(prev => prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]);
  };
  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]);
  };

  const filteredMembers = availableMembers.filter(m => 
    `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); 
    setSaving(true);
    try {
      const payload = { 
        title, 
        description: description.trim() || undefined, 
        type, 
        status, 
        startsAt: new Date(startsAt).toISOString(), 
        locationText: (!isOnline && locationText.trim()) ? locationText.trim() : undefined, 
        isOnline, 
        meetingLink: (isOnline && meetingLink.trim()) ? meetingLink.trim() : undefined,
        antennaIds: selectedAntennaIds,
        inviteAll,
        memberIds: inviteAll ? [] : selectedMemberIds
      };

      if (selectedEvent) {
        await api.updateEvent(selectedEvent.id, payload);
      } else {
        await api.createEvent(payload);
      }

      onSuccess();
    } catch (err: unknown) { 
      console.error(err); 
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      alert(`Erreur lors de la sauvegarde : ${errorMessage}`); 
      setSaving(false); 
    }
  }

  async function executeDelete() {
    if (!selectedEvent) return;
    setDeleting(true); setShowDeleteConfirm(false);
    try { await api.deleteEvent(selectedEvent.id); onSuccess(); } catch (err) { console.error(err); alert('Erreur'); setDeleting(false); }
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
              <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 0 1.5rem', lineHeight: 1.5 }}>Cette action est globale et définitive. L&apos;événement sera effacé de l&apos;agenda de tous les membres.</p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: '1px solid #D1D5DB', background: 'white', fontWeight: 700, color: '#4B5563', cursor: 'pointer', transition: 'background 0.15s' }} onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
                <button type="button" style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: 'none', background: '#DC2626', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.25)' }} onClick={executeDelete}>Supprimer</button>
              </div>
            </div>
          </div>
        )}

        <div className="aev-modal-head">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase' }}>
            {selectedEvent ? (isEditing ? "Modifier l'événement" : "Détails (Super-Admin)") : "Nouvel événement global"}
          </h2>
          <button className="aev-modal-close" onClick={onClose} disabled={saving || deleting}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {!isEditing && selectedEvent ? (
          <div className="aev-modal-body">
             <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem 0', lineHeight: 1.2 }}>{selectedEvent.title}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="aev-status" style={{ background: STATUS_MAP[selectedEvent.status].bg, color: STATUS_MAP[selectedEvent.status].color }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_MAP[selectedEvent.status].color }}/> {STATUS_MAP[selectedEvent.status].label}
                </span>
                <span className="aev-status" style={{ background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' }}>
                  🌍 {selectedEvent.antennas?.length || 0} antenne(s) ciblée(s)
                </span>
              </div>
            </div>

            <div className="aev-info-box">
              <span className="aev-info-lbl">Description</span>
              <span className="aev-info-val">{selectedEvent.description || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Aucune description</span>}</span>
            </div>

            <div className="aev-grid-2">
              <div className="aev-info-box">
                <span className="aev-info-lbl">Date et Heure</span>
                <span className="aev-info-val">{formatDateTime(selectedEvent.startsAt)}</span>
              </div>
              <div className="aev-info-box">
                <span className="aev-info-lbl">Type</span>
                <span className="aev-info-val">{TYPE_MAP[selectedEvent.type]}</span>
              </div>
            </div>

            <div className="aev-info-box">
              <span className="aev-info-lbl">{selectedEvent.isOnline ? 'Lien de la visioconférence' : 'Lieu physique'}</span>
              <span className="aev-info-val">
                {selectedEvent.isOnline ? (
                  <a href={selectedEvent.meetingLink || '#'} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'underline' }}>{selectedEvent.meetingLink || 'Lien à définir'}</a>
                ) : (
                  selectedEvent.locationText || 'Lieu à définir'
                )}
              </span>
            </div>

            {selectedEvent.antennas && selectedEvent.antennas.length > 0 && (
              <div className="aev-info-box">
                <span className="aev-info-lbl">Antennes concernées</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {selectedEvent.antennas.map(a => (
                    <span key={a.id} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', background: 'white', border: '1px solid #D1D5DB', borderRadius: 6, color: '#374151' }}>
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
              <button type="button" className="aev-btn-del" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>Supprimer</button>
              <button type="button" className="aev-btn-submit" onClick={() => setIsEditing(true)}>Modifier</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="aev-modal-body">
            <div className="aev-field" style={{ marginBottom: '1rem' }}><label>Titre <span>*</span></label><input className="aev-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex: Assemblée Générale" /></div>
            <div className="aev-field" style={{ marginBottom: '1rem' }}><label>Description</label><textarea className="aev-input" style={{ minHeight: '80px', padding: '0.8rem 1rem', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} /></div>

            <div className="aev-grid-2">
              <div className="aev-field"><label>Type</label><select className="aev-select" value={type} onChange={e => setType(e.target.value)}>{Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="aev-field"><label>Statut</label><select className="aev-select" value={status} onChange={e => setStatus(e.target.value)}>{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div className="aev-field" style={{ gridColumn: '1 / -1' }}><label>Date et heure <span>*</span></label><input type="datetime-local" className="aev-input" value={startsAt} onChange={e => setStartsAt(e.target.value)} required /></div>
            </div>

            <div style={{ marginTop: '1rem', background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}><input type="checkbox" checked={isOnline} onChange={e => setIsOnline(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#1D4ED8' }} id="cb-online" /><label htmlFor="cb-online" style={{ fontWeight: 700, color: '#374151', cursor: 'pointer', textTransform: 'none', fontSize: '0.9rem' }}>Événement en ligne (Visio)</label></div>
              {isOnline ? (<div className="aev-field"><label>Lien de la réunion</label><input type="url" className="aev-input" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet..." /></div>) : (<div className="aev-field"><label>Lieu physique</label><input className="aev-input" value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="Adresse complète..." /></div>)}
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#1D4ED8', display: 'block', marginBottom: '0.5rem' }}>Antennes ciblées <span>*</span></label>
              <div className="aev-antennas-grid">
                {availableAntennas.map(a => (
                  <label key={a.id} className={`aev-antenna-cb ${selectedAntennaIds.includes(a.id) ? 'active' : ''}`}><input type="checkbox" checked={selectedAntennaIds.includes(a.id)} onChange={() => toggleAntenna(a.id)} /><span>{a.name}</span></label>
                ))}
              </div>

              {selectedAntennaIds.length > 0 && (
                <div style={{ marginTop: '1rem', background: '#EFF6FF', padding: '1rem', borderRadius: 12, border: '1px solid #BFDBFE' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="checkbox" id="cb-inviteall" checked={inviteAll} onChange={e => setInviteAll(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#1D4ED8' }} />
                    <label htmlFor="cb-inviteall" style={{ fontWeight: 700, color: '#1E3A8A', cursor: 'pointer', fontSize: '0.85rem' }}>Inviter TOUS les membres de ces antennes</label>
                  </div>

                  {!inviteAll && (
                    <div style={{ marginTop: '0.8rem', borderTop: '1px dashed #BFDBFE', paddingTop: '0.8rem' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#1D4ED8', display: 'block', marginBottom: '0.5rem' }}>Sélectionnez les participants</label>
                      
                      <input 
                        type="text" 
                        placeholder="Rechercher par nom, prénom ou email..." 
                        className="aev-input" 
                        style={{ height: '36px', marginBottom: '0.5rem', fontSize: '0.8rem' }}
                        value={memberSearchQuery}
                        onChange={e => setMemberSearchQuery(e.target.value)}
                        disabled={loadingMembers || availableMembers.length === 0}
                      />

                      <div style={{ maxHeight: 150, overflowY: 'auto', background: 'white', border: '1px solid #D1D5DB', borderRadius: 8, padding: '0.5rem' }}>
                        {loadingMembers ? (
                           <div style={{ fontSize: '0.8rem', color: '#6B7280', textAlign: 'center' }}>Chargement...</div> 
                        ) : availableMembers.length === 0 ? (
                           <div style={{ fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center' }}>Aucun membre dans les antennes sélectionnées.</div> 
                        ) : filteredMembers.length === 0 ? (
                           <div style={{ fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center' }}>Aucun résultat pour cette recherche.</div>
                        ) : (
                          filteredMembers.map(m => (
                            <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
                              <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => toggleMember(m.id)} style={{ accentColor: '#1D4ED8' }} />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{m.firstName} {m.lastName}</span>
                              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>({m.email})</span>
                            </label>
                          ))
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '0.5rem', textAlign: 'right', fontWeight: 600 }}>
                        {selectedMemberIds.length} sélectionné(s)
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
              <button type="button" className="aev-btn-cancel" onClick={() => selectedEvent ? setIsEditing(false) : onClose()} disabled={saving}>Annuler</button>
              <button type="submit" className="aev-btn-submit" disabled={saving || selectedAntennaIds.length === 0}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL : GESTION DES PRÉSENCES (FILTRE OUI / NON)
// ----------------------------------------------------------------------
function AttendanceModal({ selectedEvent, onClose }: { selectedEvent: EventItem; onClose: () => void }) {
  const [filter, setFilter] = useState<'ALL' | 'ATTENDING' | 'ABSENT'>('ALL');
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    async function loadAttendances() {
      setLoading(true);
      try {
        const res = await api.listEventAttendances(selectedEvent.id, { 
          status: filter === 'ALL' ? undefined : filter,
          pageSize: 100 
        });
        setAttendances(res.items as unknown as AttendanceItem[]);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    void loadAttendances();
  }, [selectedEvent?.id, filter, selectedEvent]);

  return (
    <div className="aev-modal-overlay" onClick={onClose}>
      <div className="aev-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="aev-modal-head">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase' }}>Présences : {selectedEvent?.title}</h2>
          <button className="aev-modal-close" onClick={onClose}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <div className="aev-tabs">
            <button className={`aev-tab ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>Toutes les réponses</button>
            <button className={`aev-tab ${filter === 'ATTENDING' ? 'active' : ''}`} onClick={() => setFilter('ATTENDING')} style={filter === 'ATTENDING' ? { color: '#059669', borderColor: '#059669', background: '#ECFDF5' } : {}}>✅ Présents</button>
            <button className={`aev-tab ${filter === 'ABSENT' ? 'active' : ''}`} onClick={() => setFilter('ABSENT')} style={filter === 'ABSENT' ? { color: '#DC2626', borderColor: '#DC2626', background: '#FEF2F2' } : {}}>❌ Absents</button>
          </div>
        </div>

        <div className="aev-modal-body" style={{ background: '#F9FAFB' }}>
          {loading ? ( <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280', fontWeight: 600 }}>Chargement...</div> ) : attendances.length === 0 ? ( <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', background: 'white', borderRadius: 12, border: '1px dashed #D1D5DB' }}>Aucun membre n&apos;a répondu.</div> ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {attendances.map(att => (
                <div key={att.id} style={{ background: 'white', padding: '1rem', borderRadius: 12, border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.95rem' }}>{att.user.firstName} {att.user.lastName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>{att.user.email} {att.user.phone ? `• ${att.user.phone}` : ''}</div>
                  </div>
                  <div>
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

export default function SuperAdminEventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventModal, setEventModal] = useState<{ isOpen: boolean; event?: EventItem | null }>({ isOpen: false });
  const [attendanceModal, setAttendanceModal] = useState<{ isOpen: boolean; event?: EventItem | null }>({ isOpen: false });

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.listEvents(); setItems(res?.items || []); } catch (err) { console.error(err); setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell title="Événements Globaux">
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@500;600;700;800&display=swap');
          
          .aev-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); width: 100%; max-width: 1000px; margin: 0 auto; box-sizing: border-box; overflow-x: hidden; }
          .aev-header { margin-bottom: 1.5rem; }
          .aev-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; color: #111827; margin: 0; }
          .aev-title span { color: #1D4ED8; }
          
          .aev-panel { background: white; border-radius: 20px; border: 1px solid #BFDBFE; box-shadow: 0 4px 20px rgba(37,99,235,0.05); width: 100%; overflow: hidden; box-sizing: border-box; }
          .aev-panel-head { padding: 1rem 1.4rem; border-bottom: 1px solid #DBEAFE; display: flex; justify-content: space-between; align-items: center; background: #EFF6FF; }
          .aev-new-btn { background: linear-gradient(135deg, #1D4ED8, #3B82F6); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.25); transition: transform 0.15s; }
          
          .aev-table-container { width: 100%; overflow: hidden; }
          .aev-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          
          .aev-table th { padding: 0.85rem 1.4rem; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: #6B7280; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .aev-row { border-top: 1px solid #F3F4F6; cursor: pointer; transition: background 0.15s; } 
          .aev-row:hover { background: #F8FAFC; }
          .aev-table td { padding: 1rem 1.4rem; font-size: 0.85rem; font-weight: 600; color: #111827; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; }
          .aev-status { padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.65rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid rgba(0,0,0,0.05); white-space: nowrap; }
          
          .aev-action-btn { background: white; border: 1px solid #D1D5DB; color: #374151; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; white-space: nowrap; }
          .aev-action-btn:hover { background: #F3F4F6; border-color: #9CA3AF; }
          .aev-action-btn.primary { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
          
          .aev-tabs { display: flex; gap: 0.5rem; background: #E2E8F0; padding: 0.25rem; border-radius: 10px; }
          .aev-tab { flex: 1; text-align: center; padding: 0.5rem; border-radius: 8px; font-size: 0.75rem; font-weight: 800; color: #6B7280; border: 1px solid transparent; background: transparent; cursor: pointer; transition: all 0.15s; }
          .aev-tab.active { background: white; color: #111827; border-color: #D1D5DB; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

          .aev-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(4px); }
          .aev-modal { background: white; width: 100%; max-width: 500px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
          .aev-modal-head { padding: 1.25rem 1.5rem; background: #EFF6FF; border-bottom: 1px solid #BFDBFE; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
          .aev-modal-close { background: white; border: 1px solid #BFDBFE; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1D4ED8; flex-shrink: 0; }
          
          .aev-modal-body { padding: 1.5rem; overflow-y: auto; -webkit-overflow-scrolling: touch; }
          
          .aev-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .aev-field { display: flex; flex-direction: column; gap: 0.35rem; }
          .aev-field label { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; color: #1D4ED8; }
          .aev-input, .aev-select { width: 100%; box-sizing: border-box; height: 42px; border-radius: 10px; border: 1px solid #D1D5DB; padding: 0 1rem; font-family: 'DM Sans'; font-size: 0.88rem; font-weight: 600; outline: none; }
          .aev-input:focus, .aev-select:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
          
          .aev-btn-submit { background: linear-gradient(135deg, #1D4ED8, #3B82F6); color: white; border: none; padding: 0 1.4rem; height: 42px; border-radius: 10px; font-weight: 800; cursor: pointer; }
          .aev-btn-cancel { background: white; border: 1px solid #D1D5DB; color: #4B5563; padding: 0 1.4rem; height: 42px; border-radius: 10px; font-weight: 700; cursor: pointer; }
          
          .aev-antennas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5rem; max-height: 180px; overflow-y: auto; padding: 0.5rem; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; }
          .aev-antenna-cb { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.6rem; border: 1px solid transparent; border-radius: 8px; cursor: pointer; background: white; }
          .aev-antenna-cb.active { border-color: #60A5FA; background: #EFF6FF; }
          
          /* LAYOUT CARTES MOBILE */
          .aev-cards { display: none; }

          @media (max-width: 768px) { 
            .aev-grid-2 { grid-template-columns: 1fr; } 
            
            /* Cacher le tableau classique */
            .aev-table-container { display: none !important; } 
            
            /* Afficher les cartes */
            .aev-cards { display: flex; flex-direction: column; width: 100%; }
            .aev-card { 
              display: flex; justify-content: space-between; align-items: center; 
              padding: 1rem; border-bottom: 1px solid #F3F4F6; gap: 0.5rem;
            }
            .aev-card:last-child { border-bottom: none; }
            
            /* Colonne 1 : Événement */
            .aev-card-content { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 0; }
            .aev-card-title { font-weight: 800; font-size: 0.9rem; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
            .aev-card-meta { font-size: 0.72rem; color: #6B7280; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            
            /* Colonne 2 : Actions/Présences */
            .aev-card-actions { display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-end; flex-shrink: 0; }
          }
        `}</style>

        <div className="aev-wrap">
          <div className="aev-header"><h1 className="aev-title">Gestion Globale des <span>Événements</span></h1></div>
          <div className="aev-panel">
            <div className="aev-panel-head">
              <span style={{ fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', fontSize: '0.8rem' }}>Agenda du réseau</span>
              <button className="aev-new-btn" onClick={() => setEventModal({ isOpen: true })}>+ Nouvel événement</button>
            </div>

            {/* VUE DESKTOP (Tableau classique) */}
            <div className="aev-table-container">
              <table className="aev-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Événement</th>
                    <th style={{ width: '25%' }}>Date & Heure</th>
                    <th style={{ width: '15%' }}>Cibles</th>
                    <th style={{ width: '15%' }}>Statut</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>Chargement des événements...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>Aucun événement n&apos;a été créé pour le moment.</td></tr>
                  ) : (
                    items.map(e => {
                      const s = STATUS_MAP[e.status] || STATUS_MAP.DRAFT;
                      const antenneCount = e.antennas?.length || 0;

                      return (
                        <tr key={e.id} className="aev-row">
                          <td>
                            <div style={{ fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2, fontWeight: 700 }}>{TYPE_MAP[e.type]}</div>
                          </td>
                          <td style={{ color: '#4B5563', fontSize: '0.8rem' }}>{formatDateTime(e.startsAt)}</td>
                          <td>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#F3F4F6', color: '#4B5563', padding: '0.2rem 0.5rem', borderRadius: 6, whiteSpace: 'nowrap' }}>
                              {antenneCount} antenne(s)
                            </span>
                          </td>
                          <td>
                            <span className="aev-status" style={{ background: s.bg, color: s.color }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }}/> {s.label}
                            </span>
                          </td>
                          <td className="aev-actions-td" style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              {e.type === 'ANTENNA_MEETING' && (
                                <button className="aev-action-btn primary" onClick={(ev) => { ev.stopPropagation(); setAttendanceModal({ isOpen: true, event: e }); }}>
                                  Présences
                                </button>
                              )}
                              <button className="aev-action-btn" onClick={(ev) => { ev.stopPropagation(); setEventModal({ isOpen: true, event: e }); }}>
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

            {/* VUE MOBILE (Cartes 2 colonnes) */}
            <div className="aev-cards">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280', fontSize: '0.85rem' }}>Chargement...</div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.85rem' }}>Aucun événement.</div>
              ) : (
                items.map(e => {
                  const s = STATUS_MAP[e.status] || STATUS_MAP.DRAFT;
                  return (
                    <div key={e.id} className="aev-card">

                      {/* Colonne 1 : Événement */}
                      <div className="aev-card-content">
                        <div className="aev-card-title">{e.title}</div>
                        <div className="aev-card-meta">{TYPE_MAP[e.type]} • {formatDateTime(e.startsAt)}</div>
                        <div>
                          <span className="aev-status" style={{ background: s.bg, color: s.color, padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color }}/> {s.label}
                          </span>
                        </div>
                      </div>

                      {/* Colonne 2 : Présences & Détails */}
                      <div className="aev-card-actions">
                        {e.type === 'ANTENNA_MEETING' && (
                          <button 
                            className="aev-action-btn primary" 
                            style={{ fontSize: '0.7rem', padding: '0.35rem 0.7rem', width: '100%' }} 
                            onClick={() => setAttendanceModal({ isOpen: true, event: e })}
                          >
                            Présences
                          </button>
                        )}
                        <button 
                          className="aev-action-btn" 
                          style={{ fontSize: '0.7rem', padding: '0.35rem 0.7rem', width: '100%' }} 
                          onClick={() => setEventModal({ isOpen: true, event: e })}
                        >
                          Détails
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

        {eventModal.isOpen && <EventModal selectedEvent={eventModal.event} onClose={() => setEventModal({ isOpen: false })} onSuccess={() => { setEventModal({ isOpen: false }); void load(); }} />}
        {attendanceModal.isOpen && attendanceModal.event && <AttendanceModal selectedEvent={attendanceModal.event} onClose={() => setAttendanceModal({ isOpen: false })} />}
      </div>
    </AppShell>
  );
}
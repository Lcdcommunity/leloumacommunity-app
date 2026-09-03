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

const TYPE_MAP: Record<string, string> = { 
  GENERAL_ASSEMBLY: 'A.G.', 
  ANTENNA_MEETING: 'Réunion', 
  FUNDRAISER: 'Levée de fonds', 
  OTHER: 'Autre' 
};

const STATUS_MAP: Record<string, { label: string, color: string, bg: string, border: string }> = {
  DRAFT: { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  PUBLISHED: { label: 'Publié', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  COMPLETED: { label: 'Terminé', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  CANCELLED: { label: 'Annulé', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
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

  const initialType = selectedEvent?.type || 'GENERAL_ASSEMBLY';
  let initialTitle = selectedEvent?.title || '';
  let initialCustomType = '';

  if (initialType === 'OTHER') {
    const match = initialTitle.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      initialCustomType = match[1];
      initialTitle = match[2];
    }
  }

  const [title, setTitle] = useState(initialTitle);
  const [customType, setCustomType] = useState(initialCustomType); 
  const [description, setDescription] = useState(selectedEvent?.description || '');
  const [type, setType] = useState(initialType);
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

  // Un événement peut désormais n'avoir aucune antenne ciblée : dans ce cas,
  // seuls les membres sélectionnés individuellement ci-dessous seront invités.
  const hasAntennas = selectedAntennaIds.length > 0;

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

  // Liste des membres actifs (toutes antennes confondues), chargée dès l'entrée
  // en édition — plus besoin de sélectionner une antenne au préalable pour
  // pouvoir inviter des membres individuellement.
  useEffect(() => {
    let isMounted = true;
    if (!isEditing) return;

    async function fetchMembers() {
      setLoadingMembers(true);
      try {
        const res = await api.listMembers({ page: 1, pageSize: 1000, status: 'ACTIVE' });
        if (!isMounted) return;
        setAvailableMembers((res.items || []) as unknown as MemberItem[]);
      } catch (err) { 
        console.error("Erreur de récupération des membres:", err); 
      } finally { 
        if (isMounted) setLoadingMembers(false); 
      }
    }
    void fetchMembers();

    return () => { isMounted = false; };
  }, [isEditing]);

  const toggleAntenna = (id: string) => {
    if (!hasAntennas && inviteAll) {
      setSelectedMemberIds([]);
    }
    setSelectedAntennaIds(prev => prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]);
  };

  const handleInviteAllChange = (checked: boolean) => {
    setInviteAll(checked);
    if (checked) {
      setSelectedMemberIds([]);
    }
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
      const finalTitle = (type === 'OTHER' && customType.trim()) 
        ? `[${customType.trim()}] ${title}` 
        : title;

      // Si aucune antenne n'est ciblée, on ne peut pas "inviter tous les membres
      // de ces antennes" — dans ce cas, seuls les membres choisis individuellement
      // sont invités.
      const effectiveInviteAll = hasAntennas ? inviteAll : false;

      const payload = { 
        title: finalTitle, 
        description: description.trim() || undefined, 
        type, 
        status, 
        startsAt: new Date(startsAt).toISOString(), 
        locationText: (!isOnline && locationText.trim()) ? locationText.trim() : undefined, 
        isOnline, 
        meetingLink: (isOnline && meetingLink.trim()) ? meetingLink.trim() : undefined,
        antennaIds: selectedAntennaIds,
        inviteAll: effectiveInviteAll,
        memberIds: effectiveInviteAll ? [] : selectedMemberIds
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

  const sEventStatus = selectedEvent ? (STATUS_MAP[selectedEvent.status] || STATUS_MAP.DRAFT) : null;
  const displayTitle = selectedEvent ? selectedEvent.title.replace(/^\[.*?\]\s*/, '') : '';
  const displayType = selectedEvent ? (selectedEvent.type === 'OTHER' && selectedEvent.title.match(/^\[(.*?)\]/) ? selectedEvent.title.match(/^\[(.*?)\]/)?.[1] : TYPE_MAP[selectedEvent.type]) : '';

  return (
    <div className="lux-modal-overlay" onClick={onClose}>
      <div className="lux-modal" onClick={e => e.stopPropagation()}>
        
        {/* CONFIRMATION DE SUPPRESSION (Superposée) */}
        {showDeleteConfirm && (
          <div className="lux-confirm-overlay">
            <div className="lux-confirm-box">
              <div className="lux-confirm-icon">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3>Supprimer l&apos;événement ?</h3>
              <p>Cette action est définitive. L&apos;événement sera effacé de l&apos;agenda de tous les membres.</p>
              <div className="lux-confirm-actions">
                <button type="button" className="lux-btn-outline" onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
                <button type="button" className="lux-btn-danger" onClick={executeDelete}>Supprimer</button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER MODALE */}
        <div className="lux-modal-header">
          <h2 className="lux-modal-title">
            {selectedEvent ? (isEditing ? "Modifier l'événement" : "Détails de l'événement") : "Nouvel événement"}
          </h2>
          <button className="lux-modal-close" onClick={onClose} disabled={saving || deleting}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* CONTENU EN LECTURE SEULE */}
        {!isEditing && selectedEvent && sEventStatus ? (
          <div className="lux-modal-body lux-read-only">
            
            <div className="lux-ro-hero">
              <h3 className="lux-ro-title">{displayTitle}</h3>
              <div className="lux-ro-badges">
                <span className="lux-badge" style={{ background: sEventStatus.bg, color: sEventStatus.color, borderColor: sEventStatus.border }}>
                  <span className="lux-dot" style={{ background: sEventStatus.color }} /> {sEventStatus.label}
                </span>
                <span className="lux-badge neutral">
                  🌍 {selectedEvent.antennas?.length || 0} antenne(s) ciblée(s)
                </span>
              </div>
            </div>

            <div className="lux-ro-grid">
              <div className="lux-ro-item full">
                <label>Description</label>
                <p>{selectedEvent.description || <span className="lux-muted">Aucune description fournie.</span>}</p>
              </div>

              <div className="lux-ro-item">
                <label>Date et Heure</label>
                <p className="lux-strong">{formatDateTime(selectedEvent.startsAt)}</p>
              </div>

              <div className="lux-ro-item">
                <label>Type d&apos;événement</label>
                <p className="lux-strong">{displayType}</p>
              </div>

              <div className="lux-ro-item full">
                <label>{selectedEvent.isOnline ? 'Lien de visioconférence' : 'Lieu physique'}</label>
                {selectedEvent.isOnline ? (
                  <p><a href={selectedEvent.meetingLink || '#'} target="_blank" rel="noreferrer" className="lux-link">{selectedEvent.meetingLink || 'Lien non défini'}</a></p>
                ) : (
                  <p className="lux-strong">{selectedEvent.locationText || 'Lieu non défini'}</p>
                )}
              </div>

              {selectedEvent.antennas && selectedEvent.antennas.length > 0 && (
                <div className="lux-ro-item full">
                  <label>Antennes concernées</label>
                  <div className="lux-tag-list">
                    {selectedEvent.antennas.map(a => (
                      <span key={a.id} className="lux-tag">{a.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lux-modal-footer">
              <button type="button" className="lux-btn-danger-outline" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
                Supprimer
              </button>
              <button type="button" className="lux-btn-primary" onClick={() => setIsEditing(true)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Modifier
              </button>
            </div>
          </div>
        ) : (
          
          /* CONTENU EN ÉDITION / CRÉATION */
          <form onSubmit={handleSubmit} className="lux-modal-body">
            
            <div className="lux-field">
              <label>Titre de l&apos;événement <span>*</span></label>
              <input className="lux-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex: Assemblée Générale" />
            </div>
            
            <div className="lux-field">
              <label>Description</label>
              <textarea className="lux-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails de l'événement..." />
            </div>

            <div className="lux-grid-2">
              <div className="lux-field">
                <label>Type</label>
                <select className="lux-select" value={type} onChange={e => { setType(e.target.value); if (e.target.value !== 'OTHER') setCustomType(''); }}>
                  {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              
              <div className="lux-field">
                <label>Statut</label>
                <select className="lux-select" value={status} onChange={e => setStatus(e.target.value)}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              {type === 'OTHER' && (
                <div className="lux-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Précisez le type d&apos;événement <span>*</span></label>
                  <input className="lux-input" value={customType} onChange={e => setCustomType(e.target.value)} required placeholder="Ex: Tournoi de foot, Dîner de gala..." />
                </div>
              )}

              <div className="lux-field" style={{ gridColumn: '1 / -1' }}>
                <label>Date et heure <span>*</span></label>
                <input type="datetime-local" className="lux-input" value={startsAt} onChange={e => setStartsAt(e.target.value)} required />
              </div>
            </div>

            <div className="lux-highlight-box">
              <div className="lux-checkbox-group">
                <input type="checkbox" checked={isOnline} onChange={e => setIsOnline(e.target.checked)} id="cb-online" />
                <label htmlFor="cb-online">Événement en ligne (Visio)</label>
              </div>
              {isOnline ? (
                <div className="lux-field" style={{ marginTop: '1rem' }}>
                  <label>Lien de la réunion</label>
                  <input type="url" className="lux-input" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet..." />
                </div>
              ) : (
                <div className="lux-field" style={{ marginTop: '1rem' }}>
                  <label>Lieu physique</label>
                  <input className="lux-input" value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="Adresse complète..." />
                </div>
              )}
            </div>

            <div className="lux-field">
              <label>
                Antennes ciblées{' '}
                <span style={{ color: '#94A3B8', fontSize: '0.65rem', fontWeight: 700, textTransform: 'none', letterSpacing: 'normal' }}>
                  (optionnel)
                </span>
              </label>
              <div className="lux-antennas-grid">
                {availableAntennas.map(a => (
                  <label key={a.id} className={`lux-antenna-cb ${selectedAntennaIds.includes(a.id) ? 'active' : ''}`}>
                    <input type="checkbox" checked={selectedAntennaIds.includes(a.id)} onChange={() => toggleAntenna(a.id)} />
                    <span>{a.name}</span>
                  </label>
                ))}
              </div>
              <span className="lux-hint">
                Sélectionne une ou plusieurs antennes pour diffuser l&apos;événement à leurs membres, ou laisse vide pour n&apos;inviter que des membres choisis individuellement ci-dessous.
              </span>

              {hasAntennas && (
                <div className="lux-highlight-box blue" style={{ marginTop: '1rem' }}>
                  <div className="lux-checkbox-group">
                    <input type="checkbox" id="cb-inviteall" checked={inviteAll} onChange={e => handleInviteAllChange(e.target.checked)} />
                    <label htmlFor="cb-inviteall">Inviter TOUS les membres de ces antennes</label>
                  </div>
                </div>
              )}
            </div>

            {(!hasAntennas || !inviteAll) && (
              <div className="lux-field">
                <label>Membres invités individuellement</label>
                <span className="lux-hint">
                  Recherche et sélectionne des membres par nom, prénom ou email, quelle que soit leur antenne. * Seuls les membres avec un compte actif s&apos;affichent ici.
                </span>

                <input 
                  type="text" 
                  placeholder="Rechercher par nom, prénom ou email..." 
                  className="lux-input search" 
                  style={{ marginTop: '0.75rem' }}
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  disabled={loadingMembers || availableMembers.length === 0}
                />

                <div className="lux-members-list">
                  {loadingMembers ? (
                     <div className="lux-empty-state">Chargement...</div> 
                  ) : availableMembers.length === 0 ? (
                     <div className="lux-empty-state">Aucun membre actif trouvé.</div> 
                  ) : filteredMembers.length === 0 ? (
                     <div className="lux-empty-state">Aucun résultat pour cette recherche.</div>
                  ) : (
                    filteredMembers.map(m => (
                      <label key={m.id} className="lux-member-item">
                        <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => toggleMember(m.id)} />
                        <span className="name">{m.firstName} {m.lastName}</span>
                        <span className="email">({m.email})</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="lux-selection-count">
                  {selectedMemberIds.length} sélectionné(s)
                </div>
              </div>
            )}

            <div className="lux-modal-footer">
              <button type="button" className="lux-btn-outline" onClick={() => selectedEvent ? setIsEditing(false) : onClose()} disabled={saving}>Annuler</button>
              <button type="submit" className="lux-btn-primary" disabled={saving || (!hasAntennas && selectedMemberIds.length === 0)}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL : GESTION DES PRÉSENCES (Reste inchangé mais stylisé luxueux)
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
    <div className="lux-modal-overlay" onClick={onClose}>
      <div className="lux-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="lux-modal-header">
          <h2 className="lux-modal-title">Présences : {selectedEvent?.title.replace(/^\[.*?\]\s*/, '')}</h2>
          <button className="lux-modal-close" onClick={onClose}><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>

        <div className="lux-tabs-container">
          <div className="lux-tabs">
            <button className={`lux-tab ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>Toutes</button>
            <button className={`lux-tab ${filter === 'ATTENDING' ? 'active attending' : ''}`} onClick={() => setFilter('ATTENDING')}>✅ Présents</button>
            <button className={`lux-tab ${filter === 'ABSENT' ? 'active absent' : ''}`} onClick={() => setFilter('ABSENT')}>❌ Absents</button>
          </div>
        </div>

        <div className="lux-modal-body" style={{ background: '#F8FAFC', padding: '1.5rem' }}>
          {loading ? ( <div className="lux-empty-state">Chargement...</div> ) : attendances.length === 0 ? ( <div className="lux-empty-state" style={{ background: 'white' }}>Aucun membre n&apos;a répondu.</div> ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {attendances.map(att => (
                <div key={att.id} className="lux-attendance-card">
                  <div className="info">
                    <div className="name">{att.user.firstName} {att.user.lastName}</div>
                    <div className="meta">{att.user.email} {att.user.phone ? `• ${att.user.phone}` : ''}</div>
                  </div>
                  <div className="status">
                    {att.status === 'ATTENDING' ? (
                      <span className="lux-badge" style={{ background: '#ECFDF5', color: '#059669', borderColor: '#A7F3D0' }}>Présent</span>
                    ) : (
                      <span className="lux-badge" style={{ background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }}>Absent</span>
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
// PAGE PRINCIPALE
// ----------------------------------------------------------------------
export default function SuperAdminEventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  // 👇 CORRECTION LINT (react-hooks/set-state-in-effect) : la règle
  // signale toute fonction référencée en dépendance d'effet dont le corps
  // contient un setState, même après un await. `load` était une useCallback
  // externe passée en dépendance ([load]) — signalée pour cette raison. La
  // fonction de chargement est désormais déclarée ET appelée entièrement à
  // l'intérieur de l'effet (comme fetchAntennas/fetchMembers dans
  // EventModal, jamais signalées), et l'effet ne dépend plus que d'un
  // compteur `reloadKey` — une primitive, pas une fonction.
  const [reloadKey, setReloadKey] = useState(0);
  const [eventModal, setEventModal] = useState<{ isOpen: boolean; event?: EventItem | null }>({ isOpen: false });
  const [attendanceModal, setAttendanceModal] = useState<{ isOpen: boolean; event?: EventItem | null }>({ isOpen: false });

  useEffect(() => {
    let ignore = false;

    async function loadEvents() {
      try {
        const res = await api.listEvents();
        if (!ignore) setItems(res?.items || []);
      } catch (err) {
        console.error(err);
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadEvents();
    return () => { ignore = true; };
  }, [reloadKey]);

  // Appelé depuis des gestionnaires d'événements (jamais depuis un effet) :
  // setLoading(true) ici est un setState ordinaire, hors effet — non concerné
  // par la règle.
  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey(k => k + 1);
  }, []);

  return (
    <AppShell title="Événements Globaux">
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
          
          .aev-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); width: 100%; max-width: 1100px; margin: 0 auto; box-sizing: border-box; }
          .aev-header { margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; }
          .aev-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 4vw, 2.5rem); font-weight: 700; color: #111827; margin: 0; line-height: 1.1; }
          .aev-title span { color: #2563EB; }
          .aev-subtitle { font-size: 0.9rem; color: #6B7280; font-weight: 500; margin-top: 0.5rem; }

          .lux-btn-new { background: linear-gradient(135deg, #1D4ED8, #3B82F6); color: white; border: none; padding: 0.75rem 1.4rem; border-radius: 12px; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(37,99,235,0.25); transition: all 0.2s; white-space: nowrap; }
          .lux-btn-new:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37,99,235,0.35); }

          .aev-panel { background: white; border-radius: 20px; border: 1px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0,0,0,0.03); width: 100%; overflow: hidden; }
          
          .aev-table-container { width: 100%; overflow: hidden; }
          .aev-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .aev-table th { padding: 1rem 1.5rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; text-align: left; border-bottom: 1px solid #E5E7EB; background: #F8FAFC; }
          .aev-row { border-bottom: 1px solid #F3F4F6; cursor: pointer; transition: background 0.15s; } 
          .aev-row:hover { background: #F8FAFC; }
          .aev-table td { padding: 1.25rem 1.5rem; font-size: 0.85rem; font-weight: 600; color: #111827; vertical-align: middle; }
          
          .lux-status-badge { padding: 0.25rem 0.6rem; border-radius: 99px; font-size: 0.65rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.05em; }
          
          .lux-action-btn { background: white; border: 1px solid #D1D5DB; color: #374151; padding: 0.45rem 0.8rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; white-space: nowrap; }
          .lux-action-btn:hover { background: #F3F4F6; border-color: #9CA3AF; }
          .lux-action-btn.primary { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
          .lux-action-btn.primary:hover { background: #DBEAFE; }

          /* ========================================================= */
          /* NOUVEAU DESIGN LUXUEUX MODALE                             */
          /* ========================================================= */
          .lux-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,0.6); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; padding: 1rem; animation: luxFadeIn 0.25s ease-out; }
          .lux-modal { background: white; width: 100%; max-width: 580px; border-radius: 24px; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: luxSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden; position: relative; }
          
          .lux-modal-header { padding: 1.5rem 1.75rem; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; background: white; z-index: 10; }
          .lux-modal-title { font-size: 0.85rem; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
          .lux-modal-close { background: #F3F4F6; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6B7280; transition: all 0.2s; }
          .lux-modal-close:hover { background: #E5E7EB; color: #111827; transform: rotate(90deg); }
          
          .lux-modal-body { padding: 1.75rem; overflow-y: auto; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; gap: 1.25rem; }
          
          /* LECTURE SEULE */
          .lux-read-only .lux-ro-hero { margin-bottom: 1.5rem; text-align: center; }
          .lux-read-only .lux-ro-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; color: #111827; margin: 0 0 1rem 0; line-height: 1.1; }
          .lux-read-only .lux-ro-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
          .lux-badge { padding: 0.3rem 0.8rem; border-radius: 99px; font-size: 0.7rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid; text-transform: uppercase; letter-spacing: 0.05em; }
          .lux-badge.neutral { background: #F8FAFC; color: #475569; border-color: #E2E8F0; }
          .lux-dot { width: 6px; height: 6px; border-radius: 50%; }

          .lux-ro-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; background: #F8FAFC; padding: 1.5rem; border-radius: 16px; border: 1px solid #E2E8F0; }
          .lux-ro-item { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
          .lux-ro-item.full { grid-column: 1 / -1; }
          .lux-ro-item label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; }
          .lux-ro-item p { margin: 0; font-size: 0.9rem; color: #334155; line-height: 1.5; overflow-wrap: anywhere; word-break: break-word; }
          .lux-ro-item p.lux-strong { font-weight: 700; color: #0F172A; }
          .lux-muted { color: #94A3B8; font-style: italic; }
          .lux-link { color: #2563EB; font-weight: 600; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; overflow-wrap: anywhere; word-break: break-word; }
          .lux-link:hover { border-color: #2563EB; }
          
          .lux-tag-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
          .lux-tag { font-size: 0.75rem; font-weight: 700; padding: 0.3rem 0.7rem; background: white; border: 1px solid #CBD5E1; border-radius: 8px; color: #334155; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }

          /* FORMULAIRE */
          .lux-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
          .lux-field { display: flex; flex-direction: column; gap: 0.4rem; }
          .lux-field label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #1E293B; }
          .lux-field label span { color: #DC2626; }
          .lux-input, .lux-select, .lux-textarea { width: 100%; box-sizing: border-box; border-radius: 12px; border: 1px solid #D1D5DB; padding: 0 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500; outline: none; background: #F9FAFB; transition: all 0.2s; }
          .lux-input, .lux-select { height: 46px; }
          .lux-textarea { padding: 1rem; min-height: 90px; resize: vertical; }
          .lux-input:focus, .lux-select:focus, .lux-textarea:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); background: white; }
          .lux-input.search { height: 40px; margin-bottom: 0.75rem; font-size: 0.85rem; }

          .lux-highlight-box { background: #F8FAFC; padding: 1.25rem; border-radius: 16px; border: 1px solid #E2E8F0; }
          .lux-highlight-box.blue { background: #EFF6FF; border-color: #BFDBFE; }
          
          .lux-checkbox-group { display: flex; alignItems: center; gap: 0.6rem; }
          .lux-checkbox-group input[type="checkbox"] { width: 18px; height: 18px; accent-color: #2563EB; cursor: pointer; }
          .lux-checkbox-group label { font-size: 0.9rem; font-weight: 700; color: #1E293B; cursor: pointer; text-transform: none; letter-spacing: normal; margin: 0; }

          .lux-antennas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem; max-height: 180px; overflow-y: auto; padding: 0.5rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; }
          .lux-antenna-cb { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border: 1px solid transparent; border-radius: 8px; cursor: pointer; background: white; transition: all 0.15s; }
          .lux-antenna-cb input { accent-color: #2563EB; }
          .lux-antenna-cb span { font-size: 0.85rem; font-weight: 600; color: #475569; }
          .lux-antenna-cb.active { border-color: #93C5FD; background: #EFF6FF; }
          .lux-antenna-cb.active span { color: #1D4ED8; }

          .lux-invite-specific { margin-top: 1rem; border-top: 1px dashed #BFDBFE; padding-top: 1rem; }
          .lux-hint { font-size: 0.75rem; color: #64748B; display: block; margin-bottom: 0.75rem; font-style: italic; }
          
          .lux-members-list { max-height: 180px; overflow-y: auto; background: white; border: 1px solid #D1D5DB; border-radius: 12px; padding: 0.5rem; }
          .lux-member-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; border-bottom: 1px solid #F1F5F9; cursor: pointer; transition: background 0.15s; border-radius: 6px; }
          .lux-member-item:hover { background: #F8FAFC; }
          .lux-member-item:last-child { border-bottom: none; }
          .lux-member-item input { accent-color: #2563EB; }
          .lux-member-item .name { font-size: 0.85rem; font-weight: 700; color: #1E293B; }
          .lux-member-item .email { font-size: 0.75rem; color: #94A3B8; }
          
          .lux-selection-count { font-size: 0.75rem; color: #64748B; margin-top: 0.5rem; text-align: right; font-weight: 700; }
          .lux-empty-state { font-size: 0.85rem; color: #94A3B8; text-align: center; padding: 1.5rem; font-weight: 500; }

          /* FOOTER & BOUTONS */
          .lux-modal-footer { padding: 1.25rem 1.75rem; border-top: 1px solid #E5E7EB; background: #F8FAFC; display: flex; justify-content: space-between; align-items: center; gap: 1rem; z-index: 10; }
          .lux-btn-primary { background: linear-gradient(135deg, #2563EB, #1D4ED8); color: white; border: none; padding: 0 1.5rem; height: 44px; border-radius: 12px; font-weight: 800; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.2); transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; }
          .lux-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.3); }
          .lux-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
          
          .lux-btn-outline { background: white; border: 1px solid #D1D5DB; color: #475569; padding: 0 1.5rem; height: 44px; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
          .lux-btn-outline:hover:not(:disabled) { background: #F1F5F9; color: #0F172A; }
          
          .lux-btn-danger-outline { background: white; border: 1px solid #FECACA; color: #DC2626; padding: 0 1.2rem; height: 44px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
          .lux-btn-danger-outline:hover:not(:disabled) { background: #FEF2F2; }

          .lux-btn-danger { background: #DC2626; color: white; border: none; padding: 0 1.5rem; height: 44px; border-radius: 12px; font-weight: 800; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 12px rgba(220,38,38,0.2); transition: all 0.2s; }
          .lux-btn-danger:hover:not(:disabled) { background: #B91C1C; transform: translateY(-1px); }

          /* CONFIRMATION OVERLAY */
          .lux-confirm-overlay { position: absolute; inset: 0; z-index: 100; background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; animation: luxFadeIn 0.2s ease-out; }
          .lux-confirm-box { background: white; padding: 2.5rem 2rem; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); border: 1px solid #FECACA; text-align: center; max-width: 380px; animation: luxZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
          .lux-confirm-icon { width: 64px; height: 64px; border-radius: 50%; background: #FEF2F2; color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
          .lux-confirm-box h3 { font-size: 1.25rem; font-weight: 800; color: #111827; margin: 0 0 0.75rem; }
          .lux-confirm-box p { font-size: 0.9rem; color: #64748B; margin: 0 0 1.75rem; line-height: 1.5; }
          .lux-confirm-actions { display: flex; gap: 0.75rem; }
          .lux-confirm-actions > * { flex: 1; }

          /* ATTENDANCE MODAL TABS */
          .lux-tabs-container { padding: 1rem 1.75rem; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; }
          .lux-tabs { display: flex; gap: 0.5rem; background: #E2E8F0; padding: 0.25rem; border-radius: 12px; }
          .lux-tab { flex: 1; text-align: center; padding: 0.5rem; border-radius: 10px; font-size: 0.75rem; font-weight: 800; color: #64748B; border: 1px solid transparent; background: transparent; cursor: pointer; transition: all 0.2s; }
          .lux-tab.active { background: white; color: #0F172A; border-color: #CBD5E1; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .lux-tab.active.attending { color: #059669; border-color: #A7F3D0; background: #ECFDF5; }
          .lux-tab.active.absent { color: #DC2626; border-color: #FECACA; background: #FEF2F2; }

          .lux-attendance-card { background: white; padding: 1.25rem; border-radius: 16px; border: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
          .lux-attendance-card .name { font-weight: 800; color: #111827; font-size: 0.95rem; margin-bottom: 0.25rem; }
          .lux-attendance-card .meta { font-size: 0.8rem; color: #64748B; font-weight: 500; }

          /* ANIMATIONS */
          @keyframes luxFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes luxSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes luxZoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

          /* RESPONSIVE */
          .aev-cards { display: none; }
          @media (max-width: 768px) { 
            .lux-grid-2 { grid-template-columns: 1fr; } 
            .lux-ro-grid { grid-template-columns: 1fr; }
            .aev-table-container { display: none !important; } 
            .aev-cards { display: flex; flex-direction: column; width: 100%; }
            .aev-card { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #F1F5F9; gap: 1rem; background: white; }
            .aev-card:last-child { border-bottom: none; }
            .aev-card-content { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 0; }
            .aev-card-title { font-weight: 800; font-size: 1rem; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
            .aev-card-meta { font-size: 0.8rem; color: #64748B; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .aev-card-actions { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end; flex-shrink: 0; }
          }
        `}</style>

        <div className="aev-wrap">
          <div className="aev-header">
            <div>
              <h1 className="aev-title">Gestion Globale des <span>Événements</span></h1>
              <p className="aev-subtitle">Créez et administrez l&apos;agenda complet de votre association et de vos antennes.</p>
            </div>
            <button className="lux-btn-new" onClick={() => setEventModal({ isOpen: true })}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Nouvel événement
            </button>
          </div>
          
          <div className="aev-panel">
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
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontWeight: 600 }}>Chargement des événements...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8', fontWeight: 600 }}>Aucun événement n&apos;a été créé pour le moment.</td></tr>
                  ) : (
                    items.map(e => {
                      const s = STATUS_MAP[e.status] || STATUS_MAP.DRAFT;
                      const antenneCount = e.antennas?.length || 0;
                      
                      const displayTitle = e.title.replace(/^\[.*?\]\s*/, '');

                      return (
                        <tr key={e.id} className="aev-row" onClick={() => setEventModal({ isOpen: true, event: e })}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.95rem' }}>{displayTitle}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4, fontWeight: 700 }}>
                              {e.type === 'OTHER' && e.title.match(/^\[(.*?)\]/) ? e.title.match(/^\[(.*?)\]/)?.[1] : TYPE_MAP[e.type]}
                            </div>
                          </td>
                          <td style={{ color: '#475569', fontSize: '0.85rem' }}>{formatDateTime(e.startsAt)}</td>
                          <td>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#F1F5F9', color: '#475569', padding: '0.3rem 0.6rem', borderRadius: 8, whiteSpace: 'nowrap' }}>
                              {antenneCount} antenne(s)
                            </span>
                          </td>
                          <td>
                            <span className="lux-status-badge" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }}/> {s.label}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              {e.type === 'ANTENNA_MEETING' && (
                                <button className="lux-action-btn primary" onClick={(ev) => { ev.stopPropagation(); setAttendanceModal({ isOpen: true, event: e }); }}>
                                  Présences
                                </button>
                              )}
                              <button className="lux-action-btn" onClick={(ev) => { ev.stopPropagation(); setEventModal({ isOpen: true, event: e }); }}>
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
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600 }}>Chargement...</div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600 }}>Aucun événement.</div>
              ) : (
                items.map(e => {
                  const s = STATUS_MAP[e.status] || STATUS_MAP.DRAFT;
                  const displayTitle = e.title.replace(/^\[.*?\]\s*/, '');
                  const displayType = e.type === 'OTHER' && e.title.match(/^\[(.*?)\]/) ? e.title.match(/^\[(.*?)\]/)?.[1] : TYPE_MAP[e.type];

                  return (
                    <div key={e.id} className="aev-card" onClick={() => setEventModal({ isOpen: true, event: e })}>

                      {/* Colonne 1 : Événement */}
                      <div className="aev-card-content">
                        <div className="aev-card-title">{displayTitle}</div>
                        <div className="aev-card-meta">{displayType} • {formatDateTime(e.startsAt)}</div>
                        <div style={{ marginTop: '0.2rem' }}>
                          <span className="lux-status-badge" style={{ background: s.bg, color: s.color, borderColor: s.border, padding: '0.2rem 0.5rem', fontSize: '0.6rem' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }}/> {s.label}
                          </span>
                        </div>
                      </div>

                      {/* Colonne 2 : Présences & Détails */}
                      <div className="aev-card-actions">
                        {e.type === 'ANTENNA_MEETING' && (
                          <button 
                            className="lux-action-btn primary" 
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', width: '100%' }} 
                            onClick={(ev) => { ev.stopPropagation(); setAttendanceModal({ isOpen: true, event: e }); }}
                          >
                            Présences
                          </button>
                        )}
                        <button 
                          className="lux-action-btn" 
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', width: '100%' }} 
                          onClick={(ev) => { ev.stopPropagation(); setEventModal({ isOpen: true, event: e }); }}
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

        {eventModal.isOpen && <EventModal selectedEvent={eventModal.event} onClose={() => setEventModal({ isOpen: false })} onSuccess={() => { setEventModal({ isOpen: false }); reload(); }} />}
        {attendanceModal.isOpen && attendanceModal.event && <AttendanceModal selectedEvent={attendanceModal.event} onClose={() => setAttendanceModal({ isOpen: false })} />}
      </div>
    </AppShell>
  );
}
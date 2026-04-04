// web/app/(protected)/super-admin/members/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary, UserStatus, UserRole } from '../../../../types/user';
import { fullName, formatDate } from '../../../../lib/format';
import Image from 'next/image';

/* ══════════════════════════════════════════════════════ CONSTANTES */
const ASSOCIATION_ROLES = [
  'Membre (simple)',
  "Secrétaire à l'organisation",
  'Secrétaire Général(e)',
  'Trésorier / Trésorière',
  'Président(e)',
  'Vice-président(e)',
  'Chargé(e) de communication',
  'Conseiller / Conseillère',
  'Autre',
];

const PROFESSION_LIST = [
  'Étudiant(e)',
  'Employé(e)',
  'Fonctionnaire',
  'Indépendant / Entrepreneur',
  'Profession libérale',
  'Cadre / Dirigeant',
  'Artisan / Commerçant',
  'Agriculteur',
  'Sans emploi',
  'Retraité(e)',
  'Autre',
];

const COMMUNES_ORIGINE = [
  'C. Urbaine', 'Lafou', 'Manda', 'Balaya', 'Thiaguel Bori', 
  'Parawol', 'Sagalé', 'Hérico', 'Diountou', 'Korbé', 'Linsan'
];

const COUNTRIES = [
  { name: 'Guinée', code: 'GN' }, { name: 'France', code: 'FR' }, { name: 'Sénégal', code: 'SN' },
  { name: 'Côte d\'Ivoire', code: 'CI' }, { name: 'Mali', code: 'ML' }, { name: 'Maroc', code: 'MA' },
  { name: 'Canada', code: 'CA' }, { name: 'États-Unis', code: 'US' }, { name: 'Belgique', code: 'BE' },
  { name: 'Suisse', code: 'CH' }, { name: 'Allemagne', code: 'DE' }, { name: 'Royaume-Uni', code: 'GB' },
  { name: 'Espagne', code: 'ES' }, { name: 'Italie', code: 'IT' }, { name: 'Autre (Non listé)', code: 'OTHER' }
].sort((a, b) => a.name.localeCompare(b.name));

/* ══════════════════════════════════════════════════════ EXTENDED TYPE */
type ExtendedUser = UserSummary & {
  birthDate?: string | null;
  placeOfBirth?: string | null;
  countryOfBirth?: string | null;
  originSubPrefecture?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  professionalStatus?: string | null;
  profilePhotoUrl?: string | null;
  cardNumber?: string | null;
  function?: string | null;
};

/* ══════════════════════════════════════════════════════ BADGES */
const STATUS_MAP: Record<UserStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:           { label: 'Actif',             color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  PENDING_APPROVAL: { label: 'En attente',        color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  EMAIL_UNVERIFIED: { label: 'Non vérifié',       color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  SUSPENDED:         { label: 'Suspendu',          color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  REJECTED:          { label: 'Rejeté',            color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  DELETED:           { label: 'Supprimé',          color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

function StatusBadge({ status }: { status: UserStatus }) {
  const s = STATUS_MAP[status] || { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.65rem', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '.15rem .5rem', whiteSpace: 'nowrap' }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

const ROLE_MAP: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  SYSTEM_ADMIN:  { label: 'Chef',        color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  SUPER_ADMIN:   { label: 'S.Admin',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  ANTENNA_ADMIN: { label: 'A.Admin',     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  MEMBER:        { label: 'Membre',      color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

function RoleBadge({ role }: { role: UserRole }) {
  const r = ROLE_MAP[role] || { label: role, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '.65rem', fontWeight: 800, color: r.color, background: r.bg, border: `1px solid ${r.border}`, borderRadius: 6, padding: '.15rem .45rem', whiteSpace: 'nowrap' }}>
      {r.label}
    </span>
  );
}

function Initials({ name, url, size = 34 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return (
      <Image 
        src={url} 
        alt={name} 
        width={size} 
        height={size} 
        style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(0,0,0,0.05)' }} 
      />
    );
  }
  const parts = name.trim().split(' ');
  const txt = ((parts[0]?.[0] ?? '') + (parts[parts.length-1]?.[0] ?? '')).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#991B1B,#DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Cormorant Garamond',serif", fontSize: size > 40 ? '1.2rem' : '.8rem', fontWeight: 700 }}>
      {txt}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ ICON BUTTONS */
function IconBtn({
  onClick, disabled, title, color, bg, border, hoverBg, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  color: string;
  bg: string;
  border: string;
  hoverBg: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className="sp-icon-btn"
      style={{
        '--color': color,
        '--bg': bg,
        '--border': border,
        '--hover-bg': hoverBg,
      } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════ SVG ICONS */
const IconEdit = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const IconApprove = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconSuspend = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconReactivate = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconDelete = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconSave = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const IconCancel = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

/* ══════════════════════════════════════════════════════ MODAL COMPONENTS */
function MemberModal({
  user, isEditing, editValues, setEditValues, onSave, onCancel, onEdit,
  onToggleSuspend, onDelete, onApprove, busy, onClose
}: {
  user: ExtendedUser;
  isEditing: boolean;
  editValues: Partial<ExtendedUser>;
  setEditValues: React.Dispatch<React.SetStateAction<Partial<ExtendedUser>>>;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onToggleSuspend: () => void;
  onDelete: () => void;
  onApprove: () => void;
  busy: boolean;
  onClose: () => void;
}) {
  const handleChange = (field: keyof ExtendedUser, value: string) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert YYYY-MM-DD input date to ISO string
    const dateVal = e.target.value;
    if (dateVal) {
      handleChange('birthDate', new Date(dateVal).toISOString());
    } else {
      handleChange('birthDate', '');
    }
  };

  const canApprove = user.status === 'PENDING_APPROVAL' || user.status === 'EMAIL_UNVERIFIED';
  
  const formattedBirthDateForInput = editValues.birthDate 
    ? new Date(editValues.birthDate).toISOString().split('T')[0] 
    : '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Initials name={fullName(user)} url={user.profilePhotoUrl} size={50} />
            <div>
              <h2 className="modal-title">{fullName(user)}</h2>
              <div className="sm-member-id">ID: {user.cardNumber || user.id.slice(0,8)}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><IconCancel /></button>
        </div>

        <div className="modal-body">
          <div className="modal-actions-bar">
            {isEditing ? (
              <div style={{ display: 'flex', gap: '.5rem', width: '100%' }}>
                <button className="btn-save" onClick={onSave} disabled={busy}>{busy ? '...' : <><IconSave /> Enregistrer</>}</button>
                <button className="btn-cancel" onClick={onCancel} disabled={busy}>Annuler</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <IconBtn onClick={onEdit} title="Modifier" color="#2563EB" bg="#EFF6FF" border="#BFDBFE" hoverBg="#DBEAFE"><IconEdit /></IconBtn>
                {canApprove && <IconBtn onClick={onApprove} title="Approuver" color="#059669" bg="#ECFDF5" border="#A7F3D0" hoverBg="#D1FAE5"><IconApprove /></IconBtn>}
                <IconBtn onClick={onToggleSuspend} title={user.status === 'SUSPENDED' ? 'Réactiver' : 'Suspendre'} color="#D97706" bg="#FFFBEB" border="#FDE68A" hoverBg="#FEF3C7">{user.status === 'SUSPENDED' ? <IconReactivate /> : <IconSuspend />}</IconBtn>
                <IconBtn onClick={onDelete} title="Supprimer" color="#DC2626" bg="#FEF2F2" border="#FECACA" hoverBg="#FEE2E2"><IconDelete /></IconBtn>
              </div>
            )}
          </div>

          <div className="sm-section-divider">Identité & Contact</div>
          <div className="sm-dp-grid">
             <div className="sm-dp-field">
                <label>Prénom</label>
                {isEditing ? <input className="sm-dp-input" value={editValues.firstName || ''} onChange={e => handleChange('firstName', e.target.value)} /> : <div className="sm-dp-value">{user.firstName}</div>}
             </div>
             <div className="sm-dp-field">
                <label>Nom</label>
                {isEditing ? <input className="sm-dp-input" value={editValues.lastName || ''} onChange={e => handleChange('lastName', e.target.value)} /> : <div className="sm-dp-value">{user.lastName}</div>}
             </div>
             <div className="sm-dp-field full">
                <label>Email</label>
                {isEditing ? <input className="sm-dp-input" type="email" value={editValues.email || ''} onChange={e => handleChange('email', e.target.value)} /> : <div className="sm-dp-value">{user.email}</div>}
             </div>
             <div className="sm-dp-field">
                <label>Téléphone</label>
                {isEditing ? <input className="sm-dp-input" value={editValues.phone || ''} onChange={e => handleChange('phone', e.target.value)} /> : <div className="sm-dp-value">{user.phone || '-'}</div>}
             </div>
          </div>

          <div className="sm-section-divider">Naissance & Origine</div>
          <div className="sm-dp-grid">
             <div className="sm-dp-field">
                <label>Date de naissance</label>
                {isEditing ? <input type="date" className="sm-dp-input" value={formattedBirthDateForInput} onChange={handleDateChange} /> : <div className="sm-dp-value">{user.birthDate ? formatDate(user.birthDate) : '-'}</div>}
             </div>
             <div className="sm-dp-field">
                <label>Lieu de naissance</label>
                {isEditing ? <input className="sm-dp-input" value={editValues.placeOfBirth || ''} onChange={e => handleChange('placeOfBirth', e.target.value)} /> : <div className="sm-dp-value">{user.placeOfBirth || '-'}</div>}
             </div>
             <div className="sm-dp-field">
                <label>Pays de naissance</label>
                {isEditing ? (
                  <select className="sm-dp-input" value={editValues.countryOfBirth || ''} onChange={e => handleChange('countryOfBirth', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                ) : <div className="sm-dp-value">{user.countryOfBirth || '-'}</div>}
             </div>
             <div className="sm-dp-field">
                <label>Commune d&apos;origine</label>
                {isEditing ? (
                  <select className="sm-dp-input" value={editValues.originSubPrefecture || ''} onChange={e => handleChange('originSubPrefecture', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {COMMUNES_ORIGINE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : <div className="sm-dp-value">{user.originSubPrefecture || '-'}</div>}
             </div>
          </div>

          <div className="sm-section-divider">Résidence & Adresse</div>
          <div className="sm-dp-grid">
             <div className="sm-dp-field">
                <label>Pays actuel</label>
                {isEditing ? (
                  <select className="sm-dp-input" value={editValues.country || ''} onChange={e => handleChange('country', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                ) : <div className="sm-dp-value">{user.country || '-'}</div>}
             </div>
             <div className="sm-dp-field">
                <label>Ville actuelle</label>
                {isEditing ? <input className="sm-dp-input" value={editValues.city || ''} onChange={e => handleChange('city', e.target.value)} /> : <div className="sm-dp-value">{user.city || '-'}</div>}
             </div>
             <div className="sm-dp-field">
                <label>Code Postal</label>
                {isEditing ? <input className="sm-dp-input" value={editValues.postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} /> : <div className="sm-dp-value">{user.postalCode || '-'}</div>}
             </div>
             <div className="sm-dp-field full">
                <label>Adresse (Ligne 1)</label>
                {isEditing ? <input className="sm-dp-input" value={editValues.addressLine1 || ''} onChange={e => handleChange('addressLine1', e.target.value)} /> : <div className="sm-dp-value">{user.addressLine1 || '-'}</div>}
             </div>
             <div className="sm-dp-field full">
                <label>Adresse (Ligne 2)</label>
                {isEditing ? <input className="sm-dp-input" value={editValues.addressLine2 || ''} onChange={e => handleChange('addressLine2', e.target.value)} /> : <div className="sm-dp-value">{user.addressLine2 || '-'}</div>}
             </div>
          </div>

          <div className="sm-section-divider">Poste & Profession</div>
          <div className="sm-dp-grid">
             <div className="sm-dp-field">
                <label>Poste Asso</label>
                {isEditing ? (
                  <select className="sm-dp-input" value={editValues.function || ''} onChange={e => handleChange('function', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {ASSOCIATION_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : <div className="sm-dp-value" style={{color:'#DC2626', fontWeight:700}}>{user.function || 'Membre'}</div>}
             </div>
             <div className="sm-dp-field">
                <label>Profession / Statut</label>
                {isEditing ? (
                  <select className="sm-dp-input" value={editValues.professionalStatus || ''} onChange={e => handleChange('professionalStatus', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {PROFESSION_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : <div className="sm-dp-value">{user.professionalStatus || '-'}</div>}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ MAIN PAGE */
export default function SuperAdminMembersPage() {
  const [items,   setItems]   = useState<ExtendedUser[]>([]);
  const [q,       setQ]       = useState('');
  const [status,  setStatus]  = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<ExtendedUser>>({});
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async (qVal?: string, sVal?: string) => {
    setError(null); setLoading(true);
    try {
      const res = await api.listMembers({ page: 1, pageSize: 100, q: qVal ?? q, status: sVal ?? status });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement membres');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => { void load(); }, [load]);

  const openDetails = (user: ExtendedUser) => {
    setSelectedUser(user);
    setEditValues(user);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setActionBusy(true);
    try {
      await api.updateUserSuperAdmin(selectedUser.id, editValues);
      setIsEditing(false);
      setSelectedUser(null);
      await load();
    } catch (err) { 
      console.error(err);
      alert('Erreur modification'); 
    }
    finally { setActionBusy(false); }
  };

  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    setActionBusy(true);
    try {
      if (selectedUser.status === 'SUSPENDED') await api.activateUserSuperAdmin(selectedUser.id);
      else await api.suspendUserSuperAdmin(selectedUser.id);
      setSelectedUser(null);
      await load();
    } catch (err) {
      console.error(err);
      alert('Erreur statut'); 
    }
    finally { setActionBusy(false); }
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    setActionBusy(true);
    try {
      await api.approveMemberAccount(selectedUser.id);
      setSelectedUser(null);
      await load();
    } catch (err) { 
      console.error(err);
      alert('Erreur validation'); 
    }
    finally { setActionBusy(false); }
  };

  const handleDelete = async () => {
    if (!selectedUser || !confirm('Supprimer définitivement ce compte ?')) return;
    setActionBusy(true);
    try {
      await api.deleteUserSuperAdmin(selectedUser.id);
      setSelectedUser(null);
      await load();
    } catch (err) { 
      console.error(err);
      alert('Erreur suppression'); 
    }
    finally { setActionBusy(false); }
  };

  const activeCount  = items.filter((u) => u.status === 'ACTIVE').length;
  const pendingCount = items.filter((u) => u.status === 'PENDING_APPROVAL').length;
  const suspCount    = items.filter((u) => u.status === 'SUSPENDED').length;

  return (
    <AppShell title="Membres">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;700;800&display=swap');
        .sm-wrap { font-family:'DM Sans',sans-serif; padding:1rem; max-width:1200px; margin:0 auto; overflow-x:hidden; }
        .sm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:.5rem; margin-bottom:1rem; }
        @media(max-width:600px){ .sm-stats { grid-template-columns:repeat(2,1fr); } }
        .sm-stat { background:white; border-radius:12px; padding:.75rem; border-top:3px solid; box-shadow:0 2px 6px rgba(0,0,0,0.05); }
        .sm-stat-val { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:700; line-height:1; }
        .sm-stat-lbl { font-size:.6rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-top:2px; }
        .sm-panel { background:white; border-radius:20px; box-shadow:0 4px 20px rgba(0,0,0,0.06); overflow:hidden; }
        .sm-toolbar { display: grid; grid-template-columns: 1fr 120px 40px; gap: .5rem; padding: 1rem; border-bottom: 1px solid #f1f5f9; align-items: center; }
        @media(min-width:768px){ .sm-toolbar { grid-template-columns: 1fr 200px 100px; } }
        .sm-input { width:100%; height:38px; border-radius:10px; border:1px solid #e2e8f0; padding:0 .75rem; font-size:.85rem; outline:none; }
        .sm-select { height:38px; border-radius:10px; border:1px solid #e2e8f0; font-size:.75rem; font-weight:700; outline:none; padding:0 .5rem; background:#f8fafc; appearance: none; }
        .sm-filter-btn { height:38px; border-radius:10px; background:#DC2626; color:white; border:none; font-weight:800; cursor:pointer; font-size:.75rem; display:flex; align-items:center; justify-content:center; }
        .sm-tw { display:none; }
        @media(min-width:768px){ .sm-tw { display:block; overflow-x:auto; } }
        .sm-table { width:100%; border-collapse:collapse; }
        .sm-table th { padding:.75rem 1rem; font-size:.65rem; text-transform:uppercase; background:#f8fafc; color:#64748b; text-align:left; }
        .sm-table td { padding:.75rem 1rem; border-bottom:1px solid #f1f5f9; font-size:.85rem; }
        .sm-main-row:hover { background:#fff1f1; cursor:pointer; }
        .sm-mob { display:block; }
        @media(min-width:768px){ .sm-mob { display:none; } }
        .sm-mc { padding:1rem; border-bottom:1px solid #f1f5f9; cursor:pointer; }
        .sm-mc-top { display:flex; align-items:center; gap:.75rem; }
        .sm-mc-info { flex:1; min-width:0; }
        .sm-member-name { font-weight:700; font-size:.9rem; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sm-member-email { font-size:.75rem; color:#64748b; margin-top:2px; }
        .sm-mc-meta { display:flex; justify-content:space-between; align-items:center; margin-top:.75rem; }
        .modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; }
        .modal-content { background:white; width:100%; max-width:500px; border-radius:24px; max-height:90vh; overflow-y:auto; }
        .modal-header { padding:1.25rem; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; background:white; z-index:10; }
        .modal-title { font-family:'Cormorant Garamond',serif; font-size:1.4rem; font-weight:700; color:#111827; }
        .modal-close { width:32px; height:32px; border-radius:50%; border:1.5px solid #e2e8f0; display:flex; align-items:center; justify-content:center; cursor:pointer; }
        .modal-body { padding:1.25rem; }
        .modal-actions-bar { margin-bottom:1.5rem; display:flex; gap:.5rem; }
        .sm-section-divider { font-size:0.7rem; font-weight:800; color:#DC2626; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #FECACA; padding-bottom:0.4rem; margin:1.5rem 0 0.75rem 0; }
        .sm-dp-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        .sm-dp-field { display:flex; flex-direction:column; gap:4px; }
        .sm-dp-field.full { grid-column: span 2; }
        .sm-dp-field label { font-size:.65rem; font-weight:800; color:#94a3b8; text-transform:uppercase; }
        .sm-dp-value { font-size:.9rem; font-weight:600; color:#1e293b; padding:4px 0; }
        .sm-dp-input { height:38px; border-radius:8px; border:1px solid #e2e8f0; padding:0 .75rem; font-size:.85rem; font-weight:600; width: 100%; background: white; }
        .btn-save { flex:1; height:40px; background:#059669; color:white; border:none; border-radius:10px; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px; cursor: pointer; }
        .btn-cancel { height:40px; padding:0 1rem; border:1.5px solid #e2e8f0; border-radius:10px; font-weight:700; cursor: pointer; }
        .sp-icon-btn { width:34px; height:34px; border-radius:9px; border:1.5px solid var(--border); background:var(--bg); color:var(--color); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s; }
        .sp-icon-btn:hover { background:var(--hover-bg); transform:translateY(-1px); }
      `}</style>

      <div className="sm-wrap">
        <header style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '.7rem', fontWeight: 900, color: '#DC2626', letterSpacing: '.1em', textTransform: 'uppercase' }}>Super Admin</div>
          <h1 className="sm-title">Membres — <span>vue globale</span></h1>
        </header>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #FECACA', fontWeight: 700 }}>
            {error}
          </div>
        )}

        <div className="sm-stats">
          <div className="sm-stat" style={{ borderTopColor: '#DC2626' }}>
            <div className="sm-stat-val" style={{ color: '#DC2626' }}>{items.length}</div>
            <div className="sm-stat-lbl">Membres</div>
          </div>
          <div className="sm-stat" style={{ borderTopColor: '#059669' }}>
            <div className="sm-stat-val" style={{ color: '#059669' }}>{activeCount}</div>
            <div className="sm-stat-lbl">Actifs</div>
          </div>
          <div className="sm-stat" style={{ borderTopColor: '#D97706' }}>
            <div className="sm-stat-val" style={{ color: '#D97706' }}>{pendingCount}</div>
            <div className="sm-stat-lbl">Attente</div>
          </div>
          <div className="sm-stat" style={{ borderTopColor: '#7C3AED' }}>
            <div className="sm-stat-val" style={{ color: '#7C3AED' }}>{suspCount}</div>
            <div className="sm-stat-lbl">Suspens</div>
          </div>
        </div>

        <div className="sm-panel">
          <div className="sm-toolbar">
            <input 
              className="sm-input" 
              placeholder="Recherche..." 
              value={q} 
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void load(q, status)}
            />
            <select className="sm-select" value={status} onChange={e => { setStatus(e.target.value); void load(q, e.target.value); }}>
              <option value="">Tous</option>
              <option value="ACTIVE">Actifs</option>
              <option value="PENDING_APPROVAL">Attente</option>
              <option value="SUSPENDED">Suspendus</option>
            </select>
            <button className="sm-filter-btn" onClick={() => void load(q, status)}>
              {loading ? '...' : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>}
            </button>
          </div>

          <div className="sm-tw">
            <table className="sm-table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {items.map(u => (
                  <tr key={u.id} className="sm-main-row" onClick={() => openDetails(u)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <Initials name={fullName(u)} url={u.profilePhotoUrl} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{fullName(u)}</div>
                          <div style={{ fontSize: '.7rem', color: '#64748b' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm-mob">
            {items.map(u => (
              <div key={u.id} className="sm-mc" onClick={() => openDetails(u)}>
                <div className="sm-mc-top">
                  <Initials name={fullName(u)} url={u.profilePhotoUrl} />
                  <div className="sm-mc-info">
                    <div className="sm-member-name">{fullName(u)}</div>
                    <div className="sm-member-email">{u.email}</div>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="3"><path d="M9 5l7 7-7 7"/></svg>
                </div>
                <div className="sm-mc-meta">
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    <RoleBadge role={u.role} />
                    <StatusBadge status={u.status} />
                  </div>
                  <div style={{ fontSize: '.7rem', color: '#94a3b8', fontWeight: 600 }}>{formatDate(u.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedUser && (
        <MemberModal
          user={selectedUser}
          isEditing={isEditing}
          editValues={editValues}
          setEditValues={setEditValues}
          busy={actionBusy}
          onClose={() => { setSelectedUser(null); setIsEditing(false); }}
          onEdit={() => setIsEditing(true)}
          onCancel={() => setIsEditing(false)}
          onSave={handleSaveEdit}
          onToggleSuspend={handleToggleSuspend}
          onApprove={handleApprove}
          onDelete={handleDelete}
        />
      )}
    </AppShell>
  );
}
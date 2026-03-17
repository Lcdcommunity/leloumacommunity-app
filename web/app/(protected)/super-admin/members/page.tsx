// web/app/(protected)/super-admin/members/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary, UserStatus, UserRole } from '../../../../types/user';
import { fullName, formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ EXTENDED TYPE */
type ExtendedUser = UserSummary & {
  birthDate?: string | null;
  originSubPrefecture?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  profilePhotoUrl?: string | null;
  cardNumber?: string | null;
};

/* ══════════════════════════════════════════════════════ BADGES & ICONS */
const STATUS_MAP: Record<UserStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:                     { label: 'Actif',             color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  PENDING_APPROVAL:           { label: 'En attente',        color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  PENDING_EMAIL_VERIFICATION: { label: 'Email non vérifié', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  SUSPENDED:                  { label: 'Suspendu',          color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  REJECTED:                   { label: 'Rejeté',            color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

function StatusBadge({ status }: { status: UserStatus }) {
  const s = STATUS_MAP[status] || { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.68rem', fontWeight: 900, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '.2rem .6rem', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

const ROLE_MAP: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  SUPER_ADMIN:   { label: 'Super Admin',   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  ANTENNA_ADMIN: { label: 'Admin antenne', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  MEMBER:        { label: 'Membre',        color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

function RoleBadge({ role }: { role: UserRole }) {
  const r = ROLE_MAP[role] || { label: role, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '.68rem', fontWeight: 900, color: r.color, background: r.bg, border: `1px solid ${r.border}`, borderRadius: 7, padding: '.18rem .55rem', whiteSpace: 'nowrap' }}>
      {r.label}
    </span>
  );
}

function Initials({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={url} alt={name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
    );
  }
  const parts = name.trim().split(' ');
  const txt = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#991B1B,#DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Cormorant Garamond',serif", fontSize: '.82rem', fontWeight: 700, boxShadow: '0 2px 6px rgba(220,38,38,.25)' }}>
      {txt}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ SUB-COMPONENT */
function DetailField({
  label, fieldKey, type = 'text', placeholder = '', isEditing, editValue, origValue, onChange
}: {
  label: string;
  fieldKey: keyof ExtendedUser;
  type?: string;
  placeholder?: string;
  isEditing: boolean;
  editValue?: string | null;
  origValue?: string | null;
  onChange: (field: keyof ExtendedUser, value: string) => void;
}) {
  return (
    <div className="sm-dp-field">
      <label>{label}</label>
      {isEditing ? (
        <input 
          type={type} 
          className="sm-dp-input" 
          value={editValue || ''} 
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="sm-dp-value">
          {origValue || <span style={{color: '#9CA3AF'}}>Non renseigné</span>}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ DETAILS COMPONENT */
function MemberDetails({
  user, isEditing, editValues, setEditValues, onSave, onCancel, onEdit, onToggleSuspend, onDelete, busy
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
  busy: boolean;
}) {
  const handleChange = (field: keyof ExtendedUser, value: string) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="sm-dp-container">
      <div className="sm-dp-header">
        <div className="sm-dp-photo-lg">
          {user.profilePhotoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={user.profilePhotoUrl} alt="Profil" />
          ) : (
            <span>{user.firstName[0]}{user.lastName[0]}</span>
          )}
        </div>
        <div>
          <div className="sm-dp-name">{fullName(user)}</div>
          <div className="sm-dp-id">
            Adhérent N° <span className="sm-dp-mono">{user.cardNumber || user.id.slice(0,8).toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="sm-dp-grid">
        <DetailField label="Prénom" fieldKey="firstName" isEditing={isEditing} editValue={editValues.firstName as string} origValue={user.firstName} onChange={handleChange} />
        <DetailField label="Nom" fieldKey="lastName" isEditing={isEditing} editValue={editValues.lastName as string} origValue={user.lastName} onChange={handleChange} />
        <DetailField label="Email" fieldKey="email" type="email" isEditing={isEditing} editValue={editValues.email as string} origValue={user.email} onChange={handleChange} />
        <DetailField label="Téléphone" fieldKey="phone" placeholder="+33 6..." isEditing={isEditing} editValue={editValues.phone as string} origValue={user.phone} onChange={handleChange} />
        <DetailField label="Date de naissance" fieldKey="birthDate" type="date" isEditing={isEditing} editValue={editValues.birthDate as string} origValue={user.birthDate} onChange={handleChange} />
        <DetailField label="Commune d'origine" fieldKey="originSubPrefecture" placeholder="Ex: Lafou" isEditing={isEditing} editValue={editValues.originSubPrefecture as string} origValue={user.originSubPrefecture} onChange={handleChange} />
        <DetailField label="Ville de résidence" fieldKey="city" isEditing={isEditing} editValue={editValues.city as string} origValue={user.city} onChange={handleChange} />
        <DetailField label="Pays" fieldKey="country" isEditing={isEditing} editValue={editValues.country as string} origValue={user.country} onChange={handleChange} />
        
        <div className="sm-dp-field" style={{ gridColumn: '1 / -1' }}>
          <label>Adresse postale</label>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input className="sm-dp-input" value={editValues.addressLine1 || ''} onChange={e => handleChange('addressLine1', e.target.value)} placeholder="Adresse 1" />
              <input className="sm-dp-input" value={editValues.addressLine2 || ''} onChange={e => handleChange('addressLine2', e.target.value)} placeholder="Adresse 2 (Optionnel)" />
            </div>
          ) : (
            <div className="sm-dp-value">
              {user.addressLine1 ? (
                <>
                  {user.addressLine1}
                  {user.addressLine2 && <><br/>{user.addressLine2}</>}
                </>
              ) : <span style={{color: '#9CA3AF'}}>Non renseignée</span>}
            </div>
          )}
        </div>
      </div>

      <div className="sm-dp-actions">
        {isEditing ? (
          <>
            <button className="sm-btn-cancel" onClick={onCancel} disabled={busy}>Annuler</button>
            <button className="sm-btn-save" onClick={onSave} disabled={busy}>
              {busy ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </>
        ) : (
          <>
            <button className="sm-btn-edit" onClick={onEdit}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Modifier
            </button>
            <div style={{ flex: 1 }} />
            <button className="sm-btn-suspend" onClick={onToggleSuspend} disabled={busy}>
              {user.status === 'SUSPENDED' ? 'Réactiver le compte' : 'Suspendre le compte'}
            </button>
            <button className="sm-btn-delete" onClick={onDelete} disabled={busy}>Supprimer</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminMembersPage() {
  const [items,   setItems]   = useState<ExtendedUser[]>([]);
  const [q,       setQ]       = useState('');
  const [status,  setStatus]  = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ExtendedUser>>({});
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async (qVal?: string, sVal?: string) => {
    setError(null); setLoading(true);
    try {
      const res = await api.listMembers({
        page: 1, pageSize: 100,
        q:      (qVal ?? q)      || undefined,
        status: (sVal ?? status) || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement membres');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => { void load('', ''); }, [load]);

  const toggleExpand = (user: ExtendedUser) => {
    if (expandedId === user.id) {
      setExpandedId(null);
      setEditingId(null);
    } else {
      setExpandedId(user.id);
      setEditingId(null);
      setEditValues(user);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setActionBusy(true);
    try {
      await api.updateUserSuperAdmin(id, editValues);
      setEditingId(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de modification');
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleSuspend = async (user: ExtendedUser) => {
    setActionBusy(true);
    try {
      if (user.status === 'SUSPENDED') {
        await api.activateUserSuperAdmin(user.id);
      } else {
        await api.suspendUserSuperAdmin(user.id);
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors du changement de statut');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement ce compte ?")) return;
    setActionBusy(true);
    try {
      await api.deleteUserSuperAdmin(id);
      setExpandedId(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de suppression');
    } finally {
      setActionBusy(false);
    }
  };

  const activeCount  = items.filter(u => u.status === 'ACTIVE').length;
  const pendingCount = items.filter(u => u.status === 'PENDING_APPROVAL').length;
  const suspCount    = items.filter(u => u.status === 'SUSPENDED').length;

  const thStyle: React.CSSProperties = { padding: '.75rem 1.2rem', fontSize: '.63rem', fontWeight: 900, letterSpacing: '.11em', textTransform: 'uppercase', color: '#374151', background: 'rgba(254,242,242,.35)', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '.9rem 1.2rem', fontSize: '.84rem', color: '#111827', verticalAlign: 'middle', cursor: 'pointer' };

  return (
    <AppShell title="Membres (vue globale)">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .sm-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1200px;margin:0 auto}

        /* Header */
        .sm-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:smin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .sm-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sm-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:smpulse 2s ease-in-out infinite}
        @keyframes smpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sm-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .sm-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* Stats */
        .sm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1.4rem;opacity:0;transform:translateY(10px);animation:smin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:700px){.sm-stats{grid-template-columns:repeat(2,1fr)}}
        .sm-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(220,38,38,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(220,38,38,.04);padding:.8rem 1rem}
        .sm-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .sm-stat-lbl{font-size:.64rem;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.07em}

        /* Panel */
        .sm-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:smin .5s .14s cubic-bezier(.22,1,.36,1) forwards}
        .sm-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
        .sm-panel-titlerow{display:flex;align-items:center;gap:.55rem}
        .sm-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .sm-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .sm-count-chip{font-size:.68rem;font-weight:900;padding:.2rem .6rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}

        /* Toolbar */
        .sm-toolbar{display:flex;gap:.6rem;align-items:flex-end;flex-wrap:wrap;padding:.9rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07)}
        .sm-field{display:flex;flex-direction:column;gap:.35rem}
        .sm-field-grow{flex:1;min-width:180px}
        .sm-label{font-size:.7rem;font-weight:900;color:#374151;letter-spacing:.07em;text-transform:uppercase}
        .sm-sw{position:relative}
        .sm-si{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .sm-input{width:100%;height:40px;border-radius:11px;border:1px solid rgba(220,38,38,.15);background:rgba(255,255,255,.88);padding:0 .9rem 0 2.4rem;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:600;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .sm-input:focus{border-color:rgba(220,38,38,.4);box-shadow:0 0 0 3px rgba(220,38,38,.08);background:white}
        .sm-input::placeholder{color:rgba(107,114,128,.45);font-weight:400}
        .sm-select{height:40px;border-radius:11px;border:1px solid rgba(220,38,38,.15);background:rgba(255,255,255,.88);padding:0 2rem 0 .85rem;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:700;color:#111827;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .65rem center;min-width:180px;transition:border-color .2s}
        .sm-select:focus{border-color:rgba(220,38,38,.4);box-shadow:0 0 0 3px rgba(220,38,38,.08);outline:none}
        .sm-filter-btn{height:40px;padding:0 1.2rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:900;display:flex;align-items:center;gap:.45rem;box-shadow:0 3px 10px rgba(220,38,38,.3);transition:all .18s;white-space:nowrap;align-self:flex-end}
        .sm-filter-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 16px rgba(220,38,38,.42)}
        .sm-filter-btn:disabled{opacity:.6;cursor:not-allowed}

        /* Table */
        .sm-tw{overflow-x:auto}
        .sm-table{width:100%;border-collapse:collapse;min-width:640px}
        .sm-table thead tr{border-bottom:2px solid rgba(220,38,38,.1)}
        .sm-table tbody tr.sm-main-row{border-bottom:1px solid rgba(220,38,38,.05);transition:background .15s;animation:smin .4s cubic-bezier(.22,1,.36,1) both}
        .sm-table tbody tr.sm-main-row:hover{background:rgba(220,38,38,.02)}
        .sm-table tbody tr.expanded-active { background: #FEF2F2 !important; border-bottom: none; }
        
        .sm-member-name{font-weight:900;font-size:.9rem;color:#0F172A}
        .sm-member-email{font-size:.74rem;font-weight:600;color:#6B7280;margin-top:2px}
        .sm-member-id{font-family:'DM Mono',monospace;font-size:.68rem;font-weight:600;color:#9CA3AF;margin-top:1px}
        .sm-date{font-size:.75rem;font-weight:700;color:#6B7280;font-family:'DM Mono',monospace}
        .sm-chevron { color: #9CA3AF; transition: transform 0.3s cubic-bezier(.22,1,.36,1); }
        .sm-chevron.open { transform: rotate(180deg); color: #DC2626; }

        /* Mobile cards */
        .sm-mob{display:none;flex-direction:column}
        @media(max-width:680px){.sm-tw{display:none}.sm-mob{display:flex}}
        .sm-mc{padding:1.1rem 1.2rem;border-bottom:1px solid rgba(220,38,38,.07);animation:smin .4s cubic-bezier(.22,1,.36,1) both; transition: background 0.2s; cursor: pointer;}
        .sm-mc.expanded-active { background: #FEF2F2; }
        .sm-mc:last-child{border-bottom:none}
        .sm-mc-top{display:flex;align-items:center;gap:.65rem;margin-bottom:.55rem}
        .sm-mc-info{flex:1;min-width:0}
        .sm-mc-badges{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.4rem}
        .sm-mc-footer{font-size:.72rem;font-weight:600;color:#9CA3AF;font-family:'DM Mono',monospace}

        /* Expanded Details Panel */
        .sm-dp-row { background: #FEF2F2; border-bottom: 1px solid rgba(220,38,38,.1); }
        .sm-dp-container { padding: 1.5rem 2rem; border-radius: 16px; background: white; margin: 0 1.2rem 1.5rem 1.2rem; border: 1px solid rgba(220,38,38,0.1); box-shadow: 0 4px 20px rgba(220,38,38,0.06); animation: smin 0.3s forwards; }
        @media(max-width:680px){ .sm-dp-container { margin: 1rem 0 0 0; padding: 1.2rem 1rem; } }
        
        .sm-dp-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #F3F4F6; }
        .sm-dp-photo-lg { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg,#991B1B,#DC2626); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; flex-shrink: 0; box-shadow: 0 4px 10px rgba(220,38,38,.2); overflow: hidden; }
        .sm-dp-photo-lg img { width: 100%; height: 100%; object-fit: cover; }
        .sm-dp-name { font-size: 1.1rem; font-weight: 800; color: #111827; }
        .sm-dp-id { font-size: 0.75rem; font-weight: 600; color: #6B7280; margin-top: 0.2rem; }
        .sm-dp-mono { font-family: 'DM Mono', monospace; color: #DC2626; font-weight: 700; background: #FEF2F2; padding: 0.1rem 0.4rem; border-radius: 4px; }

        .sm-dp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem; }
        @media(max-width:540px){ .sm-dp-grid { grid-template-columns: 1fr; } }
        .sm-dp-field { display: flex; flex-direction: column; gap: 0.3rem; }
        .sm-dp-field label { font-size: 0.65rem; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .sm-dp-value { font-size: 0.85rem; font-weight: 600; color: #111827; }
        .sm-dp-input { height: 38px; border-radius: 8px; border: 1px solid #D1D5DB; padding: 0 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; color: #111827; width: 100%; outline: none; transition: border 0.2s; }
        .sm-dp-input:focus { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }

        .sm-dp-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; padding-top: 1rem; border-top: 1px solid #F3F4F6; }
        .sm-btn-edit { height: 36px; padding: 0 1rem; border-radius: 8px; background: #F3F4F6; border: 1px solid #E5E7EB; color: #374151; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s; font-family: 'DM Sans'; }
        .sm-btn-edit:hover { background: #E5E7EB; color: #111827; }
        .sm-btn-suspend { height: 36px; padding: 0 1rem; border-radius: 8px; background: #FFFBEB; border: 1px solid #FDE68A; color: #D97706; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans'; }
        .sm-btn-suspend:hover { background: #FEF3C7; }
        .sm-btn-delete { height: 36px; padding: 0 1rem; border-radius: 8px; background: white; border: 1px solid #FECACA; color: #DC2626; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans'; }
        .sm-btn-delete:hover { background: #FEF2F2; }
        .sm-btn-save { height: 36px; padding: 0 1rem; border-radius: 8px; background: linear-gradient(135deg,#991B1B,#DC2626); border: none; color: white; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans'; box-shadow: 0 3px 8px rgba(220,38,38,.3); }
        .sm-btn-cancel { height: 36px; padding: 0 1rem; border-radius: 8px; background: transparent; border: 1px solid #E5E7EB; color: #6B7280; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans'; }

        /* States */
        .sm-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .sm-ring{width:24px;height:24px;border:2.5px solid rgba(220,38,38,.12);border-top-color:#DC2626;border-radius:50%;animation:smspin .8s linear infinite}
        .sm-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin:1rem}
        .sm-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF}
        .sm-empty-title{font-size:.9rem;font-weight:900;color:#374151}
        .sm-empty-sub{font-size:.78rem;font-weight:600}

        @keyframes smin{to{opacity:1;transform:translateY(0)}}
        @keyframes smspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="sm-wrap">

        {/* Header */}
        <div className="sm-header">
          <div className="sm-eyebrow"><div className="sm-dot" />Super Admin</div>
          <h1 className="sm-title">Membres — <span>vue globale</span></h1>
        </div>

        {/* Stats */}
        <div className="sm-stats">
          {([
            { label: 'Total membres', value: items.length,  color: '#DC2626' },
            { label: 'Actifs',        value: activeCount,   color: '#059669' },
            { label: 'En attente',    value: pendingCount,  color: '#D97706' },
            { label: 'Suspendus',     value: suspCount,     color: '#7C3AED' },
          ] as const).map(s => (
            <div key={s.label} className="sm-stat" style={{ borderTopColor: s.color }}>
              <div className="sm-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="sm-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Panel */}
        <div className="sm-panel">
          <div className="sm-panel-head">
            <div className="sm-panel-titlerow">
              <div className="sm-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="sm-panel-title">Tous les membres</span>
              {items.length > 0 && <span className="sm-count-chip">{items.length}</span>}
            </div>
          </div>

          {/* Toolbar */}
          <div className="sm-toolbar">
            <div className="sm-field sm-field-grow">
              <label className="sm-label">Recherche</label>
              <div className="sm-sw">
                <span className="sm-si">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
                </span>
                <input
                  className="sm-input"
                  type="text"
                  placeholder="Nom, email&#8230;"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void load(q, status)}
                />
              </div>
            </div>

            <div className="sm-field">
              <label className="sm-label">Statut</label>
              <select
                className="sm-select"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="PENDING_EMAIL_VERIFICATION">Email non v&eacute;rifi&eacute;</option>
                <option value="PENDING_APPROVAL">En attente d&apos;approbation</option>
                <option value="ACTIVE">Actif</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="REJECTED">Rejet&eacute;</option>
              </select>
            </div>

            <button
              className="sm-filter-btn"
              disabled={loading}
              onClick={() => void load(q, status)}
            >
              {loading
                ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'smspin .7s linear infinite' }} />Chargement&#8230;</>
                : <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>Filtrer</>
              }
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="sm-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="sm-loader"><div className="sm-ring" />Chargement&#8230;</div>
          ) : !error && items.length === 0 ? (
            <div className="sm-empty">
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3">
                <path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="sm-empty-title">Aucun membre trouv&eacute;</div>
              <div className="sm-empty-sub">Essayez de modifier la recherche ou le filtre de statut.</div>
            </div>
          ) : !error ? (
            <>
              {/* ── Desktop table ── */}
              <div className="sm-tw">
                <table className="sm-table">
                  <thead>
                    <tr>
                      <th style={thStyle}>Membre</th>
                      <th style={thStyle}>R&ocirc;le</th>
                      <th style={thStyle}>Statut</th>
                      <th style={thStyle}>Cr&eacute;&eacute; le</th>
                      <th style={{...thStyle, width: '40px'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u, i) => (
                      <React.Fragment key={u.id}>
                        <tr 
                          className={`sm-main-row ${expandedId === u.id ? 'expanded-active' : ''}`} 
                          style={{ animationDelay: `${i * 0.035}s` }}
                          onClick={() => toggleExpand(u)}
                        >
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                              <Initials name={fullName(u)} url={u.profilePhotoUrl} />
                              <div>
                                <div className="sm-member-name">{fullName(u)}</div>
                                <div className="sm-member-email">{u.email}</div>
                                <div className="sm-member-id">N°&nbsp;{u.cardNumber || u.id.slice(0, 8).toUpperCase()}</div>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}><RoleBadge role={u.role} /></td>
                          <td style={tdStyle}><StatusBadge status={u.status} /></td>
                          <td style={tdStyle}><span className="sm-date">{formatDate(u.createdAt)}</span></td>
                          <td style={{...tdStyle, textAlign: 'right'}}>
                            <svg className={`sm-chevron ${expandedId === u.id ? 'open' : ''}`} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </td>
                        </tr>
                        {expandedId === u.id && (
                          <tr className="sm-dp-row">
                            <td colSpan={5} style={{ padding: 0 }}>
                              <MemberDetails 
                                user={u}
                                isEditing={editingId === u.id}
                                editValues={editValues}
                                setEditValues={setEditValues}
                                busy={actionBusy}
                                onEdit={() => setEditingId(u.id)}
                                onCancel={() => setEditingId(null)}
                                onSave={() => handleSaveEdit(u.id)}
                                onToggleSuspend={() => handleToggleSuspend(u)}
                                onDelete={() => handleDelete(u.id)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="sm-mob">
                {items.map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div 
                      className={`sm-mc ${expandedId === u.id ? 'expanded-active' : ''}`} 
                      style={{ animationDelay: `${i * 0.035}s` }}
                      onClick={() => toggleExpand(u)}
                    >
                      <div className="sm-mc-top">
                        <Initials name={fullName(u)} url={u.profilePhotoUrl} />
                        <div className="sm-mc-info">
                          <div className="sm-member-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName(u)}</div>
                          <div className="sm-member-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                        </div>
                        <svg className={`sm-chevron ${expandedId === u.id ? 'open' : ''}`} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div className="sm-mc-badges">
                        <RoleBadge role={u.role} />
                        <StatusBadge status={u.status} />
                      </div>
                      <div className="sm-mc-footer">{formatDate(u.createdAt)}</div>
                    </div>
                    {expandedId === u.id && (
                      <div style={{ background: '#FEF2F2', borderBottom: '1px solid rgba(220,38,38,.07)' }}>
                        <MemberDetails 
                          user={u}
                          isEditing={editingId === u.id}
                          editValues={editValues}
                          setEditValues={setEditValues}
                          busy={actionBusy}
                          onEdit={() => setEditingId(u.id)}
                          onCancel={() => setEditingId(null)}
                          onSave={() => handleSaveEdit(u.id)}
                          onToggleSuspend={() => handleToggleSuspend(u)}
                          onDelete={() => handleDelete(u.id)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
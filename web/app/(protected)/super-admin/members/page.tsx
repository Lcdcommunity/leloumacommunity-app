// web/app/(protected)/super-admin/members/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary, UserStatus, UserRole } from '../../../../types/user';
import { fullName, formatDate } from '../../../../lib/format';
import Image from 'next/image';
import { MemberCardPreviewModal } from '../../../../components/admin/MemberCardPreviewModal';

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
  'Parawol', 'Sagalé', 'Hérico', 'Diountou', 'Korbé', 'Linsan', 'Autre',
];

const COUNTRIES = [
  { name: 'Guinée', code: 'GN' }, { name: 'France', code: 'FR' }, { name: 'Sénégal', code: 'SN' },
  { name: 'Côte d\'Ivoire', code: 'CI' }, { name: 'Mali', code: 'ML' }, { name: 'Maroc', code: 'MA' },
  { name: 'Canada', code: 'CA' }, { name: 'États-Unis', code: 'US' }, { name: 'Belgique', code: 'BE' },
  { name: 'Suisse', code: 'CH' }, { name: 'Allemagne', code: 'DE' }, { name: 'Royaume-Uni', code: 'GB' },
  { name: 'Espagne', code: 'ES' }, { name: 'Italie', code: 'IT' }, { name: 'Autre', code: 'OTHER' },
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
  professionalStatus?: string | null;
  profilePhotoUrl?: string | null;
  cardNumber?: string | null;
  function?: string | null;
  antennaId?: string | null;

  customCountryOfBirth?: string;
  customOriginSubPrefecture?: string;
  customCountry?: string;
  customFunction?: string;
};

/* ══════════════════════════════════════════════════════ BADGES */
const STATUS_MAP: Record<UserStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:           { label: 'Actif',       color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  PENDING_APPROVAL: { label: 'En attente',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  EMAIL_UNVERIFIED: { label: 'Non vérifié', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  SUSPENDED:        { label: 'Suspendu',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  REJECTED:         { label: 'Rejeté',      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  DELETED:          { label: 'Supprimé',    color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
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
  SYSTEM_ADMIN:  { label: 'Chef',    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  SUPER_ADMIN:   { label: 'S.Admin', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  ANTENNA_ADMIN: { label: 'A.Admin', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  MEMBER:        { label: 'Membre',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
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
  const txt = ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
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
      style={{ '--color': color, '--bg': bg, '--border': border, '--hover-bg': hoverBg } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════ SVGICONS */
const IconEdit      = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const IconApprove   = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconSuspend   = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconReactivate= () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconDelete    = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconSave      = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const IconCancel    = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const IconEye       = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3"><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

/* ══════════════════════════════════════════════════════ MODAL */
function MemberModal({
  user, isEditing, editValues, setEditValues, onSave, onCancel, onEdit,
  onToggleSuspend, onDelete, onApprove, onViewCard, busy, onClose,
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
  onViewCard: () => void;
  busy: boolean;
  onClose: () => void;
}) {
  const handleChange = (field: keyof ExtendedUser, value: string) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    handleChange('birthDate', dateVal ? new Date(dateVal).toISOString() : '');
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
              <div className="sm-member-id">ID: {user.cardNumber || user.id.slice(0, 8)}</div>
              <div className="sm-member-id">Membre depuis le {formatDate(user.createdAt)}</div>
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
                <IconBtn onClick={onViewCard} title="Voir la carte" color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" hoverBg="#EDE9FE"><IconEye /></IconBtn>
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
                <>
                  <select className="sm-dp-input" value={editValues.countryOfBirth || ''} onChange={e => { handleChange('countryOfBirth', e.target.value); if (e.target.value !== 'Autre') handleChange('customCountryOfBirth', ''); }}>
                    <option value="">Sélectionner...</option>
                    {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  {editValues.countryOfBirth === 'Autre' && (
                    <input className="sm-dp-input" style={{ marginTop: '0.4rem' }} value={editValues.customCountryOfBirth || ''} onChange={e => handleChange('customCountryOfBirth', e.target.value)} placeholder="Précisez le pays" />
                  )}
                </>
              ) : <div className="sm-dp-value">{user.countryOfBirth || '-'}</div>}
            </div>
            <div className="sm-dp-field">
              <label>Commune d&apos;origine</label>
              {isEditing ? (
                <>
                  <select className="sm-dp-input" value={editValues.originSubPrefecture || ''} onChange={e => { handleChange('originSubPrefecture', e.target.value); if (e.target.value !== 'Autre') handleChange('customOriginSubPrefecture', ''); }}>
                    <option value="">Sélectionner...</option>
                    {COMMUNES_ORIGINE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {editValues.originSubPrefecture === 'Autre' && (
                    <input className="sm-dp-input" style={{ marginTop: '0.4rem' }} value={editValues.customOriginSubPrefecture || ''} onChange={e => handleChange('customOriginSubPrefecture', e.target.value)} placeholder="Précisez la commune" />
                  )}
                </>
              ) : <div className="sm-dp-value">{user.originSubPrefecture || '-'}</div>}
            </div>
          </div>

          <div className="sm-section-divider">Résidence & Adresse</div>
          <div className="sm-dp-grid">
            <div className="sm-dp-field">
              <label>Pays actuel</label>
              {isEditing ? (
                <>
                  <select className="sm-dp-input" value={editValues.country || ''} onChange={e => { handleChange('country', e.target.value); if (e.target.value !== 'Autre') handleChange('customCountry', ''); }}>
                    <option value="">Sélectionner...</option>
                    {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  {editValues.country === 'Autre' && (
                    <input className="sm-dp-input" style={{ marginTop: '0.4rem' }} value={editValues.customCountry || ''} onChange={e => handleChange('customCountry', e.target.value)} placeholder="Précisez le pays" />
                  )}
                </>
              ) : <div className="sm-dp-value">{user.country || '-'}</div>}
            </div>
            <div className="sm-dp-field">
              <label>Ville actuelle</label>
              {isEditing ? <input className="sm-dp-input" value={editValues.city || ''} onChange={e => handleChange('city', e.target.value)} /> : <div className="sm-dp-value">{user.city || '-'}</div>}
            </div>
            <div className="sm-dp-field">
              <label>Code Postal <span style={{ textTransform: 'none', fontWeight: 500 }}>(Optionnel)</span></label>
              {isEditing ? <input className="sm-dp-input" value={editValues.postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} /> : <div className="sm-dp-value">{user.postalCode || '-'}</div>}
            </div>
            <div className="sm-dp-field full">
              <label>Adresse de résidence</label>
              {isEditing ? <input className="sm-dp-input" value={editValues.addressLine1 || ''} onChange={e => handleChange('addressLine1', e.target.value)} /> : <div className="sm-dp-value">{user.addressLine1 || '-'}</div>}
            </div>
          </div>

          <div className="sm-section-divider">Poste & Profession</div>
          <div className="sm-dp-grid">
            <div className="sm-dp-field">
              <label>Poste Asso</label>
              {isEditing ? (
                <>
                  <select className="sm-dp-input" value={editValues.function || ''} onChange={e => { handleChange('function', e.target.value); if (e.target.value !== 'Autre') handleChange('customFunction', ''); }}>
                    <option value="">Sélectionner...</option>
                    {ASSOCIATION_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {editValues.function === 'Autre' && (
                    <input className="sm-dp-input" style={{ marginTop: '0.4rem' }} value={editValues.customFunction || ''} onChange={e => handleChange('customFunction', e.target.value)} placeholder="Précisez le poste" />
                  )}
                </>
              ) : <div className="sm-dp-value" style={{ color: '#DC2626', fontWeight: 700 }}>{user.function || 'Membre'}</div>}
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

/* ══════════════════════════════════════════════════════ HELPERS EXPORT */
// Déplacés au niveau module (fonctions pures, pas de hooks) pour être
// utilisables à la fois par le composant et par generateStyledExcel().
const getMemberAntennaId = (u: ExtendedUser): string | null => {
  const withMemberships = u as ExtendedUser & {
    memberships?: { antennaId?: string | null }[];
  };
  return withMemberships.memberships?.[0]?.antennaId ?? u.antennaId ?? null;
};

// 🔥 AJOUT : filtre par devise — dérivée de l'antenne principale du membre
// (memberships[0].antenna.defaultCurrency), déjà incluse par le backend
// (super-admin.service.ts::listUsersByRole → include memberships.antenna).
// Aucun appel réseau supplémentaire nécessaire.
const getMemberCurrency = (u: ExtendedUser): string | null => {
  const withMemberships = u as ExtendedUser & {
    memberships?: { antenna?: { defaultCurrency?: string | null } | null }[];
  };
  return withMemberships.memberships?.[0]?.antenna?.defaultCurrency ?? null;
};

type ExportRowUser = ExtendedUser & {
  lateMonths?: number;
  antennaName?: string | null;
  currency?: string | null;
};

// 🔥 CORRECTION ESLint : types minimaux pour la portion d'ExcelJS réellement
// utilisée ici, à la place de `any` — le paquet est chargé via son build
// navigateur (exceljs/dist/exceljs.min.js), qui n'expose pas de
// déclarations de types pour ce sous-chemin, d'où le seul @ts-expect-error
// nécessaire, sur l'import dynamique lui-même.
interface ExcelCellStyle {
  font?: Record<string, unknown>;
  fill?: Record<string, unknown>;
  alignment?: Record<string, unknown>;
  border?: Record<string, unknown>;
}

type ExcelCell = ExcelCellStyle;

interface ExcelRow {
  height?: number;
  eachCell: (callback: (cell: ExcelCell) => void) => void;
  getCell: (key: string) => ExcelCell;
}

interface ExcelWorksheet {
  columns: Array<{ header: string; key: string; width: number }>;
  autoFilter?: { from: string; to: string };
  getRow: (index: number) => ExcelRow;
  addRow: (data: Record<string, unknown>) => ExcelRow;
}

interface ExcelWorkbook {
  creator: string;
  created: Date;
  addWorksheet: (
    name: string,
    options?: { views?: Array<{ state: string; ySplit: number }> },
  ) => ExcelWorksheet;
  xlsx: { writeBuffer: () => Promise<ArrayBuffer> };
}

interface ExcelJSModuleShape {
  Workbook: new () => ExcelWorkbook;
}

// 🔥 AJOUT : export Excel réellement mis en forme (.xlsx), à la place du
// CSV brut précédent (qui s'ouvrait sans aucune mise en forme). Utilise
// ExcelJS, chargé dynamiquement uniquement au moment du clic sur
// "Télécharger" — n'alourdit pas le bundle initial de la page. Import
// depuis 'exceljs/dist/exceljs.min.js' (build navigateur officiel du
// paquet) plutôt que 'exceljs' directement, pour éviter les erreurs de
// bundler Next.js liées aux dépendances Node (fs/stream) du build serveur.
async function generateStyledExcel(rows: ExportRowUser[], isLateExport: boolean) {
  // @ts-expect-error — build navigateur d'ExcelJS, sans déclarations de types pour ce sous-chemin
  const ExcelJSModule: unknown = await import('exceljs/dist/exceljs.min.js');
  const ExcelJS = ((ExcelJSModule as { default?: ExcelJSModuleShape }).default ??
    ExcelJSModule) as ExcelJSModuleShape;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AssoGlobal';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(isLateExport ? 'Retardataires' : 'Membres', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const columns = isLateExport
    ? [
        { header: 'Nom',             key: 'lastName',    width: 18 },
        { header: 'Prénom',          key: 'firstName',   width: 18 },
        { header: 'Email',           key: 'email',       width: 30 },
        { header: 'Téléphone',       key: 'phone',       width: 16 },
        { header: 'Antenne',         key: 'antennaName', width: 18 },
        { header: 'Devise',          key: 'currency',    width: 10 },
        { header: 'Mois de retard',  key: 'lateMonths',  width: 14 },
        { header: 'Date Inscription',key: 'createdAt',   width: 16 },
      ]
    : [
        { header: 'Nom',             key: 'lastName',  width: 18 },
        { header: 'Prénom',          key: 'firstName', width: 18 },
        { header: 'Email',           key: 'email',     width: 30 },
        { header: 'Téléphone',       key: 'phone',     width: 16 },
        { header: 'Rôle',            key: 'role',      width: 14 },
        { header: 'Statut',          key: 'status',    width: 14 },
        { header: 'Devise',          key: 'currency',  width: 10 },
        { header: 'Date Inscription',key: 'createdAt', width: 16 },
      ];

  sheet.columns = columns;

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB91C1C' } },
      bottom: { style: 'thin', color: { argb: 'FFB91C1C' } },
    };
  });

  rows.forEach((u, idx) => {
    const rowData: Record<string, unknown> = isLateExport
      ? {
          lastName: u.lastName,
          firstName: u.firstName,
          email: u.email,
          phone: u.phone || '-',
          antennaName: u.antennaName || '-',
          currency: u.currency || '-',
          lateMonths: u.lateMonths ?? 0,
          createdAt: formatDate(u.createdAt),
        }
      : {
          lastName: u.lastName,
          firstName: u.firstName,
          email: u.email,
          phone: u.phone || '-',
          role: ROLE_MAP[u.role]?.label || u.role,
          status: STATUS_MAP[u.status]?.label || u.status,
          currency: getMemberCurrency(u) || '-',
          createdAt: formatDate(u.createdAt),
        };

    const row = sheet.addRow(rowData);
    const isEven = idx % 2 === 1;

    row.eachCell((cell) => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = { vertical: 'middle' };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    if (isLateExport) {
      const months = u.lateMonths ?? 0;
      const severity = months >= 12 ? 'FFDC2626' : months >= 6 ? 'FFD97706' : 'FF2563EB';
      row.getCell('lateMonths').font = { bold: true, color: { argb: severity } };
    } else {
      const st = STATUS_MAP[u.status];
      if (st) {
        row.getCell('status').font = { bold: true, color: { argb: `FF${st.color.replace('#', '')}` } };
      }
    }
  });

  const lastColLetter = String.fromCharCode(64 + columns.length);
  sheet.autoFilter = { from: 'A1', to: `${lastColLetter}1` };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Export_${isLateExport ? 'Retardataires' : 'Membres'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════════ MAIN PAGE */
export default function SuperAdminMembersPage() {
  const [allItems, setAllItems] = useState<ExtendedUser[]>([]);
  const [antennas, setAntennas] = useState<{ id: string; name: string }[]>([]);
  const [q,         setQ]         = useState('');
  const [status,    setStatus]    = useState('');
  const [antennaId, setAntennaId] = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);

  const [selectedUser,  setSelectedUser]  = useState<ExtendedUser | null>(null);
  const [viewingCard,   setViewingCard]   = useState<ExtendedUser | null>(null);
  const [isEditing,     setIsEditing]     = useState(false);
  const [editValues,    setEditValues]    = useState<Partial<ExtendedUser>>({});
  const [actionBusy,    setActionBusy]    = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [exportModalType, setExportModalType] = useState<'PDF' | 'EXCEL' | null>(null);
  const [exportAntenna,   setExportAntenna]   = useState('');
  const [exportCurrency,  setExportCurrency]  = useState('');
  const [exportStartMonth,setExportStartMonth]= useState('');
  const [exportEndMonth,  setExportEndMonth]  = useState('');
  const [exportLateOnly,  setExportLateOnly]  = useState(false);
  const [pdfData,         setPdfData]         = useState<Array<ExtendedUser & { lateMonths?: number; antennaName?: string | null; currency?: string | null }> | null>(null);
  const [pdfIsLateExport, setPdfIsLateExport] = useState(false);

  const [currencyFilter, setCurrencyFilter] = useState('');

  const load = useCallback(async (qVal?: string, sVal?: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.listMembers({
        page: 1,
        pageSize: 500,
        q: qVal ?? q,
        status: sVal ?? status,
      });
      setAllItems(res.items as ExtendedUser[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement membres');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  // Liste des devises réellement utilisées par l'association, déduite des
  // membres chargés — évite de dépendre d'un champ supplémentaire côté
  // antennas ou d'un nouvel appel API.
  const currencies = Array.from(
    new Set(allItems.map(u => getMemberCurrency(u)).filter((c): c is string => !!c))
  ).sort();

  const items = allItems
    .filter(u => !antennaId || getMemberAntennaId(u) === antennaId)
    .filter(u => !currencyFilter || getMemberCurrency(u) === currencyFilter);

  useEffect(() => {
    const init = async () => {
      try {
        const resAntennas = await api.listAntennas({ pageSize: 100 });
        setAntennas(resAntennas.items);
      } catch (e) { console.error(e); }
      void load();
    };
    void init();
  }, [load]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPdfData(null);
      setExportModalType(prev => prev === 'PDF' ? null : prev);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const openDetails = (user: ExtendedUser) => {
    setSelectedUser(user);
    const hydratedValues: Partial<ExtendedUser> = { ...user };

    if (user.countryOfBirth && !COUNTRIES.find(c => c.name === user.countryOfBirth)) {
      hydratedValues.countryOfBirth = 'Autre';
      hydratedValues.customCountryOfBirth = user.countryOfBirth;
    }
    if (user.originSubPrefecture && !COMMUNES_ORIGINE.includes(user.originSubPrefecture)) {
      hydratedValues.originSubPrefecture = 'Autre';
      hydratedValues.customOriginSubPrefecture = user.originSubPrefecture;
    }
    if (user.country && !COUNTRIES.find(c => c.name === user.country)) {
      hydratedValues.country = 'Autre';
      hydratedValues.customCountry = user.country;
    }
    if (user.function && !ASSOCIATION_ROLES.includes(user.function)) {
      hydratedValues.function = 'Autre';
      hydratedValues.customFunction = user.function;
    }

    setEditValues(hydratedValues);
    setIsEditing(false);
    setShowDeleteConfirm(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setActionBusy(true);
    try {
      const payloadToSave = { ...editValues };

      if (payloadToSave.countryOfBirth === 'Autre')      payloadToSave.countryOfBirth      = payloadToSave.customCountryOfBirth;
      if (payloadToSave.originSubPrefecture === 'Autre') payloadToSave.originSubPrefecture = payloadToSave.customOriginSubPrefecture;
      if (payloadToSave.country === 'Autre')             payloadToSave.country             = payloadToSave.customCountry;
      if (payloadToSave.function === 'Autre')            payloadToSave.function            = payloadToSave.customFunction;

      delete payloadToSave.customCountryOfBirth;
      delete payloadToSave.customOriginSubPrefecture;
      delete payloadToSave.customCountry;
      delete payloadToSave.customFunction;
      payloadToSave.addressLine2 = undefined;

      await api.updateUserSuperAdmin(selectedUser.id, payloadToSave);
      setIsEditing(false);
      setSelectedUser(null);
      await load();
    } catch (err) {
      console.error(err);
      alert('Erreur modification');
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    setActionBusy(true);
    try {
      if (selectedUser.status === 'SUSPENDED') await api.activateUserSuperAdmin(selectedUser.id);
      else await api.suspendUserSuperAdmin(selectedUser.id);
      setSelectedUser(null);
      await load();
    } catch (err) { console.error(err); alert('Erreur statut'); }
    finally { setActionBusy(false); }
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    setActionBusy(true);
    try {
      await api.approveMemberAccount(selectedUser.id);
      setSelectedUser(null);
      await load();
    } catch (err) { console.error(err); alert('Erreur validation'); }
    finally { setActionBusy(false); }
  };

  const handleDeleteRequest = () => { setDeleteConfirmText(''); setShowDeleteConfirm(true); };

  const executeDelete = async () => {
    if (!selectedUser) return;
    setShowDeleteConfirm(false);
    setActionBusy(true);
    try {
      await api.deleteUserSuperAdmin(selectedUser.id);
      setSelectedUser(null);
      await load();
    } catch (err) { console.error(err); alert('Erreur suppression'); }
    finally { setActionBusy(false); }
  };

  const executeExport = async () => {
    try {
      setActionBusy(true);

      let exportData: Array<ExtendedUser & { lateMonths?: number; antennaName?: string | null; currency?: string | null }> = [];

      if (exportLateOnly) {
        // 🔥 AJOUT : export "Retardataires" — route isolée dédiée
        // (GET /super-admin/late-members), déjà filtrée par antenne côté
        // backend si exportAntenna est renseigné (globalement sinon).
        const lateItems = await api.listLateMembersSuperAdmin(exportAntenna || undefined);
        exportData = lateItems as unknown as Array<ExtendedUser & { lateMonths?: number; antennaName?: string | null; currency?: string | null }>;

        // 🔥 AJOUT : filtre par devise — le backend renvoie déjà `currency`
        // par retardataire (devise de son antenne), simple filtre côté client.
        if (exportCurrency) exportData = exportData.filter(u => u.currency === exportCurrency);
      } else {
        const fetchRes = await api.listMembers({ page: 1, pageSize: 10000 });
        exportData = fetchRes.items as ExtendedUser[];

        if (exportAntenna) exportData = exportData.filter(u => {
          const withM = u as ExtendedUser & { memberships?: { antennaId?: string | null }[] };
          const aid = withM.memberships?.[0]?.antennaId ?? u.antennaId ?? null;
          return aid === exportAntenna;
        });

        // 🔥 AJOUT : filtre par devise — dérivée de l'antenne principale de
        // chaque membre (memberships[0].antenna.defaultCurrency), déjà
        // présente dans la réponse de listMembers, sans appel supplémentaire.
        if (exportCurrency) exportData = exportData.filter(u => getMemberCurrency(u) === exportCurrency);
      }

      if (exportStartMonth) {
        const start = new Date(`${exportStartMonth}-01T00:00:00Z`);
        exportData = exportData.filter(u => new Date(u.createdAt) >= start);
      }
      if (exportEndMonth) {
        const end = new Date(`${exportEndMonth}-01T00:00:00Z`);
        end.setMonth(end.getMonth() + 1);
        exportData = exportData.filter(u => new Date(u.createdAt) < end);
      }

      if (exportData.length === 0) {
        alert(exportLateOnly ? "Aucun retardataire ne correspond à ces critères." : "Aucun membre ne correspond à ces critères.");
        return;
      }

      if (exportModalType === 'EXCEL') {
        // 🔥 AJOUT : vrai fichier .xlsx mis en forme (ExcelJS), à la place
        // du CSV brut précédent — cf. generateStyledExcel() plus haut.
        await generateStyledExcel(exportData, exportLateOnly);
        setExportModalType(null);
      } else if (exportModalType === 'PDF') {
        setPdfIsLateExport(exportLateOnly);
        setPdfData(exportData);
        setTimeout(() => { window.print(); }, 800);
      }
    } catch (err) { console.error(err); alert("Erreur lors de l'exportation."); }
    finally { setActionBusy(false); }
  };

  const activeCount  = items.filter(u => u.status === 'ACTIVE').length;
  const pendingCount = items.filter(u => u.status === 'PENDING_APPROVAL').length;
  const suspCount    = items.filter(u => u.status === 'SUSPENDED').length;

  return (
    <AppShell title="Membres">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;700;800&display=swap');
        .sm-wrap { font-family:'DM Sans',sans-serif; padding:1rem; max-width:1200px; margin:0 auto; overflow-x:hidden; }

        .sm-header-row { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
        .sm-export-group { display:flex; gap:.5rem; }
        .btn-export { height:36px; padding:0 1rem; border-radius:10px; border:none; color:white; font-weight:800; font-size:.7rem; cursor:pointer; display:flex; align-items:center; gap:6px; transition:transform 0.2s; }
        .btn-export:hover { transform:translateY(-1px); filter:brightness(1.1); }
        .btn-pdf   { background:linear-gradient(135deg,#991B1B,#DC2626); box-shadow:0 4px 12px rgba(220,38,38,0.2); }
        .btn-excel { background:linear-gradient(135deg,#059669,#10B981); box-shadow:0 4px 12px rgba(16,185,129,0.2); }

        .sm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:.5rem; margin-bottom:1rem; }
        @media(max-width:600px){ .sm-stats { grid-template-columns:repeat(2,1fr); } }
        .sm-stat { background:white; border-radius:12px; padding:.75rem; border-top:3px solid; box-shadow:0 2px 6px rgba(0,0,0,0.05); }
        .sm-stat-val { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:700; line-height:1; }
        .sm-stat-lbl { font-size:.6rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-top:2px; }
        .sm-panel { background:white; border-radius:20px; box-shadow:0 4px 20px rgba(0,0,0,0.06); overflow:hidden; }

        .sm-toolbar { display:flex; flex-wrap:wrap; gap:.5rem; padding:1rem; border-bottom:1px solid #f1f5f9; align-items:center; }
        .sm-t-field { flex:1; min-width:150px; }
        .sm-toolbar-filters-row { display:flex; flex-wrap:nowrap; gap:.4rem; width:100%; align-items:center; }
        .sm-toolbar-filters-row .sm-select-field { flex:1 1 0; min-width:0; }
        .sm-input { width:100%; height:38px; border-radius:10px; border:1px solid #e2e8f0; padding:0 .75rem; font-size:.85rem; outline:none; }
        .sm-select { width:100%; height:38px; border-radius:10px; border:1px solid #e2e8f0; font-size:.72rem; font-weight:700; outline:none; padding:0 .4rem; background:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sm-filter-btn { flex:0 0 auto; width:40px; height:38px; border-radius:10px; background:#111827; color:white; border:none; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        @media(max-width:380px){ .sm-select { font-size:.65rem; padding:0 .3rem; } .sm-filter-btn { width:36px; } }

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
        .sm-member-id { font-size:.7rem; color:#94a3b8; margin-top:2px; }
        .modal-close { width:32px; height:32px; border-radius:50%; border:1.5px solid #e2e8f0; display:flex; align-items:center; justify-content:center; cursor:pointer; background:white; }
        .modal-body { padding:1.25rem; }
        .modal-actions-bar { margin-bottom:1.5rem; display:flex; gap:.5rem; }
        .sm-section-divider { font-size:.7rem; font-weight:800; color:#DC2626; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid #FECACA; padding-bottom:.4rem; margin:1.5rem 0 .75rem; }
        .sm-dp-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        .sm-dp-field { display:flex; flex-direction:column; gap:4px; }
        .sm-dp-field.full { grid-column:span 2; }
        .sm-dp-field label { font-size:.65rem; font-weight:800; color:#94a3b8; text-transform:uppercase; }
        .sm-dp-value { font-size:.9rem; font-weight:600; color:#1e293b; padding:4px 0; }
        .sm-dp-input { height:38px; border-radius:8px; border:1px solid #e2e8f0; padding:0 .75rem; font-size:.85rem; font-weight:600; width:100%; background:white; }
        .btn-save { flex:1; height:40px; background:#059669; color:white; border:none; border-radius:10px; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; }
        .btn-cancel { height:40px; padding:0 1rem; border:1.5px solid #e2e8f0; border-radius:10px; font-weight:700; cursor:pointer; background:white; }
        .sp-icon-btn { width:34px; height:34px; border-radius:9px; border:1.5px solid var(--border); background:var(--bg); color:var(--color); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.2s; }
        .sp-icon-btn:hover { background:var(--hover-bg); transform:translateY(-1px); }

        .confirm-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.8); backdrop-filter:blur(8px); z-index:2000; display:flex; align-items:center; justify-content:center; padding:1.5rem; animation:fadeIn .2s ease-out; }
        .confirm-content { background:white; width:100%; max-width:400px; border-radius:24px; padding:2rem 1.5rem; text-align:center; box-shadow:0 25px 50px -12px rgba(0,0,0,.25); animation:slideUp .3s cubic-bezier(0.16,1,0.3,1); }
        .confirm-icon { width:64px; height:64px; background:#FEF2F2; color:#DC2626; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem; border:8px solid #FFF5F5; }
        .confirm-title { font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:700; color:#111827; margin-bottom:.5rem; line-height:1.2; }
        .confirm-text { font-size:.9rem; color:#64748b; margin-bottom:1.5rem; line-height:1.5; }
        .confirm-actions { display:flex; gap:1rem; flex-direction:column; }
        @media(min-width:600px){ .confirm-actions { flex-direction:row; } .confirm-actions > * { flex:1; } }
        .btn-confirm-del { height:44px; background:#DC2626; color:white; border:none; border-radius:12px; font-size:.9rem; font-weight:800; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .2s; }
        .btn-confirm-del:hover:not(:disabled) { background:#B91C1C; }
        .btn-confirm-cancel { height:44px; background:#f1f5f9; color:#475569; border:none; border-radius:12px; font-size:.9rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .2s; }
        .btn-confirm-cancel:hover { background:#e2e8f0; }

        .export-flex-row { display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
        .export-flex-item { flex:1 1 calc(50% - .5rem); min-width:140px; }
        .export-flex-item.full { flex:1 1 100%; }

        @media print {
          body * { visibility:hidden; }
          .printable-export-area, .printable-export-area * { visibility:visible; }
          .printable-export-area { position:absolute; left:0; top:0; width:100%; display:block !important; }
        }
        .printable-export-area { display:none; }

        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      {/* Zone imprimable PDF */}
      {pdfData && (
        <div className="printable-export-area">
          <h2 style={{ textAlign: 'center', marginBottom: 20, fontFamily: "'Cormorant Garamond',serif" }}>
            {pdfIsLateExport ? 'Liste des Retardataires' : 'Liste des Membres'}
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {(pdfIsLateExport
                  ? ['Nom & Prénom', 'Email', 'Téléphone', 'Antenne', 'Devise', 'Mois de retard', 'Date Inscription']
                  : ['Nom & Prénom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Devise', 'Date Inscription']
                ).map(h => (
                  <th key={h} style={{ border: '1px solid #cbd5e1', padding: 8, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pdfData.map(u => (
                <tr key={u.id}>
                  <td style={{ border: '1px solid #cbd5e1', padding: 8, fontWeight: 'bold' }}>{u.firstName} {u.lastName}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: 8 }}>{u.email}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: 8 }}>{u.phone || '-'}</td>
                  {pdfIsLateExport ? (
                    <>
                      <td style={{ border: '1px solid #cbd5e1', padding: 8 }}>{u.antennaName || '-'}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: 8 }}>{u.currency || '-'}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: 8, fontWeight: 'bold', color: '#DC2626' }}>{u.lateMonths ?? '-'}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ border: '1px solid #cbd5e1', padding: 8 }}>{ROLE_MAP[u.role]?.label || u.role}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: 8 }}>{STATUS_MAP[u.status]?.label || u.status}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: 8 }}>{getMemberCurrency(u) || '-'}</td>
                    </>
                  )}
                  <td style={{ border: '1px solid #cbd5e1', padding: 8 }}>{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sm-wrap">
        <div className="sm-header-row">
          <header>
            <div style={{ fontSize: '.7rem', fontWeight: 900, color: '#DC2626', letterSpacing: '.1em', textTransform: 'uppercase' }}>Super Admin</div>
            <h1 style={{ fontSize: 'clamp(1.3rem,5vw,1.8rem)', margin: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>
              Membres — <span>vue globale</span>
            </h1>
          </header>
          <div className="sm-export-group">
            <button className="btn-export btn-pdf" onClick={() => setExportModalType('PDF')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm9-9h-6v2h4v10H5V9h4V7H3v14h18V7z" /></svg>
              PDF
            </button>
            <button className="btn-export btn-excel" onClick={() => setExportModalType('EXCEL')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
              EXCEL
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '1rem', borderRadius: 12, marginBottom: '1rem', border: '1px solid #FECACA', fontWeight: 700 }}>
            {error}
          </div>
        )}

        <div className="sm-stats">
          <div className="sm-stat" style={{ borderTopColor: '#DC2626' }}><div className="sm-stat-val" style={{ color: '#DC2626' }}>{items.length}</div><div className="sm-stat-lbl">Membres</div></div>
          <div className="sm-stat" style={{ borderTopColor: '#059669' }}><div className="sm-stat-val" style={{ color: '#059669' }}>{activeCount}</div><div className="sm-stat-lbl">Actifs</div></div>
          <div className="sm-stat" style={{ borderTopColor: '#D97706' }}><div className="sm-stat-val" style={{ color: '#D97706' }}>{pendingCount}</div><div className="sm-stat-lbl">Attente</div></div>
          <div className="sm-stat" style={{ borderTopColor: '#7C3AED' }}><div className="sm-stat-val" style={{ color: '#7C3AED' }}>{suspCount}</div><div className="sm-stat-lbl">Suspens</div></div>
        </div>

        <div className="sm-panel">
          <div className="sm-toolbar">
            <div className="sm-t-field">
              <input className="sm-input" placeholder="Nom, prénom ou email..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && void load()} />
            </div>
            <div className="sm-toolbar-filters-row">
              <div className="sm-select-field">
                <select className="sm-select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="">Tous statuts</option>
                  <option value="ACTIVE">Actifs</option>
                  <option value="PENDING_APPROVAL">Attente</option>
                  <option value="SUSPENDED">Suspendus</option>
                </select>
              </div>
              <div className="sm-select-field">
                <select className="sm-select" value={antennaId} onChange={e => setAntennaId(e.target.value)}>
                  <option value="">Toutes antennes</option>
                  {antennas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <button className="sm-filter-btn" onClick={() => void load()}>
                {loading ? '...' : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z" /></svg>}
              </button>
            </div>
            {currencies.length > 0 && (
              <div className="sm-t-field">
                <select className="sm-select" style={{ height: 38 }} value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)}>
                  <option value="">Toutes devises</option>
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Vue tableau desktop */}
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

          {/* Vue mobile */}
          <div className="sm-mob">
            {items.map(u => (
              <div key={u.id} className="sm-mc" onClick={() => openDetails(u)}>
                <div className="sm-mc-top">
                  <Initials name={fullName(u)} url={u.profilePhotoUrl} />
                  <div className="sm-mc-info">
                    <div className="sm-member-name">{fullName(u)}</div>
                    <div className="sm-member-email">{u.email}</div>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="3"><path d="M9 5l7 7-7 7" /></svg>
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

      {/* Modale export */}
      {exportModalType && (
        <div className="modal-overlay" onClick={() => setExportModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '2rem', maxWidth: 500 }}>
            <h2 className="modal-title" style={{ marginBottom: '1.5rem' }}>Exporter en {exportModalType === 'EXCEL' ? 'Excel' : 'PDF'}</h2>
            <div className="export-flex-row">
              <div className="export-flex-item full">
                <label
                  htmlFor="export-late-only"
                  style={{ display: 'flex', alignItems: 'center', gap: '.6rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '.7rem .9rem', cursor: 'pointer' }}
                >
                  <input
                    id="export-late-only"
                    type="checkbox"
                    checked={exportLateOnly}
                    onChange={e => setExportLateOnly(e.target.checked)}
                    style={{ width: 18, height: 18, flexShrink: 0, accentColor: '#D97706' }}
                  />
                  <span style={{ fontSize: '.8rem', fontWeight: 800, color: '#92400E' }}>
                    Uniquement les retardataires (≥ 1 mois)
                  </span>
                </label>
              </div>
              <div className="export-flex-item">
                <label style={{ fontSize: '.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '.4rem' }}>Filtrer par Antenne</label>
                <select className="sm-input" value={exportAntenna} onChange={e => setExportAntenna(e.target.value)} style={{ width: '100%', height: 42, background: '#f8fafc' }}>
                  <option value="">Toutes les antennes (Global)</option>
                  {antennas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="export-flex-item">
                <label style={{ fontSize: '.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '.4rem' }}>Filtrer par Devise</label>
                <select className="sm-input" value={exportCurrency} onChange={e => setExportCurrency(e.target.value)} style={{ width: '100%', height: 42, background: '#f8fafc' }}>
                  <option value="">Toutes les devises</option>
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="export-flex-item">
                <label style={{ fontSize: '.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '.4rem' }}>Adhésions depuis</label>
                <input type="month" className="sm-input" value={exportStartMonth} onChange={e => setExportStartMonth(e.target.value)} style={{ width: '100%', height: 42, background: '#f8fafc' }} />
              </div>
              <div className="export-flex-item">
                <label style={{ fontSize: '.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '.4rem' }}>Adhésions jusqu&apos;à</label>
                <input type="month" className="sm-input" value={exportEndMonth} onChange={e => setExportEndMonth(e.target.value)} style={{ width: '100%', height: 42, background: '#f8fafc' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn-cancel" style={{ flex: 1 }} onClick={() => setExportModalType(null)}>Annuler</button>
              <button className="btn-save" style={{ flex: 1, background: exportModalType === 'EXCEL' ? '#10B981' : '#DC2626' }} onClick={() => void executeExport()} disabled={actionBusy}>
                {actionBusy ? 'Génération...' : 'Télécharger'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          onDelete={handleDeleteRequest}
          onViewCard={() => setViewingCard(selectedUser)}
        />
      )}

      {viewingCard && (
        <MemberCardPreviewModal
          memberId={viewingCard.id}
          memberName={fullName(viewingCard)}
          scope="super-admin"
          onClose={() => setViewingCard(null)}
        />
      )}

      {showDeleteConfirm && selectedUser && (
        <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-content" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="confirm-title">Suppression définitive</h3>
            <p className="confirm-text">
              Êtes-vous sûr de vouloir supprimer le compte de <strong style={{ color: '#111827' }}>{fullName(selectedUser)}</strong> ?<br />Cette action est immédiate et effacera toutes ses données.
            </p>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 12, marginBottom: '1.5rem', textAlign: 'left', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 800, color: '#475569', marginBottom: '.5rem' }}>
                Saisissez <span style={{ color: '#DC2626', userSelect: 'all' }}>{selectedUser.email}</span> pour confirmer :
              </label>
              <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #cbd5e1', padding: '0 .75rem', fontSize: '.85rem', outline: 'none' }} placeholder="Tapez l'email ici..." />
            </div>
            <div className="confirm-actions">
              <button className="btn-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
              <button className="btn-confirm-del" onClick={executeDelete} disabled={actionBusy || deleteConfirmText !== selectedUser.email} style={{ opacity: (actionBusy || deleteConfirmText !== selectedUser.email) ? 0.5 : 1, cursor: (actionBusy || deleteConfirmText !== selectedUser.email) ? 'not-allowed' : 'pointer' }}>
                {actionBusy ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
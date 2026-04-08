// web/app/(protected)/admin/members/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChangeEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import { formatDate, fullName } from '../../../../../lib/format';
import type { UserSummary } from '../../../../../types/user';

// ── CONSTANTES RÉCUPÉRÉES DU SIGNUP ──
const ASSOCIATION_ROLES = [
  'Membre (simple)', "Secrétaire à l'organisation", 'Secrétaire Général(e)',
  'Trésorier / Trésorière', 'Président(e)', 'Vice-président(e)',
  'Chargé(e) de communication', 'Conseiller / Conseillère', 'Autre'
];

const PROFESSION_LIST = [
  'Étudiant(e)', 'Employé(e)', 'Fonctionnaire', 'Indépendant / Entrepreneur',
  'Profession libérale', 'Cadre / Dirigeant', 'Artisan / Commerçant',
  'Agriculteur', 'Sans emploi', 'Retraité(e)', 'Autre'
];

const COMMUNES_ORIGINE = [
  'C. Urbaine', 'Lafou', 'Manda', 'Balaya', 'Thiaguel Bori', 
  'Parawol', 'Sagalé', 'Hérico', 'Diountou', 'Korbé', 'Linsan'
];

const COUNTRY_NAMES = [
  'Guinée', 'France', 'Sénégal', "Côte d'Ivoire", 'Mali', 'Maroc', 'Canada', 
  'États-Unis', 'Belgique', 'Suisse', 'Allemagne', 'Royaume-Uni', 'Espagne', 
  'Italie', 'Sierra Leone', 'Libéria', 'Guinée-Bissau', 'Gambie', 'Angola', 
  'Cameroun', 'Niger', 'Afrique du Sud', 'Mozambique', 'Portugal', 'Autre (Non listé)'
].sort();

const USER_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:           { label: 'Actif',              color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  PENDING_APPROVAL: { label: 'En attente',         color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  EMAIL_UNVERIFIED: { label: 'Email non vérif.',   color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  SUSPENDED:        { label: 'Suspendu',           color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  REJECTED:         { label: 'Rejeté',             color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  DELETED:          { label: 'Supprimé',           color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

function UserStatusBadge({ status }: { status: string }) {
  const s = USER_STATUS_MAP[status] ?? USER_STATUS_MAP['PENDING_APPROVAL'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: 'clamp(0.6rem, 2vw, 0.68rem)', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '.15rem .45rem', whiteSpace: 'nowrap', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
    </span>
  );
}

function BigInitials({ name, color = '#2563EB' }: { name: string; color?: string }) {
  const parts = name.trim().split(' ');
  const txt = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return (
    <div style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${color},${color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', fontWeight: 700, boxShadow: `0 8px 16px ${color}33` }}>
      {txt}
    </div>
  );
}

type ExtendedMember = UserSummary & {
  city?: string;
  country?: string;
  postalCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  originSubPrefecture?: string;
  originVillage?: string;
  birthDate?: string | Date;
  placeOfBirth?: string;
  birthCountry?: string;
  professionalStatus?: string;
  function?: string;
};

export default function AdminMemberDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [user, setUser] = useState<ExtendedMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode Édition
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // Champs d'édition
  const [fFirstName, setFFirstName] = useState('');
  const [fLastName, setFLastName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fProfession, setFProfession] = useState('');
  const [fAssociationRole, setFAssociationRole] = useState('');
  const [fBirthDate, setFBirthDate] = useState('');
  const [fPlaceOfBirth, setFPlaceOfBirth] = useState('');
  const [fBirthCountry, setFBirthCountry] = useState('');
  const [fCustomBirthCountry, setFCustomBirthCountry] = useState('');
  const [fOriginSubPrefecture, setFOriginSubPrefecture] = useState('');
  const [fOriginVillage, setFOriginVillage] = useState('');
  const [fCity, setFCity] = useState('');
  const [fCountry, setFCountry] = useState('');
  const [fCustomCountry, setFCustomCountry] = useState('');
  const [fPostalCode, setFPostalCode] = useState('');
  const [fAddressLine1, setFAddressLine1] = useState('');
  const [fAddressLine2, setFAddressLine2] = useState('');

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await api.listAntennaMembers({ page: 1, pageSize: 500 });
        const found = res.items.find((u) => u.id === id);
        
        if (!found) throw new Error('Membre introuvable dans votre antenne.');
        
        const extendedFound = found as ExtendedMember;
        setUser(extendedFound);

        let initialBirthDate = '';
        if (extendedFound.birthDate) {
          const d = new Date(extendedFound.birthDate);
          if (!isNaN(d.getTime())) {
            initialBirthDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
          }
        }

        const isStandardBirthCountry = !extendedFound.birthCountry || COUNTRY_NAMES.includes(extendedFound.birthCountry);
        const isStandardCountry = !extendedFound.country || COUNTRY_NAMES.includes(extendedFound.country);

        setFFirstName(extendedFound.firstName ?? '');
        setFLastName(extendedFound.lastName ?? '');
        setFPhone(extendedFound.phone ?? '');
        setFProfession(extendedFound.professionalStatus ?? '');
        setFAssociationRole(extendedFound.function ?? '');
        setFBirthDate(initialBirthDate);
        setFPlaceOfBirth(extendedFound.placeOfBirth ?? '');
        setFBirthCountry(isStandardBirthCountry ? (extendedFound.birthCountry ?? '') : 'Autre (Non listé)');
        setFCustomBirthCountry(isStandardBirthCountry ? '' : (extendedFound.birthCountry ?? ''));
        setFOriginSubPrefecture(extendedFound.originSubPrefecture ?? '');
        setFOriginVillage(extendedFound.originVillage ?? '');
        setFCity(extendedFound.city ?? '');
        setFCountry(isStandardCountry ? (extendedFound.country ?? '') : 'Autre (Non listé)');
        setFCustomCountry(isStandardCountry ? '' : (extendedFound.country ?? ''));
        setFPostalCode(extendedFound.postalCode ?? '');
        setFAddressLine1(extendedFound.addressLine1 ?? '');
        setFAddressLine2(extendedFound.addressLine2 ?? '');
        
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger les détails.");
      } finally {
        setLoading(false);
      }
    }
    void fetchUser();
  }, [id]);

  const handleBirthDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    let formatted = value;
    if (value.length > 2) formatted = `${value.slice(0, 2)}/${value.slice(2)}`;
    if (value.length > 4) formatted = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    setFBirthDate(formatted);
  };

  const convertDateToISO = (dateStr: string): string | undefined => {
    if (!dateStr || dateStr.length !== 10) return undefined;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  async function handleToggleStatus(action: 'ACTIVATE' | 'SUSPEND' | 'APPROVE' | 'REJECT') {
    if (!user || busy) return;
    setBusy(true);
    try {
      if (action === 'SUSPEND') await api.suspendUser(id);
      else if (action === 'ACTIVATE') await api.activateUser(id);
      else if (action === 'APPROVE') await api.approveMemberAccountAntenna(id);
      else if (action === 'REJECT') await api.rejectMemberAccountAntenna(id);
      
      const res = await api.listAntennaMembers({ page: 1, pageSize: 500 });
      const updated = res.items.find((u) => u.id === id);
      if (updated) setUser(updated as ExtendedMember);
    } catch {
      alert('Erreur lors du changement de statut');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!user || busy) return;
    
    const confirmEmail = window.prompt(
      `ATTENTION : Vous êtes sur le point de supprimer définitivement le compte de ${fullName(user)}.\n\nPour confirmer, veuillez saisir son adresse email exacte (${user.email}) :`
    );
    
    if (confirmEmail !== user.email) {
      if (confirmEmail !== null) alert("L'adresse email saisie est incorrecte. La suppression a été annulée.");
      return;
    }

    setBusy(true);
    try {
      await api.deleteUser(id);
      router.push('/admin/members');
    } catch {
      alert('Erreur lors de la suppression');
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!user || saving) return;
    setSaving(true); 
    setSaveError(null); 
    setSaveOk(false);
    
    try {
      const finalBirthCountry = fBirthCountry === 'Autre (Non listé)' ? fCustomBirthCountry : fBirthCountry;
      const finalCountry = fCountry === 'Autre (Non listé)' ? fCustomCountry : fCountry;

      // 🔥 Le vrai appel API au backend !
      await api.updateAntennaMember(id, {
        firstName: fFirstName.trim() || undefined,
        lastName: fLastName.trim() || undefined,
        phone: fPhone.trim() || undefined,
        professionalStatus: fProfession || undefined,
        function: fAssociationRole || undefined,
        birthDate: convertDateToISO(fBirthDate) || undefined,
        placeOfBirth: fPlaceOfBirth.trim() || undefined,
        birthCountry: finalBirthCountry.trim() || undefined,
        city: fCity.trim() || undefined,
        country: finalCountry.trim() || undefined,
        postalCode: fPostalCode.trim() || undefined,
        addressLine1: fAddressLine1.trim() || undefined,
        addressLine2: fAddressLine2.trim() || undefined,
        originSubPrefecture: fOriginSubPrefecture || undefined,
        originVillage: fOriginVillage.trim() || undefined,
      });
      
      setIsEditing(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 4000);

      // Rafraîchir les infos
      const res = await api.listAntennaMembers({ page: 1, pageSize: 500 });
      const updated = res.items.find((u) => u.id === id);
      if (updated) setUser(updated as ExtendedMember);

    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  }

  const renderInfoValue = (value: string | null | undefined) => {
    if (!value || value.trim() === '') return <span className="empty">Non renseigné</span>;
    return value;
  };

  if (loading) {
    return (
      <AppShell title="Chargement...">
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '.75rem', color: '#6B7280', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '.85rem' }}>
          <div style={{ width: 22, height: 22, border: '2.5px solid rgba(37,99,235,.12)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          Récupération du profil&hellip;
        </div>
      </AppShell>
    );
  }

  if (error || !user) {
    return (
      <AppShell title="Erreur">
        <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
          <Link href="/admin/members" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', fontWeight: 700, color: '#DC2626', textDecoration: 'none', marginBottom: '1.5rem' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Retour aux membres
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.9rem 1.1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, color: '#B91C1C', fontSize: '.82rem', fontWeight: 800 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
            {error ?? 'Membre introuvable'}
          </div>
        </div>
      </AppShell>
    );
  }

  // 🔥 RESTAURATION DES VARIABLES DE STATUT
  let statusColor = '#6B7280', statusBg = '#F3F4F6', statusBorder = '#E5E7EB';
  let statusLabel: string = user.status; 

  if (user.status === 'ACTIVE') { statusColor = '#059669'; statusBg = '#ECFDF5'; statusBorder = '#A7F3D0'; statusLabel = 'Actif'; }
  else if (user.status === 'SUSPENDED') { statusColor = '#DC2626'; statusBg = '#FEF2F2'; statusBorder = '#FECACA'; statusLabel = 'Suspendu'; }
  else if (user.status === 'PENDING_APPROVAL') { statusColor = '#D97706'; statusBg = '#FFFBEB'; statusBorder = '#FDE68A'; statusLabel = 'En attente'; }
  else if (user.status === 'REJECTED') { statusColor = '#7C3AED'; statusBg = '#F5F3FF'; statusBorder = '#DDD6FE'; statusLabel = 'Rejeté'; }

  return (
    <AppShell title={`Profil : ${fullName(user)}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadein { to { opacity: 1; transform: translateY(0); } }

        .md-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 1000px; margin: 0 auto; }

        .md-back { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 700; color: #2563EB; text-decoration: none; margin-bottom: 1.25rem; opacity: 0; transform: translateY(8px); animation: fadein 0.4s 0.02s cubic-bezier(.22,1,.36,1) forwards; transition: color 0.15s; }
        .md-back:hover { color: #1D4ED8; }

        .md-eyebrow { font-size: 0.67rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; opacity: 0; transform: translateY(8px); animation: fadein 0.45s 0.05s cubic-bezier(.22,1,.36,1) forwards; }
        .md-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

        /* ── Hero ── */
        .md-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; background: rgba(253,253,255,0.94); backdrop-filter: blur(14px); border-radius: 22px; border: 1px solid rgba(37,99,235,0.09); box-shadow: 0 2px 18px rgba(37,99,235,0.06), 0 0 0 1px rgba(255,255,255,0.9) inset; padding: 1.5rem; margin-bottom: 1rem; opacity: 0; transform: translateY(10px); animation: fadein 0.5s 0.08s cubic-bezier(.22,1,.36,1) forwards; }
        .md-hero-left { display: flex; align-items: center; gap: 1rem; min-width: 0; }
        .md-hero-name { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.3rem, 3vw, 1.75rem); font-weight: 700; color: #0F172A; letter-spacing: -0.01em; line-height: 1.15; margin-bottom: 0.3rem; }
        .md-hero-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .md-role-tag { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.65rem; font-weight: 800; background: #EFF6FF; color: #1D4ED8; padding: 0.22rem 0.65rem; border-radius: 99px; border: 1px solid #BFDBFE; letter-spacing: 0.04em; }
        .md-hero-email { font-size: 0.78rem; font-weight: 600; color: #6B7280; }
        .md-status-badge { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.68rem; font-weight: 900; border-radius: 99px; padding: 0.22rem 0.65rem; }

        /* ── Action buttons ── */
        .md-btn-edit { height: 36px; padding: 0 1rem; border-radius: 9px; border: none; background: linear-gradient(135deg, #1D4ED8, #2563EB); color: white; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(37,99,235,0.28); transition: all 0.15s; white-space: nowrap; }
        .md-btn-edit:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.38); }
        
        .md-btn-cancel-edit { height: 36px; padding: 0 1rem; border-radius: 9px; border: 1.5px solid rgba(220,38,38,0.2); background: rgba(254,242,242,0.5); color: #B91C1C; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.15s; white-space: nowrap; }
        .md-btn-cancel-edit:hover { background: #FEE2E2; border-color: rgba(220,38,38,0.4); }
        
        .md-btn-suspend { height: 36px; padding: 0 1rem; border-radius: 9px; border: 1.5px solid rgba(217,119,6,0.25); background: #FFFBEB; color: #B45309; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.15s; white-space: nowrap; }
        .md-btn-suspend:hover:not(:disabled) { background: #FEF3C7; border-color: rgba(217,119,6,0.45); transform: translateY(-1px); }
        .md-btn-suspend:disabled { opacity: 0.55; cursor: not-allowed; }
        
        .md-btn-approve { height: 36px; padding: 0 1rem; border-radius: 9px; border: 1.5px solid rgba(5,150,105,0.25); background: #ECFDF5; color: #059669; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.15s; white-space: nowrap; }
        .md-btn-approve:hover:not(:disabled) { background: #D1FAE5; border-color: rgba(5,150,105,0.45); transform: translateY(-1px); }

        .md-btn-reject { height: 36px; padding: 0 1rem; border-radius: 9px; border: none; background: linear-gradient(135deg, #D97706, #F59E0B); color: white; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); transition: all 0.15s; white-space: nowrap; }
        .md-btn-reject:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(217, 119, 6, 0.35); }
        
        .md-btn-del { height: 36px; padding: 0 1rem; border-radius: 9px; border: 1.5px solid rgba(220,38,38,0.2); background: white; color: #DC2626; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.15s; white-space: nowrap; }
        .md-btn-del:hover:not(:disabled) { background: #FEF2F2; border-color: rgba(220,38,38,0.4); transform: translateY(-1px); }
        .md-btn-del:disabled { opacity: 0.55; cursor: not-allowed; }

        @media (max-width: 560px) {
          .btn-text { display: none; }
          .md-btn-edit, .md-btn-cancel-edit, .md-btn-suspend, .md-btn-approve, .md-btn-reject, .md-btn-del {
            padding: 0; width: 36px; justify-content: center; gap: 0;
          }
        }

        /* ── Info cards ── */
        .md-card { background: rgba(253,253,255,0.94); backdrop-filter: blur(14px); border-radius: 22px; border: 1px solid rgba(37,99,235,0.09); box-shadow: 0 2px 18px rgba(37,99,235,0.06), 0 0 0 1px rgba(255,255,255,0.9) inset; overflow: hidden; margin-bottom: 1rem; opacity: 0; transform: translateY(10px); }
        .md-card.d1 { animation: fadein 0.5s 0.12s cubic-bezier(.22,1,.36,1) forwards; }
        .md-card.d2 { animation: fadein 0.5s 0.17s cubic-bezier(.22,1,.36,1) forwards; }
        .md-card.d3 { animation: fadein 0.5s 0.22s cubic-bezier(.22,1,.36,1) forwards; }
        .md-card.d4 { animation: fadein 0.5s 0.27s cubic-bezier(.22,1,.36,1) forwards; }

        .md-card-h { padding: 0.85rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.07); display: flex; align-items: center; gap: 0.5rem; }
        .md-card-ico { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .md-card-title { font-size: 0.72rem; font-weight: 900; letter-spacing: 0.09em; text-transform: uppercase; color: #374151; }

        .md-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem 1rem; padding: 1.25rem 1.4rem; }
        .md-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media(max-width:680px) { .md-grid-3, .md-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media(max-width:480px) { .md-grid-3, .md-grid { grid-template-columns: 1fr; } }

        .md-field { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
        .md-field-label { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; }
        .md-field-value { font-size: 0.86rem; font-weight: 700; color: #111827; word-break: break-word; }
        .md-field-value .empty { color: #D1D5DB; font-style: italic; font-weight: 500; }

        /* ── Edit form panel ── */
        .md-edit-panel { background: rgba(253,253,255,0.94); backdrop-filter: blur(14px); border-radius: 22px; border: 1.5px solid rgba(37,99,235,0.18); box-shadow: 0 2px 18px rgba(37,99,235,0.08), 0 0 0 1px rgba(255,255,255,0.9) inset; overflow: hidden; margin-bottom: 1rem; opacity: 0; transform: translateY(10px); animation: fadein 0.4s cubic-bezier(.22,1,.36,1) forwards; }
        .md-edit-head { padding: 0.9rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.1); display: flex; align-items: center; justify-content: space-between; background: rgba(239,246,255,0.5); }
        .md-edit-title { font-size: 0.72rem; font-weight: 900; letter-spacing: 0.09em; text-transform: uppercase; color: #1D4ED8; }
        .md-edit-body { padding: 1.4rem; }
        .md-edit-section { margin-bottom: 1.5rem; }
        .md-edit-section-title { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        .md-edit-section-title::after { content: ''; flex: 1; height: 1px; background: rgba(37,99,235,0.1); }
        
        .md-edit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
        @media(max-width:560px) { .md-edit-grid { grid-template-columns: 1fr; } }

        .md-edit-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .md-edit-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #2563EB; }
        .md-edit-input, .md-edit-select { min-height: 44px; border-radius: 11px; border: 1px solid rgba(37,99,235,0.16); background: rgba(255,255,255,0.9); padding: 0 0.9rem; font-family: 'DM Sans', sans-serif; font-size: 0.86rem; font-weight: 600; color: #111827; outline: none; transition: border-color 0.18s, box-shadow 0.18s; width: 100%; box-sizing: border-box; }
        .md-edit-input:focus, .md-edit-select:focus { border-color: rgba(37,99,235,0.5); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); background: white; }
        .md-edit-input::placeholder { color: rgba(107,114,128,0.4); font-weight: 400; }
        .md-edit-input:disabled { background: #F3F4F6; color: #9CA3AF; cursor: not-allowed; border-color: #E5E7EB; }
        
        .md-edit-select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%232563EB' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; padding-right: 2.5rem; }

        .md-edit-footer { display: flex; gap: 0.6rem; align-items: center; padding-top: 1.2rem; border-top: 1px solid rgba(37,99,235,0.08); flex-wrap: wrap; }
        .md-btn-save { min-height: 44px; padding: 0 1.3rem; background: linear-gradient(135deg, #1D4ED8, #2563EB); border: none; border-radius: 11px; color: white; font-family: 'DM Sans', sans-serif; font-size: 0.84rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.45rem; box-shadow: 0 4px 14px rgba(37,99,235,0.28); transition: transform 0.15s, box-shadow 0.2s; }
        .md-btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37,99,235,0.38); }
        .md-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .md-btn-cancel-save { min-height: 44px; padding: 0 1.1rem; background: rgba(249,250,251,0.9); border: 1px solid rgba(37,99,235,0.18); border-radius: 11px; color: #6B7280; font-family: 'DM Sans', sans-serif; font-size: 0.84rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .md-btn-cancel-save:hover:not(:disabled) { background: #F3F4F6; color: #374151; }
        
        .md-save-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 0.9rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; color: #B91C1C; font-size: 0.78rem; font-weight: 700; width: 100%; margin-top: 0.5rem; }

        /* 🔥 ANIMATIONS ET STYLES DU TOAST */
        .aa-global-toast {
          position: fixed; bottom: 30px; right: 30px;
          background: white; border-left: 4px solid #059669;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          padding: 1rem 1.5rem; border-radius: 8px;
          display: flex; align-items: center; gap: 0.75rem;
          color: #111827; font-weight: 700; font-size: 0.9rem;
          z-index: 99999;
          animation: slideInToast 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards, fadeOutToast 0.4s 3.6s forwards;
        }
        @keyframes slideInToast { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeOutToast { to { opacity: 0; transform: translateX(20px); } }
      `}</style>

      {/* 🔥 TOAST DE CONFIRMATION GLOBALE */}
      {saveOk && (
        <div className="aa-global-toast">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Mise à jour réussie !
        </div>
      )}

      <div className="md-wrap">

        {/* Back */}
        <Link href="/admin/members" className="md-back">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour à l&apos;annuaire
        </Link>

        {/* Eyebrow */}
        <div className="md-eyebrow">
          <div className="md-dot" />Admin Antenne
        </div>

        {/* ── Hero ── */}
        <div className="md-hero">
          <div className="md-hero-left">
            {/* 🔥 UTILISATION DE BigInitials au lieu du md-avatar */}
            <BigInitials name={fullName(user)} color={USER_STATUS_MAP[user.status]?.color || '#2563EB'} />
            <div style={{ minWidth: 0 }}>
              <div className="md-hero-name">{fullName(user)}</div>
              <div className="md-hero-meta">
                <span className="md-role-tag">
                  <div style={{ width: 5, height: 5, background: '#3B82F6', borderRadius: '50%' }} />
                  MEMBRE
                </span>
                <UserStatusBadge status={user.status} />
              </div>
              {user.email && <div className="md-hero-email" style={{ marginTop: '.3rem' }}>{user.email}</div>}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
            {!isEditing ? (
              <button className="md-btn-edit" onClick={() => { setIsEditing(true); setSaveOk(false); setSaveError(null); }} title="Modifier">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span className="btn-text">Modifier</span>
              </button>
            ) : (
              <button className="md-btn-cancel-edit" onClick={() => { setIsEditing(false); setSaveError(null); }} title="Annuler">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="btn-text">Annuler</span>
              </button>
            )}
            
            {user.status === 'PENDING_APPROVAL' && (
              <>
                <button className="md-btn-approve" disabled={busy} onClick={() => handleToggleStatus('APPROVE')} title="Valider">
                  {busy ? <div style={{ width: 13, height: 13, border: '2px solid rgba(5,150,105,.3)', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  <span className="btn-text">Valider</span>
                </button>
                <button className="md-btn-reject" disabled={busy} onClick={() => handleToggleStatus('REJECT')} title="Rejeter">
                  {busy ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>}
                  <span className="btn-text">Rejeter</span>
                </button>
              </>
            )}

            {user.status === 'ACTIVE' && (
              <button className="md-btn-suspend" disabled={busy} onClick={() => handleToggleStatus('SUSPEND')} title="Suspendre">
                {busy ? <div style={{ width: 13, height: 13, border: '2px solid rgba(180,83,9,.3)', borderTopColor: '#B45309', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" /></svg>}
                <span className="btn-text">Suspendre</span>
              </button>
            )}

            {user.status === 'SUSPENDED' && (
              <button className="md-btn-approve" disabled={busy} onClick={() => handleToggleStatus('ACTIVATE')} title="Réactiver">
                {busy ? <div style={{ width: 13, height: 13, border: '2px solid rgba(5,150,105,.3)', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                <span className="btn-text">Réactiver</span>
              </button>
            )}

            <button 
              className="md-btn-del" 
              disabled={busy || user.status === 'DELETED'} 
              onClick={handleDelete} 
              title="Supprimer"
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="btn-text">Supprimer</span>
            </button>
          </div>
        </div>

        {/* ── Edit form ── */}
        {isEditing && (
          <div className="md-edit-panel">
            <div className="md-edit-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(37,99,235,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </div>
                <span className="md-edit-title">Modifier le membre</span>
              </div>
            </div>
            <div className="md-edit-body">

              <div className="md-edit-section">
                <div className="md-edit-section-title">Identité & Contact</div>
                <div className="md-edit-grid">
                  <div className="md-edit-field">
                    <label className="md-edit-label">Prénom</label>
                    <input className="md-edit-input" value={fFirstName} onChange={e => setFFirstName(e.target.value)} placeholder="Prénom" />
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Nom</label>
                    <input className="md-edit-input" value={fLastName} onChange={e => setFLastName(e.target.value)} placeholder="Nom" />
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Email (Non modifiable)</label>
                    <input className="md-edit-input" value={user.email} disabled />
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Téléphone</label>
                    <input className="md-edit-input" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+33 6 …" />
                  </div>
                </div>
              </div>

              <div className="md-edit-section">
                <div className="md-edit-section-title">Naissance & Origine</div>
                <div className="md-edit-grid">
                  <div className="md-edit-field">
                    <label className="md-edit-label">Date de naissance (JJ/MM/AAAA)</label>
                    <input className="md-edit-input" value={fBirthDate} onChange={handleBirthDateChange} placeholder="JJ/MM/AAAA" />
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Lieu de naissance</label>
                    <input className="md-edit-input" value={fPlaceOfBirth} onChange={e => setFPlaceOfBirth(e.target.value)} placeholder="Ex: Lélouma" />
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Pays de naissance</label>
                    <select className="md-edit-select" value={fBirthCountry} onChange={e => { setFBirthCountry(e.target.value); if(e.target.value !== 'Autre (Non listé)') setFCustomBirthCountry(''); }}>
                      <option value="">Sélectionner...</option>
                      {COUNTRY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {fBirthCountry === 'Autre (Non listé)' && (
                      <input className="md-edit-input" value={fCustomBirthCountry} onChange={e => setFCustomBirthCountry(e.target.value)} placeholder="Précisez le pays" style={{ marginTop: '0.4rem' }} />
                    )}
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Commune d&apos;origine</label>
                    <select className="md-edit-select" value={fOriginSubPrefecture} onChange={e => setFOriginSubPrefecture(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {COMMUNES_ORIGINE.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Village d&apos;origine</label>
                    <input className="md-edit-input" value={fOriginVillage} onChange={e => setFOriginVillage(e.target.value)} placeholder="Ex: Petel" />
                  </div>
                </div>
              </div>

              <div className="md-edit-section">
                <div className="md-edit-section-title">Profession & Rôle Associatif</div>
                <div className="md-edit-grid">
                  <div className="md-edit-field">
                    <label className="md-edit-label">Profession / Situation</label>
                    <select className="md-edit-select" value={fProfession} onChange={e => setFProfession(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {PROFESSION_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Poste Associatif</label>
                    <select className="md-edit-select" value={fAssociationRole} onChange={e => setFAssociationRole(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {ASSOCIATION_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="md-edit-section">
                <div className="md-edit-section-title">Localisation & Résidence</div>
                <div className="md-edit-grid">
                  <div className="md-edit-field">
                    <label className="md-edit-label">Adresse 1</label>
                    <input className="md-edit-input" value={fAddressLine1} onChange={e => setFAddressLine1(e.target.value)} placeholder="N° et nom de rue" />
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Adresse 2</label>
                    <input className="md-edit-input" value={fAddressLine2} onChange={e => setFAddressLine2(e.target.value)} placeholder="Apt, Bâtiment..." />
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Code postal</label>
                    <input className="md-edit-input" value={fPostalCode} onChange={e => setFPostalCode(e.target.value)} placeholder="Ex: 75001" />
                  </div>
                  <div className="md-edit-field">
                    <label className="md-edit-label">Ville de résidence</label>
                    <input className="md-edit-input" value={fCity} onChange={e => setFCity(e.target.value)} placeholder="Ex: Paris" />
                  </div>
                  <div className="md-edit-field" style={{ gridColumn: '1 / -1' }}>
                    <label className="md-edit-label">Pays de résidence</label>
                    <select className="md-edit-select" value={fCountry} onChange={e => { setFCountry(e.target.value); if(e.target.value !== 'Autre (Non listé)') setFCustomCountry(''); }}>
                      <option value="">Sélectionner...</option>
                      {COUNTRY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {fCountry === 'Autre (Non listé)' && (
                      <input className="md-edit-input" value={fCustomCountry} onChange={e => setFCustomCountry(e.target.value)} placeholder="Précisez le pays" style={{ marginTop: '0.4rem' }} />
                    )}
                  </div>
                </div>
              </div>

              <div className="md-edit-footer">
                <button className="md-btn-save" disabled={saving} onClick={() => void handleSave()}>
                  {saving
                    ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Enregistrement…</>
                    : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Enregistrer</>
                  }
                </button>
                <button className="md-btn-cancel-save" disabled={saving} onClick={() => { setIsEditing(false); setSaveError(null); }}>
                  Annuler
                </button>
                {saveError && (
                  <div className="md-save-error">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                    {saveError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Info Account ── */}
        <div className="md-card d1">
          <div className="md-card-h">
            <div className="md-card-ico" style={{ background: 'rgba(239,246,255,.9)', color: '#1D4ED8' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="md-card-title">Informations du compte</span>
          </div>
          <div className="md-grid md-grid-3">
            <div className="md-field">
              <span className="md-field-label">Prénom</span>
              <span className="md-field-value">{renderInfoValue(user.firstName)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Nom</span>
              <span className="md-field-value">{renderInfoValue(user.lastName)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Téléphone</span>
              <span className="md-field-value">{renderInfoValue(user.phone)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Email</span>
              <span className="md-field-value">{user.email}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Date d&apos;inscription</span>
              <span className="md-field-value">{formatDate(user.createdAt)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Statut</span>
              <span className="md-status-badge" style={{ color: statusColor, background: statusBg, border: `1px solid ${statusBorder}`, width: 'fit-content', padding: '.15rem .5rem', fontSize: '.6rem', marginTop: '.2rem' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* ── Naissance & Profession ── */}
        <div className="md-card d2">
          <div className="md-card-h">
            <div className="md-card-ico" style={{ background: '#F3E8FF', color: '#7C3AED' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="md-card-title">Naissance & Profession</span>
          </div>
          <div className="md-grid md-grid-3">
            <div className="md-field">
              <span className="md-field-label">Date de naissance</span>
              <span className="md-field-value">{user.birthDate ? formatDate(user.birthDate) : renderInfoValue(null)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Lieu de naissance</span>
              <span className="md-field-value">{renderInfoValue(user.placeOfBirth)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Pays de naissance</span>
              <span className="md-field-value">{renderInfoValue(user.birthCountry)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Profession / Situation</span>
              <span className="md-field-value">{renderInfoValue(user.professionalStatus)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Poste associatif</span>
              <span className="md-field-value">{renderInfoValue(user.function)}</span>
            </div>
          </div>
        </div>

        {/* ── Info Localisation ── */}
        <div className="md-card d3">
          <div className="md-card-h">
            <div className="md-card-ico" style={{ background: 'rgba(240,253,250,.9)', color: '#0D9488' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="md-card-title">Localisation & Résidence</span>
          </div>
          <div className="md-grid md-grid-3">
            <div className="md-field">
              <span className="md-field-label">Adresse 1</span>
              <span className="md-field-value">{renderInfoValue(user.addressLine1)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Adresse 2</span>
              <span className="md-field-value">{renderInfoValue(user.addressLine2)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Code postal</span>
              <span className="md-field-value">{renderInfoValue(user.postalCode)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Ville</span>
              <span className="md-field-value">{renderInfoValue(user.city)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Pays</span>
              <span className="md-field-value">{renderInfoValue(user.country)}</span>
            </div>
          </div>
        </div>

        {/* ── Info Origine ── */}
        <div className="md-card d4">
          <div className="md-card-h">
            <div className="md-card-ico" style={{ background: '#FFFBEB', color: '#D97706' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="md-card-title">Origine communautaire</span>
          </div>
          <div className="md-grid">
            <div className="md-field">
              <span className="md-field-label">Commune d&apos;origine</span>
              <span className="md-field-value">{renderInfoValue(user.originSubPrefecture)}</span>
            </div>
            <div className="md-field">
              <span className="md-field-label">Village d&apos;origine</span>
              <span className="md-field-value">{renderInfoValue(user.originVillage)}</span>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
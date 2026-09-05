// web/app/(protected)/admin/members/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type MyTransferAntenna } from '../../../../lib/api-client';
import { formatDate, fullName } from '../../../../lib/format';
import type { UserSummary, UserStatus } from '../../../../types/user';
import { MemberCardPreviewModal } from '../../../../components/admin/MemberCardPreviewModal';

/* ══════════════════════════════════════════════════════ TYPES */
type ExtendedMember = UserSummary & {
  city?: string;
  country?: string;
  postalCode?: string;
  addressLine1?: string;
  originSubPrefecture?: string;
  originVillage?: string;
  birthDate?: string | Date;
  placeOfBirth?: string;
  birthCountry?: string;
  professionalStatus?: string;
  function?: string;
};

interface EditMemberData {
  firstName: string;
  lastName: string;
  phone: string;
  professionalStatus: string;
  function: string;
  customFunction: string;
  birthDate: string;
  placeOfBirth: string;
  birthCountry: string;
  customBirthCountry: string;
  originSubPrefecture: string;
  customOriginSubPrefecture: string;
  originVillage: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
  customCountry: string;
}

/* ══════════════════════════════════════════════════════ FONCTIONS UTILITAIRES GLOBALES */

function renderInfoValue(value: string | null | undefined) {
  if (!value || value.trim() === '') {
    return <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontWeight: 500 }}>Non renseigné</span>;
  }
  return value;
}

function Initials({ name, color = '#2563EB' }: { name: string; color?: string }) {
  const parts = name.trim().split(' ');
  const txt = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${color},${color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Cormorant Garamond',serif", fontSize: '.85rem', fontWeight: 700 }}>
      {txt}
    </div>
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

const USER_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:           { label: 'Actif',              color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  PENDING_APPROVAL: { label: 'En attente',         color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  EMAIL_UNVERIFIED: { label: 'Email non vérif.',   color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  SUSPENDED:        { label: 'Suspendu',           color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  REJECTED:         { label: 'Rejeté',             color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  DELETED:          { label: 'Supprimé',           color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

const ROLE_MAP: Record<string, string> = {
  SYSTEM_ADMIN: 'Chef',
  SUPER_ADMIN: 'S.Admin',
  ANTENNA_ADMIN: 'A.Admin',
  MEMBER: 'Membre',
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

/* ══════════════════════════════════════════════════════ CONSTANTES FORMULAIRE */
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
  'Parawol', 'Sagalé', 'Hérico', 'Diountou', 'Korbé', 'Linsan', 'Autre'
];

const COUNTRIES = [
  'Guinée', 'France', 'Sénégal', "Côte d'Ivoire", 'Mali', 'Maroc', 'Canada', 
  'États-Unis', 'Belgique', 'Suisse', 'Allemagne', 'Royaume-Uni', 'Espagne', 
  'Italie', 'Sierra Leone', 'Libéria', 'Guinée-Bissau', 'Gambie', 'Angola', 
  'Cameroun', 'Niger', 'Afrique du Sud', 'Mozambique', 'Portugal', 'Autre'
].sort();

/* ══════════════════════════════════════════════════════ PAGE PRINCIPALE */
export default function AdminMembersDirectoryPage() {
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  // États de modale détaillée
  const [selectedUser, setSelectedUser] = useState<ExtendedMember | null>(null);
  const [viewingCard, setViewingCard] = useState<ExtendedMember | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // États d'édition dans la modale
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditMemberData>({
    firstName: '', lastName: '', phone: '', professionalStatus: '', function: '', customFunction: '',
    birthDate: '', placeOfBirth: '', birthCountry: '', customBirthCountry: '', originSubPrefecture: '', customOriginSubPrefecture: '',
    originVillage: '', addressLine1: '', postalCode: '',
    city: '', country: '', customCountry: ''
  });

  // États pour la création de membre (TOUS LES CHAMPS DU SIGNUP)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '',
    birthDate: '', placeOfBirth: '', birthCountry: '', customBirthCountry: '',
    originSubPrefecture: '', customOriginSubPrefecture: '', originVillage: '', professionalStatus: '', function: '', customFunction: '',
    addressLine1: '', postalCode: '', city: '', country: '', customCountry: ''
  });

  // États pour la sélection d'antenne (multi-antenne)
  const [antennas, setAntennas] = useState<MyTransferAntenna[]>([]);
  const [antennaId, setAntennaId] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getMyTransferAntennas()
      .then((res) => { if (!cancelled) setAntennas(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ⚡ ÉTATS D'EXPORTATION (NOUVEAU)
  const [exportModalType, setExportModalType] = useState<'PDF' | 'EXCEL' | null>(null);
  const [exportStartMonth, setExportStartMonth] = useState('');
  const [exportEndMonth, setExportEndMonth] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  // 🔥 AJOUT : filtre "retardataires" — réutilise la route existante
  // GET /admin/late-members (admin.service.ts::listLateMembers, déjà
  // scopée sur la/les antenne(s) de cet admin, seuil 1 mois). Pas de
  // filtre devise ici : toutes les antennes d'un même admin partagent
  // obligatoirement la même devise (cf. createAntennaAdmin côté backend).
  const [exportLateOnly, setExportLateOnly] = useState(false);
  const [pdfData, setPdfData] = useState<Array<ExtendedMember & { lateMonths?: number; antennaName?: string | null }> | null>(null);
  const [pdfIsLateExport, setPdfIsLateExport] = useState(false);

  const loadMembers = useCallback(async (qVal?: string, sVal?: string) => {
    setError(null); 
    setLoading(true);
    try {
      const res = await api.listAntennaMembers({
        page: 1, 
        pageSize: 100,
        q: (qVal ?? q) || undefined,
        status: (sVal ?? status) || undefined,
      });
      setMembers(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des membres');
    } finally { 
      setLoading(false); 
    }
  }, [q, status]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadMembers(); }, 0);
    return () => clearTimeout(timer);
  }, [loadMembers]);

  /* ── Actions ── */
  const openMemberModal = (u: UserSummary) => {
    setSelectedUser(u as ExtendedMember);
    setIsEditing(false);
  };

  const startEditMode = () => {
    if (!selectedUser) return;

    const isStandardBirthCountry = !selectedUser.birthCountry || COUNTRIES.includes(selectedUser.birthCountry);
    const isStandardCountry = !selectedUser.country || COUNTRIES.includes(selectedUser.country);
    const isStandardOrigin = !selectedUser.originSubPrefecture || COMMUNES_ORIGINE.includes(selectedUser.originSubPrefecture);
    const isStandardFunction = !selectedUser.function || ASSOCIATION_ROLES.includes(selectedUser.function);

    setEditData({
      firstName: selectedUser.firstName || '', 
      lastName: selectedUser.lastName || '', 
      phone: selectedUser.phone || '',
      professionalStatus: selectedUser.professionalStatus || '', 

      function: isStandardFunction ? (selectedUser.function || '') : 'Autre',
      customFunction: isStandardFunction ? '' : (selectedUser.function || ''),

      birthDate: selectedUser.birthDate ? new Date(selectedUser.birthDate).toLocaleDateString('fr-FR') : '',
      placeOfBirth: selectedUser.placeOfBirth || '', 

      birthCountry: isStandardBirthCountry ? (selectedUser.birthCountry || '') : 'Autre',
      customBirthCountry: isStandardBirthCountry ? '' : (selectedUser.birthCountry || ''),

      originSubPrefecture: isStandardOrigin ? (selectedUser.originSubPrefecture || '') : 'Autre',
      customOriginSubPrefecture: isStandardOrigin ? '' : (selectedUser.originSubPrefecture || ''),

      originVillage: selectedUser.originVillage || '',
      addressLine1: selectedUser.addressLine1 || '', 
      postalCode: selectedUser.postalCode || '', 
      city: selectedUser.city || '', 

      country: isStandardCountry ? (selectedUser.country || '') : 'Autre',
      customCountry: isStandardCountry ? '' : (selectedUser.country || ''),
    });
    setIsEditing(true);
  };

  const convertDateToISO = (dateStr: string): string | undefined => {
    if (!dateStr || dateStr.length !== 10) return undefined;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const handleUpdateStatus = async (newStatus: UserStatus) => {
    if (!selectedUser) return;
    setActionLoading(newStatus);
    try {
      if (newStatus === 'ACTIVE') await api.approveMemberAccountAntenna(selectedUser.id);
      else if (newStatus === 'REJECTED') await api.rejectMemberAccountAntenna(selectedUser.id);
      await loadMembers();
      setSelectedUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    const confirmEmail = window.prompt(`ATTENTION : Vous êtes sur le point de supprimer définitivement le compte de ${fullName(selectedUser)}.\n\nPour confirmer, veuillez taper son adresse email exacte (${selectedUser.email}) :`);
    if (confirmEmail !== selectedUser.email) {
      if (confirmEmail !== null) alert("L'adresse email saisie est incorrecte. Suppression annulée.");
      return;
    }
    setActionLoading('DELETE');
    try {
      await api.deleteUser(selectedUser.id);
      await loadMembers();
      setSelectedUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading('EDIT');
    setSaveOk(false);
    try {
      const finalBirthCountry = editData.birthCountry === 'Autre' ? editData.customBirthCountry : editData.birthCountry;
      const finalCountry = editData.country === 'Autre' ? editData.customCountry : editData.country;
      const finalOrigin = editData.originSubPrefecture === 'Autre' ? editData.customOriginSubPrefecture : editData.originSubPrefecture;
      const finalFunction = editData.function === 'Autre' ? editData.customFunction : editData.function;

      await api.updateAntennaMember(selectedUser.id, {
        firstName: editData.firstName.trim() || undefined, 
        lastName: editData.lastName.trim() || undefined,
        phone: editData.phone.trim() || undefined, 
        professionalStatus: editData.professionalStatus || undefined,
        function: finalFunction?.trim() || undefined, 
        birthDate: convertDateToISO(editData.birthDate) || undefined,
        placeOfBirth: editData.placeOfBirth.trim() || undefined, 
        birthCountry: finalBirthCountry?.trim() || undefined,
        originSubPrefecture: finalOrigin?.trim() || undefined, 
        originVillage: editData.originVillage.trim() || undefined,
        addressLine1: editData.addressLine1.trim() || undefined, 
        postalCode: editData.postalCode.trim() || undefined, 
        city: editData.city.trim() || undefined, 
        country: finalCountry?.trim() || undefined,
      });

      setIsEditing(false);
      setSelectedUser(null);
      await loadMembers();
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la modification du compte.");
    } finally {
      setActionLoading(null);
    }
  };  

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    if (antennas.length > 1 && !antennaId) {
      alert('Veuillez sélectionner une antenne.');
      setIsCreating(false);
      return;
    }
    try {
      const finalBirthCountry = formData.birthCountry === 'Autre' ? formData.customBirthCountry : formData.birthCountry;
      const finalCountry = formData.country === 'Autre' ? formData.customCountry : formData.country;
      const finalOrigin = formData.originSubPrefecture === 'Autre' ? formData.customOriginSubPrefecture : formData.originSubPrefecture;
      const finalFunction = formData.function === 'Autre' ? formData.customFunction : formData.function;

      await api.createAntennaMember({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        antennaId: antennaId || undefined,
        city: formData.city || undefined,
        country: finalCountry || undefined,
        originSubPrefecture: finalOrigin || undefined,
        originVillage: formData.originVillage || undefined,
        professionalStatus: formData.professionalStatus || undefined,
        function: finalFunction || undefined,
        birthDate: convertDateToISO(formData.birthDate) || undefined,
        placeOfBirth: formData.placeOfBirth || undefined,
        birthCountry: finalBirthCountry || undefined,
        addressLine1: formData.addressLine1 || undefined,
        postalCode: formData.postalCode || undefined,
      });

      setCreatedPassword(formData.password);
      await loadMembers(); 
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la création du compte.");
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setIsCreateModalOpen(false);
    setCreatedPassword(null);
    setAntennaId('');
    setFormData({
      firstName: '', lastName: '', email: '', password: '', phone: '',
      birthDate: '', placeOfBirth: '', birthCountry: '', customBirthCountry: '',
      originSubPrefecture: '', customOriginSubPrefecture: '', originVillage: '', professionalStatus: '', function: '', customFunction: '',
      addressLine1: '', postalCode: '', city: '', country: '', customCountry: ''
    });
  };

  const handleCreateBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    let formatted = value;
    if (value.length > 2) formatted = `${value.slice(0, 2)}/${value.slice(2)}`;
    if (value.length > 4) formatted = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    setFormData({ ...formData, birthDate: formatted });
  };

  const handleEditBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    let formatted = value;
    if (value.length > 2) formatted = `${value.slice(0, 2)}/${value.slice(2)}`;
    if (value.length > 4) formatted = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    setEditData({ ...editData, birthDate: formatted });
  };

  // ⚡ FONCTION D'EXPORTATION (NOUVEAU)
  const executeExport = async () => {
    try {
      setActionLoading('EXPORT');

      let exportData: Array<ExtendedMember & { lateMonths?: number; antennaName?: string | null }> = [];

      if (exportLateOnly) {
        // 🔥 AJOUT : export "Retardataires" — réutilise telle quelle la
        // route déjà existante GET /admin/late-members (pageSize élevé
        // pour récupérer la liste complète plutôt qu'une page).
        const lateRes = await api.listLateMembersOver3Months({ page: 1, pageSize: 10000 });
        exportData = lateRes.items as unknown as Array<ExtendedMember & { lateMonths?: number; antennaName?: string | null }>;
      } else {
        const fetchRes = await api.listAntennaMembers({
          page: 1,
          pageSize: 10000,
          status: exportStatus || undefined
        });
        exportData = fetchRes.items as ExtendedMember[];
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
        alert(exportLateOnly ? "Aucun retardataire ne correspond à ces critères." : "Aucun membre ne correspond à ces critères d'exportation.");
        return;
      }

      if (exportModalType === 'EXCEL') {
        let csv = exportLateOnly
          ? "Nom;Prenom;Email;Telephone;Antenne;Mois de retard;Date Inscription\n"
          : "Nom;Prenom;Email;Telephone;Role;Statut;Date Inscription\n";
        exportData.forEach(u => {
          csv += exportLateOnly
            ? `"${u.lastName}";"${u.firstName}";"${u.email}";"${u.phone || ''}";"${u.antennaName || ''}";"${u.lateMonths ?? ''}";"${formatDate(u.createdAt)}"\n`
            : `"${u.lastName}";"${u.firstName}";"${u.email}";"${u.phone || ''}";"${ROLE_MAP[u.role] || u.role}";"${USER_STATUS_MAP[u.status]?.label || u.status}";"${formatDate(u.createdAt)}"\n`;
        });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Export_${exportLateOnly ? 'Retardataires' : 'Membres'}_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setExportModalType(null);
      } else if (exportModalType === 'PDF') {
        setPdfIsLateExport(exportLateOnly);
        setPdfData(exportData);
        setTimeout(() => {
          window.print();
          setPdfData(null);
          setExportModalType(null);
        }, 300);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'exportation des données.");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Table styles ── */
  const thStyle: React.CSSProperties = { padding: '.65rem .9rem', fontSize: '.62rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#374151', textAlign: 'left', background: 'rgba(248,250,252,.6)', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '.75rem .9rem', verticalAlign: 'middle', fontSize: '.8rem', color: '#111827' };
  const trStyle = (i: number): React.CSSProperties => ({ borderBottom: '1px solid rgba(37,99,235,.055)', animation: 'aaFadeInUp .4s cubic-bezier(.22,1,.36,1) both', animationDelay: `${i * 0.03}s`, cursor: 'pointer' });

  return (
    <AppShell title="Annuaire des membres">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        .aa-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; }
        .aa-header { margin-bottom: 1.5rem; animation: aaFadeInUp 0.5s 0.04s cubic-bezier(.22,1,.36,1) both; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; }
        .aa-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .aa-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: aapulse 2s ease-in-out infinite; }
        @keyframes aapulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .aa-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .aa-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        
        .sm-export-group { display: flex; gap: .5rem; flex-wrap: wrap; }
        .btn-export { height: 38px; padding: 0 1.2rem; border-radius: 10px; border: none; color: white; font-weight: 800; font-size: .75rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: transform 0.2s, box-shadow 0.2s; }
        .btn-export:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-pdf { background: linear-gradient(135deg, #991B1B, #DC2626); box-shadow: 0 4px 12px rgba(220,38,38,0.2); }
        .btn-excel { background: linear-gradient(135deg, #059669, #10B981); box-shadow: 0 4px 12px rgba(16,185,129,0.2); }

        .aa-add-btn { background: #059669; color: white; border: none; padding: 0 1.2rem; height: 38px; border-radius: 10px; font-weight: 800; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(5,150,105,0.2); transition: transform 0.2s, box-shadow 0.2s; }
        .aa-add-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(5,150,105,0.3); }
        
        .aa-toolbar { display: flex; gap: clamp(0.35rem, 1.5vw, 0.65rem); align-items: center; flex-wrap: nowrap; padding: 1rem clamp(0.5rem, 2vw, 1.3rem); border-bottom: 1px solid rgba(37,99,235,.07); overflow: hidden; }
        .aa-sw { position: relative; flex: 1; min-width: 0; }
        .aa-si { position: absolute; left: clamp(0.5rem, 1.5vw, 0.8rem); top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .aa-search { width: 100%; height: 40px; border-radius: 11px; border: 1px solid rgba(37,99,235,.15); background: rgba(255,255,255,.88); padding: 0 0.5rem 0 clamp(1.7rem, 4vw, 2.3rem); font-family: 'DM Sans', sans-serif; font-size: clamp(0.75rem, 2vw, 0.83rem); color: #111827; outline: none; transition: border-color .2s, box-shadow .2s; }
        .aa-search:focus { border-color: rgba(37,99,235,.4); box-shadow: 0 0 0 3px rgba(37,99,235,.08); background: white; }
        .aa-select { flex: 0 1 auto; min-width: 0; height: 40px; border-radius: 11px; border: 1px solid rgba(37,99,235,.15); background: rgba(255,255,255,.88); padding: 0 clamp(1.2rem, 3vw, 2rem) 0 clamp(0.3rem, 1vw, 0.85rem); font-family: 'DM Sans', sans-serif; font-size: clamp(0.7rem, 2vw, 0.82rem); color: #374151; font-weight: 600; outline: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right clamp(0.25rem, 1vw, 0.65rem) center; }
        .aa-filter-btn { flex: 0 0 auto; height: 40px; padding: 0 clamp(0.6rem, 2vw, 1.4rem); border-radius: 11px; background: linear-gradient(135deg,#1D4ED8,#2563EB); border: none; color: white; cursor: pointer; font-weight: 700; font-size: clamp(0.75rem, 2vw, 0.8rem); box-shadow: 0 3px 10px rgba(37,99,235,.28); }
        
        .aa-members-panel { background: rgba(253,253,255,.93); backdrop-filter: blur(12px); border-radius: 20px; border: 1px solid rgba(37,99,235,.09); box-shadow: 0 2px 14px rgba(37,99,235,.05); overflow: hidden; animation: aaFadeInUp 0.5s 0.1s cubic-bezier(.22,1,.36,1) both; }
        .aa-members-head { padding: 1rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,.07); display: flex; align-items: center; justify-content: space-between; }
        .aa-members-title { font-size: 0.73rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #1F2937; display: flex; align-items: center; gap: 0.5rem; }
        .aa-members-ico { width: 26px; height: 26px; border-radius: 7px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; }
        .aa-count-chip { font-size: 0.67rem; font-weight: 800; padding: 0.17rem 0.5rem; border-radius: 99px; background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
        .aa-error { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: 0.8rem; font-weight: 700; margin: 1.2rem; }
        .aa-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; font-weight: 600; }
        .aa-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,.1); border-top-color: #2563EB; border-radius: 50%; animation: aaspin 0.8s linear infinite; }
        .aa-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem 1rem; gap: 0.65rem; color: #9CA3AF; }
        .aa-mt { width: 100%; border-collapse: collapse; }
        .aa-mt tr { border-bottom: 1px solid rgba(37,99,235,.05); transition: background 0.15s; }
        .aa-mt tr:last-child { border-bottom: none; }
        .aa-row-clickable:hover { background: rgba(37,99,235,0.03) !important; }

        /* ── MODAL STYLES ── */
        .aa-modal-overlay { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.5); backdrop-filter: blur(6px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem; animation: aaFadeIn 0.25s forwards; }
        .aa-modal-content { background: white; border-radius: 24px; width: 100%; max-width: 600px; box-shadow: 0 24px 48px -12px rgba(0,0,0,0.18); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; animation: aaScaleUp 0.3s forwards cubic-bezier(.22,1,.36,1); }
        .aa-modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; }
        .aa-modal-title { font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 800; color: #111827; }
        .aa-modal-close { background: white; border: 1px solid #E2E8F0; color: #64748B; cursor: pointer; padding: 0.4rem; border-radius: 50%; transition: all 0.2s; }
        .aa-modal-close:hover { background: #F1F5F9; color: #111827; }
        .aa-modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }

        .aa-user-hero { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px dashed #E2E8F0; }
        .aa-user-hero-info { display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-start; }
        .aa-user-hero-name { font-family: 'Cormorant Garamond', serif; font-size: 1.7rem; font-weight: 700; color: #111827; line-height: 1.1; }
        .aa-user-hero-email { font-size: 0.85rem; color: #64748B; font-weight: 500; }

        .aa-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        .aa-info-item { display: flex; flex-direction: column; gap: 0.35rem; }
        .aa-info-label { font-size: 0.68rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; }
        .aa-info-value { font-size: 0.88rem; font-weight: 600; color: #1E293B; background: #F8FAFC; padding: 0.65rem 0.85rem; border-radius: 12px; border: 1px solid #F1F5F9; }

        .aa-modal-footer { padding: 1rem 1.25rem; border-top: 1px solid rgba(0,0,0,0.06); display: flex; gap: 0.5rem; justify-content: center; background: #F8FAFC; flex-wrap: wrap; }
        .aa-btn { flex: 1; height: 44px; border-radius: 12px; font-size: 0.82rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; border: none; transition: all 0.2s; white-space: nowrap; min-width: 120px; }
        .aa-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .aa-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .aa-btn-validate { background: linear-gradient(135deg, #059669, #10B981); color: white; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); }
        .aa-btn-edit { background: linear-gradient(135deg, #1D4ED8, #2563EB); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
        .aa-btn-reject { background: linear-gradient(135deg, #D97706, #F59E0B); color: white; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); }
        .aa-btn-delete { background: white; color: #DC2626; border: 1.5px solid #FECACA; }
        .aa-btn-cancel { background: transparent; color: #64748B; border: 1px solid #E2E8F0; }

        /* 🔥 FORMULAIRES D'ÉDITION & CRÉATION */
        .md-edit-section { margin-bottom: 1.5rem; }
        .md-edit-section-title { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        .md-edit-section-title::after { content: ''; flex: 1; height: 1px; background: rgba(37,99,235,0.1); }
        .aa-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }        
        .aa-form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .aa-form-group.full { grid-column: 1 / -1; }
        .aa-form-label { font-size: 0.7rem; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
        .aa-form-input { height: 44px; border-radius: 10px; border: 1px solid #CBD5E1; padding: 0 0.85rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; outline: none; background: #FAFAFA; transition: all 0.2s; width: 100%; box-sizing: border-box; }
        .aa-form-input:focus { border-color: #2563EB; background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .aa-form-input:disabled { background: #F1F5F9; color: #9CA3AF; cursor: not-allowed; }
        
        .md-edit-select { height: 44px; border-radius: 10px; border: 1px solid #CBD5E1; padding: 0 0.85rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; outline: none; background: #FAFAFA; transition: all 0.2s; width: 100%; box-sizing: border-box; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%232563EB' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; padding-right: 2.5rem; }
        .md-edit-select:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); background: white; }

        .aa-pwd-box { background: #ECFDF5; border: 1px dashed #34D399; padding: 1.5rem; text-align: center; border-radius: 16px; margin-bottom: 1rem; }
        .aa-pwd-title { color: #047857; font-weight: 800; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.5rem; }
        .aa-pwd-val { font-family: monospace; font-size: 2rem; font-weight: 900; color: #064E3B; letter-spacing: 0.1em; background: white; padding: 0.5rem 1rem; border-radius: 8px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        .hide-mobile { display: table-cell; }
        .hide-desktop { display: none; }
        @media(max-width:768px){
          .hide-mobile { display: none !important; }
          .hide-desktop { display: block; }
          .aa-info-grid, .aa-form-grid { grid-template-columns: 1fr; gap: 0.85rem; }
        }

        /* 🔥 TOAST */
        .aa-global-toast { position: fixed; bottom: 30px; right: 30px; background: white; border-left: 4px solid #059669; box-shadow: 0 10px 25px rgba(0,0,0,0.1); padding: 1rem 1.5rem; border-radius: 8px; display: flex; align-items: center; gap: 0.75rem; color: #111827; font-weight: 700; font-size: 0.9rem; z-index: 99999; animation: slideInToast 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards, fadeOutToast 0.4s 3.6s forwards; }
        @keyframes slideInToast { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeOutToast { to { opacity: 0; transform: translateX(20px); } }
        @keyframes aaFadeInUp { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes aaFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes aaScaleUp { 0% { transform: scale(0.95) translateY(10px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
      `}</style>

      {pdfData && (
        <div className="printable-export-area" style={{ display: 'none' }}>
          <table>
            <thead>
              <tr>
                {(pdfIsLateExport
                  ? ['Nom', 'Email', 'Téléphone', 'Antenne', 'Mois de retard', 'Date Inscription']
                  : ['Nom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Date Inscription']
                ).map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {pdfData.map(u => (
                <tr key={u.id}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold' }}>{u.firstName} {u.lastName}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{u.email}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{u.phone || '-'}</td>
                  {pdfIsLateExport ? (
                    <>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{u.antennaName || '-'}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', color: '#DC2626' }}>{u.lateMonths ?? '-'}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{ROLE_MAP[u.role] || u.role}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{USER_STATUS_MAP[u.status]?.label || u.status}</td>
                    </>
                  )}
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🔥 TOAST DE CONFIRMATION GLOBALE */}
      {saveOk && (
        <div className="aa-global-toast">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Mise à jour réussie !
        </div>
      )}

      <div className="aa-wrap">

        <div className="aa-header">
          <div>
            <div className="aa-eyebrow"><div className="aa-dot" />Admin antenne</div>
            <h1 className="aa-title">Annuaire <span>&amp; membres</span></h1>
          </div>
          <div className="sm-export-group">
            <button className="btn-export btn-pdf" onClick={() => setExportModalType('PDF')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm9-9h-6v2h4v10H5V9h4V7H3v14h18V7z"/></svg>
              PDF
            </button>
            <button className="btn-export btn-excel" onClick={() => setExportModalType('EXCEL')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              EXCEL
            </button>
            <button className="aa-add-btn" onClick={() => setIsCreateModalOpen(true)}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hide-mobile">Nouveau membre</span>
            </button>
          </div>
        </div>

        <div className="aa-members-panel">
          <div className="aa-members-head">
            <div className="aa-members-title">
              <div className="aa-members-ico">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              Gestion des membres
            </div>
            <span className="aa-count-chip">{members.length}</span>
          </div>

          <div className="aa-toolbar">
            <div className="aa-sw">
              <span className="aa-si">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
              </span>
              <input className="aa-search" type="text" placeholder="Recherche nom, email..." value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void loadMembers(q, status)}
              />
            </div>
            <select className="aa-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="EMAIL_UNVERIFIED">Email non vérifié</option>
              <option value="PENDING_APPROVAL">En attente approbation</option>
              <option value="ACTIVE">Actif</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="REJECTED">Rejeté</option>
            </select>
            <button className="aa-filter-btn" onClick={() => void loadMembers(q, status)}>Filtrer</button>
          </div>

          {error && (
            <div className="aa-error">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="aa-loader"><div className="aa-ring" />Chargement...</div>
          ) : members.length === 0 ? (
            <div className="aa-empty">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p>Aucun membre trouvé pour ces critères.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="aa-mt">
                <thead>
                  <tr>
                    <th style={thStyle}>Membre</th>
                    <th className="hide-mobile" style={thStyle}>Email</th>
                    <th style={{ ...thStyle, width: '120px' }}>Statut</th>
                    <th className="hide-mobile" style={thStyle}>Créé le</th>
                    <th className="hide-mobile" style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((u, i) => (
                    <tr 
                      key={u.id} 
                      style={trStyle(i)} 
                      className="aa-row-clickable"
                      onClick={() => openMemberModal(u)} 
                    >
                      <td style={{ ...tdStyle, maxWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
                          <Initials name={fullName(u)} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName(u)}</div>
                            <div className="hide-desktop" style={{ fontSize: '.68rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hide-mobile" style={tdStyle}>
                        <div style={{ fontSize: '.8rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                      </td>
                      <td style={tdStyle}>
                        <UserStatusBadge status={u.status} />
                      </td>
                      <td className="hide-mobile" style={{ ...tdStyle, fontSize: '.75rem', color: '#6B7280' }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="hide-mobile" style={{ ...tdStyle, textAlign: 'right' }}>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ⚡ MODALE D'EXPORTATION */}
        {exportModalType && (
          <div className="aa-modal-overlay" onClick={() => actionLoading !== 'EXPORT' && setExportModalType(null)}>
            <div className="aa-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: '2rem', display: 'block', overflow: 'visible' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.8rem', fontWeight: 700, color: '#111827', margin: '0 0 1.5rem 0' }}>
                Exporter en <span style={{ color: exportModalType === 'EXCEL' ? '#10B981' : '#DC2626' }}>{exportModalType === 'EXCEL' ? 'Excel' : 'PDF'}</span>
              </h2>

              <div className="export-flex-row">
                <div className="export-flex-item full">
                  <label
                    htmlFor="export-late-only-admin"
                    style={{ display: 'flex', alignItems: 'center', gap: '.6rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '.7rem .9rem', cursor: 'pointer' }}
                  >
                    <input
                      id="export-late-only-admin"
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
                <div className="export-flex-item full">
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Filtrer par Statut</label>
                  <select className="md-edit-select" value={exportStatus} onChange={e => setExportStatus(e.target.value)} disabled={exportLateOnly} style={{ width: '100%', height: '42px', background: exportLateOnly ? '#F1F5F9' : '#F8FAFC', opacity: exportLateOnly ? 0.55 : 1, cursor: exportLateOnly ? 'not-allowed' : 'pointer' }}>
                    <option value="">Tous les statuts</option>
                    <option value="ACTIVE">Actifs</option>
                    <option value="PENDING_APPROVAL">En attente d&apos;approbation</option>
                    <option value="EMAIL_UNVERIFIED">Email non vérifié</option>
                    <option value="SUSPENDED">Suspendus</option>
                    <option value="REJECTED">Rejetés</option>
                  </select>
                  {exportLateOnly && (
                    <p style={{ fontSize: '.68rem', color: '#94A3B8', marginTop: '.35rem', fontStyle: 'italic' }}>
                      Ignoré en mode «&nbsp;retardataires&nbsp;» (toujours limité aux membres actifs).
                    </p>
                  )}
                </div>
                <div className="export-flex-item">
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Inscrits depuis</label>
                  <input type="month" className="aa-form-input" value={exportStartMonth} onChange={e => setExportStartMonth(e.target.value)} style={{ width: '100%', height: '42px', background: '#F8FAFC' }} />
                </div>
                <div className="export-flex-item">
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Inscrits jusqu&apos;à</label>
                  <input type="month" className="aa-form-input" value={exportEndMonth} onChange={e => setExportEndMonth(e.target.value)} style={{ width: '100%', height: '42px', background: '#F8FAFC' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="aa-btn aa-btn-cancel" style={{ flex: 1, border: '1px solid #E2E8F0', background: 'transparent', color: '#64748B' }} onClick={() => setExportModalType(null)} disabled={actionLoading === 'EXPORT'}>Annuler</button>
                <button 
                  className="aa-btn" 
                  style={{ flex: 1.5, background: exportModalType === 'EXCEL' ? '#10B981' : '#DC2626', color: 'white', border: 'none' }} 
                  onClick={() => void executeExport()} 
                  disabled={actionLoading === 'EXPORT'}
                >
                  {actionLoading === 'EXPORT' ? 'Génération...' : 'Télécharger'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODALE DE CRÉATION DE MEMBRE ── */}
        {isCreateModalOpen && (
          <div className="aa-modal-overlay" onClick={resetCreateForm}>
            <div className="aa-modal-content" onClick={e => e.stopPropagation()}>
              <div className="aa-modal-header">
                <span className="aa-modal-title">Créer un nouveau compte</span>
                <button className="aa-modal-close" onClick={resetCreateForm}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="aa-modal-body">
                {createdPassword ? (
                  <div className="aa-pwd-box">
                    <div className="aa-pwd-title">Compte créé avec succès !</div>
                    <p style={{ fontSize: '0.8rem', color: '#065F46', marginBottom: '1rem' }}>
                      Le compte est actif. Remettez ce mot de passe au membre pour sa connexion :
                    </p>
                    <div className="aa-pwd-val">{createdPassword}</div>
                    <p style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '1rem', fontStyle: 'italic' }}>
                      Il devra utiliser l&apos;adresse <strong>{formData.email}</strong> pour se connecter.
                    </p>
                  </div>
                ) : (
                  <form id="createMemberForm" onSubmit={(e) => void handleCreateSubmit(e)}>

                    <div className="md-edit-section">
                      <div className="md-edit-section-title">Identité & Contact</div>
                      <div className="aa-form-grid">
                        {antennas.length > 1 && (
                          <div className="aa-form-group full">
                            <label className="aa-form-label">Antenne *</label>
                            <select className="md-edit-select" required value={antennaId} onChange={e => setAntennaId(e.target.value)}>
                              <option value="">Sélectionnez...</option>
                              {antennas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="aa-form-group">
                          <label className="aa-form-label">Prénom *</label>
                          <input required className="aa-form-input" type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                        </div>
                        <div className="aa-form-group">
                          <label className="aa-form-label">Nom *</label>
                          <input required className="aa-form-input" type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                        </div>
                        <div className="aa-form-group">
                          <label className="aa-form-label">Adresse Email *</label>
                          <input required className="aa-form-input" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })} />
                        </div>
                        <div className="aa-form-group">
                          <label className="aa-form-label">Téléphone</label>
                          <input className="aa-form-input" type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="aa-form-group full">
                          <label className="aa-form-label" style={{ color: '#059669' }}>Mot de passe initial *</label>
                          <input required className="aa-form-input" type="text" minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Saisissez le mot de passe à transmettre..." style={{ borderColor: '#059669', background: '#ECFDF5' }} />
                        </div>
                      </div>
                    </div>

                    <div className="md-edit-section">
                      <div className="md-edit-section-title">Naissance & Origine</div>
                      <div className="aa-form-grid">
                        <div className="aa-form-group">
                          <label className="aa-form-label">Date naissance (JJ/MM/AAAA)</label>
                          <input className="aa-form-input" value={formData.birthDate} onChange={handleCreateBirthDateChange} placeholder="JJ/MM/AAAA" />
                        </div>
                        <div className="aa-form-group">
                          <label className="aa-form-label">Lieu naissance</label>
                          <input className="aa-form-input" value={formData.placeOfBirth} onChange={e => setFormData({ ...formData, placeOfBirth: e.target.value })} />
                        </div>

                        <div className="aa-form-group">
                          <label className="aa-form-label">Pays naissance</label>
                          <select className="md-edit-select" value={formData.birthCountry} onChange={e => { setFormData({ ...formData, birthCountry: e.target.value }); if(e.target.value !== 'Autre') setFormData(f => ({...f, customBirthCountry: ''})); }}>
                            <option value="">Sélectionnez...</option>
                            {COUNTRIES.map(c => <option key={`c-birth-${c}`} value={c}>{c}</option>)}
                          </select>
                          {formData.birthCountry === 'Autre' && (
                            <input className="aa-form-input" value={formData.customBirthCountry} onChange={e => setFormData({ ...formData, customBirthCountry: e.target.value })} placeholder="Précisez le pays" style={{ marginTop: '0.4rem' }} />
                          )}
                        </div>

                        <div className="aa-form-group">
                          <label className="aa-form-label">Commune d&apos;origine</label>
                          <select className="md-edit-select" value={formData.originSubPrefecture} onChange={e => { setFormData({ ...formData, originSubPrefecture: e.target.value }); if(e.target.value !== 'Autre') setFormData(f => ({...f, customOriginSubPrefecture: ''})); }}>
                            <option value="">Sélectionnez...</option>
                            {COMMUNES_ORIGINE.map(c => <option key={`c-orig-${c}`} value={c}>{c}</option>)}
                          </select>
                          {formData.originSubPrefecture === 'Autre' && (
                            <input className="aa-form-input" value={formData.customOriginSubPrefecture} onChange={e => setFormData({ ...formData, customOriginSubPrefecture: e.target.value })} placeholder="Précisez la commune" style={{ marginTop: '0.4rem' }} />
                          )}
                        </div>

                        <div className="aa-form-group full">
                          <label className="aa-form-label">Village d&apos;origine</label>
                          <input className="aa-form-input" value={formData.originVillage} onChange={e => setFormData({ ...formData, originVillage: e.target.value })} placeholder="Ex: Petel" />
                        </div>
                      </div>
                    </div>

                    <div className="md-edit-section">
                      <div className="md-edit-section-title">Profession & Rôle Associatif</div>
                      <div className="aa-form-grid">
                        <div className="aa-form-group">
                          <label className="aa-form-label">Profession</label>
                          <select className="md-edit-select" value={formData.professionalStatus} onChange={e => setFormData({ ...formData, professionalStatus: e.target.value })}>
                            <option value="">Sélectionnez...</option>
                            {PROFESSION_LIST.map(p => <option key={`c-prof-${p}`} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="aa-form-group">
                          <label className="aa-form-label">Poste Associatif</label>
                          <select className="md-edit-select" value={formData.function} onChange={e => { setFormData({ ...formData, function: e.target.value }); if(e.target.value !== 'Autre') setFormData(f => ({...f, customFunction: ''})); }}>
                            <option value="">Sélectionnez...</option>
                            {ASSOCIATION_ROLES.map(r => <option key={`c-role-${r}`} value={r}>{r}</option>)}
                          </select>
                          {formData.function === 'Autre' && (
                            <input className="aa-form-input" value={formData.customFunction} onChange={e => setFormData({ ...formData, customFunction: e.target.value })} placeholder="Précisez le poste" style={{ marginTop: '0.4rem' }} />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="md-edit-section">
                      <div className="md-edit-section-title">Localisation & Résidence</div>
                      <div className="aa-form-grid">
                        <div className="aa-form-group">
                          <label className="aa-form-label">Adresse de résidence</label>
                          <input className="aa-form-input" value={formData.addressLine1} onChange={e => setFormData({ ...formData, addressLine1: e.target.value })} placeholder="N° et nom de rue" />
                        </div>

                        <div className="aa-form-group">
                          <label className="aa-form-label">Code postal</label>
                          <input className="aa-form-input" value={formData.postalCode} onChange={e => setFormData({ ...formData, postalCode: e.target.value })} placeholder="Ex: 75001" />
                        </div>
                        <div className="aa-form-group">
                          <label className="aa-form-label">Ville résidence</label>
                          <input className="aa-form-input" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="Ex: Paris" />
                        </div>
                        <div className="aa-form-group full">
                          <label className="aa-form-label">Pays résidence</label>
                          <select className="md-edit-select" value={formData.country} onChange={e => { setFormData({ ...formData, country: e.target.value }); if(e.target.value !== 'Autre') setFormData(f => ({...f, customCountry: ''})); }}>
                            <option value="">Sélectionnez...</option>
                            {COUNTRIES.map(c => <option key={`c-res-${c}`} value={c}>{c}</option>)}
                          </select>
                          {formData.country === 'Autre' && (
                            <input className="aa-form-input" value={formData.customCountry} onChange={e => setFormData({ ...formData, customCountry: e.target.value })} placeholder="Précisez le pays" style={{ marginTop: '0.4rem' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              <div className="aa-modal-footer">
                {createdPassword ? (
                  <button className="aa-btn" style={{ background: '#F1F5F9', color: '#0F172A' }} onClick={resetCreateForm}>Fermer</button>
                ) : (
                  <>
                    <button className="aa-btn aa-btn-cancel" onClick={resetCreateForm}>Annuler</button>
                    <button form="createMemberForm" type="submit" className="aa-btn aa-btn-validate" disabled={isCreating}>
                      {isCreating ? "Création..." : "Créer le compte"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODALE DE DÉTAIL / ÉDITION ── */}
        {selectedUser && (
          <div className="aa-modal-overlay" onClick={() => setSelectedUser(null)}>
            <div className="aa-modal-content" onClick={e => e.stopPropagation()}>
              <div className="aa-modal-header">
                <span className="aa-modal-title">{isEditing ? "Modifier le membre" : "Détails du compte"}</span>
                <button className="aa-modal-close" onClick={() => setSelectedUser(null)}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="aa-modal-body">
                <div className="aa-user-hero">
                  <BigInitials name={fullName(selectedUser)} color={USER_STATUS_MAP[selectedUser.status]?.color || '#2563EB'} />
                  <div className="aa-user-hero-info">
                    <div className="aa-user-hero-name">{fullName(selectedUser)}</div>
                    <div className="aa-user-hero-email">{selectedUser.email}</div>
                    <div className="aa-user-hero-email">Membre depuis le {formatDate(selectedUser.createdAt)}</div>
                    <div style={{ marginTop: '0.2rem' }}>
                      <UserStatusBadge status={selectedUser.status} />
                    </div>
                  </div>
                </div>

                {!isEditing ? (
                  <div className="aa-info-grid">
                    <div className="aa-info-item">
                      <span className="aa-info-label">Date d&apos;inscription</span>
                      <span className="aa-info-value">{formatDate(selectedUser.createdAt)}</span>
                    </div>
                    <div className="aa-info-item">
                      <span className="aa-info-label">Téléphone</span>
                      <span className="aa-info-value">{renderInfoValue(selectedUser.phone)}</span>
                    </div>

                    <div className="aa-info-item">
                      <span className="aa-info-label">Date de naissance</span>
                      <span className="aa-info-value">{selectedUser.birthDate ? new Date(selectedUser.birthDate).toLocaleDateString('fr-FR') : renderInfoValue(null)}</span>
                    </div>
                    <div className="aa-info-item">
                      <span className="aa-info-label">Lieu de naissance</span>
                      <span className="aa-info-value">{renderInfoValue(selectedUser.placeOfBirth)}</span>
                    </div>
                    <div className="aa-info-item">
                      <span className="aa-info-label">Pays de naissance</span>
                      <span className="aa-info-value">{renderInfoValue(selectedUser.birthCountry)}</span>
                    </div>

                    <div className="aa-info-item">
                      <span className="aa-info-label">Profession</span>
                      <span className="aa-info-value">{renderInfoValue(selectedUser.professionalStatus)}</span>
                    </div>
                    <div className="aa-info-item">
                      <span className="aa-info-label">Poste associatif</span>
                      <span className="aa-info-value">{renderInfoValue(selectedUser.function)}</span>
                    </div>
                    <div className="aa-info-item">
                      <span className="aa-info-label">Commune d&apos;origine</span>
                      <span className="aa-info-value">{renderInfoValue(selectedUser.originSubPrefecture)}</span>
                    </div>
                    <div className="aa-info-item">
                      <span className="aa-info-label">Village d&apos;origine</span>
                      <span className="aa-info-value">{renderInfoValue(selectedUser.originVillage)}</span>
                    </div>
                    <div className="aa-info-item">
                      <span className="aa-info-label">Code Postal</span>
                      <span className="aa-info-value">{renderInfoValue(selectedUser.postalCode)}</span>
                    </div>
                    <div className="aa-info-item">
                      <span className="aa-info-label">Adresse de résidence</span>
                      <span className="aa-info-value">{renderInfoValue(selectedUser.addressLine1)}</span>
                    </div>

                    <div className="aa-info-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="aa-info-label">Ville & Pays de résidence</span>
                      <span className="aa-info-value">
                        {renderInfoValue([selectedUser.city, selectedUser.country].filter(Boolean).join(', '))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <form id="editMemberForm" onSubmit={(e) => void handleSaveEdit(e)} className="aa-form-grid">
                    <div className="aa-form-group">
                      <label className="aa-form-label">Prénom</label>
                      <input className="aa-form-input" value={editData.firstName} onChange={e => setEditData({ ...editData, firstName: e.target.value })} required />
                    </div>
                    <div className="aa-form-group">
                      <label className="aa-form-label">Nom</label>
                      <input className="aa-form-input" value={editData.lastName} onChange={e => setEditData({ ...editData, lastName: e.target.value })} required />
                    </div>
                    <div className="aa-form-group full">
                      <label className="aa-form-label">Email (Non modifiable)</label>
                      <input className="aa-form-input" value={selectedUser.email} disabled />
                    </div>
                    <div className="aa-form-group">
                      <label className="aa-form-label">Téléphone</label>
                      <input className="aa-form-input" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                    </div>
                    <div className="aa-form-group">
                      <label className="aa-form-label">Date naissance (JJ/MM/AAAA)</label>
                      <input className="aa-form-input" value={editData.birthDate} onChange={handleEditBirthDateChange} placeholder="JJ/MM/AAAA" />
                    </div>
                    <div className="aa-form-group">
                      <label className="aa-form-label">Lieu naissance</label>
                      <input className="aa-form-input" value={editData.placeOfBirth} onChange={e => setEditData({ ...editData, placeOfBirth: e.target.value })} />
                    </div>

                    <div className="aa-form-group">
                      <label className="aa-form-label">Pays naissance</label>
                      <select className="md-edit-select" value={editData.birthCountry} onChange={e => { setEditData({ ...editData, birthCountry: e.target.value }); if(e.target.value !== 'Autre') setEditData(f => ({...f, customBirthCountry: ''})); }}>
                        <option value="">Sélectionnez...</option>
                        {COUNTRIES.map(c => <option key={`edit-birth-${c}`} value={c}>{c}</option>)}
                      </select>
                      {editData.birthCountry === 'Autre' && (
                        <input className="aa-form-input" value={editData.customBirthCountry} onChange={e => setEditData({ ...editData, customBirthCountry: e.target.value })} placeholder="Précisez le pays" style={{ marginTop: '0.4rem' }} />
                      )}
                    </div>

                    <div className="aa-form-group">
                      <label className="aa-form-label">Profession</label>
                      <select className="md-edit-select" value={editData.professionalStatus} onChange={e => setEditData({ ...editData, professionalStatus: e.target.value })}>
                        <option value="">Sélectionnez...</option>
                        {PROFESSION_LIST.map(p => <option key={`edit-prof-${p}`} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="aa-form-group">
                      <label className="aa-form-label">Poste associatif</label>
                      <select className="md-edit-select" value={editData.function} onChange={e => { setEditData({ ...editData, function: e.target.value }); if(e.target.value !== 'Autre') setEditData(f => ({...f, customFunction: ''})); }}>
                        <option value="">Sélectionnez...</option>
                        {ASSOCIATION_ROLES.map(r => <option key={`edit-role-${r}`} value={r}>{r}</option>)}
                      </select>
                      {editData.function === 'Autre' && (
                        <input className="aa-form-input" value={editData.customFunction} onChange={e => setEditData({ ...editData, customFunction: e.target.value })} placeholder="Précisez le poste" style={{ marginTop: '0.4rem' }} />
                      )}
                    </div>
                    <div className="aa-form-group">
                      <label className="aa-form-label">Commune origine</label>
                      <select className="md-edit-select" value={editData.originSubPrefecture} onChange={e => { setEditData({ ...editData, originSubPrefecture: e.target.value }); if(e.target.value !== 'Autre') setEditData(f => ({...f, customOriginSubPrefecture: ''})); }}>
                        <option value="">Sélectionnez...</option>
                        {COMMUNES_ORIGINE.map(c => <option key={`edit-orig-${c}`} value={c}>{c}</option>)}
                      </select>
                      {editData.originSubPrefecture === 'Autre' && (
                        <input className="aa-form-input" value={editData.customOriginSubPrefecture} onChange={e => setEditData({ ...editData, customOriginSubPrefecture: e.target.value })} placeholder="Précisez la commune" style={{ marginTop: '0.4rem' }} />
                      )}
                    </div>
                    <div className="aa-form-group">
                      <label className="aa-form-label">Village origine</label>
                      <input className="aa-form-input" value={editData.originVillage} onChange={e => setEditData({ ...editData, originVillage: e.target.value })} />
                    </div>

                    <div className="aa-form-group">
                      <label className="aa-form-label">Adresse de résidence</label>
                      <input className="aa-form-input" value={editData.addressLine1} onChange={e => setEditData({ ...editData, addressLine1: e.target.value })} />
                    </div>

                    <div className="aa-form-group">
                      <label className="aa-form-label">Code postal</label>
                      <input className="aa-form-input" value={editData.postalCode} onChange={e => setEditData({ ...editData, postalCode: e.target.value })} />
                    </div>
                    <div className="aa-form-group">
                      <label className="aa-form-label">Ville résidence</label>
                      <input className="aa-form-input" value={editData.city} onChange={e => setEditData({ ...editData, city: e.target.value })} />
                    </div>
                    <div className="aa-form-group full">
                      <label className="aa-form-label">Pays résidence</label>
                      <select className="md-edit-select" value={editData.country} onChange={e => { setEditData({ ...editData, country: e.target.value }); if(e.target.value !== 'Autre') setEditData(f => ({...f, customCountry: ''})); }}>
                        <option value="">Sélectionnez...</option>
                        {COUNTRIES.map(c => <option key={`edit-res-${c}`} value={c}>{c}</option>)}
                      </select>
                      {editData.country === 'Autre' && (
                        <input className="aa-form-input" value={editData.customCountry} onChange={e => setEditData({ ...editData, customCountry: e.target.value })} placeholder="Précisez le pays" style={{ marginTop: '0.4rem' }} />
                      )}
                    </div>
                  </form>
                )}
              </div>

              <div className="aa-modal-footer">
                {!isEditing ? (
                  <>
                    <button className="aa-btn aa-btn-edit" onClick={startEditMode} disabled={actionLoading !== null}>
                      Modifier
                    </button>

                    <button
                      className="aa-btn"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}
                      onClick={() => setViewingCard(selectedUser)}
                      disabled={actionLoading !== null}
                    >
                      Voir la carte
                    </button>

                    {selectedUser.status === 'PENDING_APPROVAL' && (
                      <button className="aa-btn aa-btn-validate" onClick={() => void handleUpdateStatus('ACTIVE')} disabled={actionLoading !== null}>
                        {actionLoading === 'ACTIVE' ? '...' : 'Valider'}
                      </button>
                    )}

                    {selectedUser.status !== 'ACTIVE' && selectedUser.status !== 'REJECTED' && selectedUser.status !== 'DELETED' && (
                      <button className="aa-btn aa-btn-reject" onClick={() => void handleUpdateStatus('REJECTED')} disabled={actionLoading !== null}>
                        {actionLoading === 'REJECTED' ? '...' : 'Rejeter'}
                      </button>
                    )}

                    <button className="aa-btn aa-btn-delete" onClick={() => void handleDelete()} disabled={actionLoading !== null || selectedUser.status === 'DELETED'}>
                      {actionLoading === 'DELETE' ? '...' : 'Supprimer'}
                    </button>
                  </>
                ) : (
                  <>
                    <button className="aa-btn aa-btn-cancel" onClick={() => setIsEditing(false)}>Annuler</button>
                    <button form="editMemberForm" type="submit" className="aa-btn aa-btn-edit" disabled={actionLoading === 'EDIT'}>
                      {actionLoading === 'EDIT' ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {viewingCard && (
          <MemberCardPreviewModal
            memberId={viewingCard.id}
            memberName={fullName(viewingCard)}
            scope="admin"
            onClose={() => setViewingCard(null)}
          />
        )}

      </div>
    </AppShell>
  );
}
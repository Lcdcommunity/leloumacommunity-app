// web/app/(protected)/super-admin/admins/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { superAdminApi, type UserDetail } from '../../../../../lib/super-admin-api';
import { api } from '../../../../../lib/api-client';
import { fullName } from '../../../../../lib/format';
import type { Antenna } from '../../../../../types/antenna';

const ASSOCIATION_TITLES = [
  'Président',
  'Vice-président',
  'Secrétaire général',
  'Secrétaire adjoint',
  "Secrétaire à l'information",
  "Secrétaire à l'organisation",
  'Trésorier',
  'Trésorier adjoint',
  'Responsable jeunesse',
  'Responsable des femmes',
  'Coordinateur',
  'Conseiller',
  'Chargé de mission',
  'Commissaire aux comptes',
  'Autre',
];

const COMMUNES_ORIGINE = [
  'C. Urbaine', 'Lafou', 'Manda', 'Balaya', 'Thiaguel Bori',
  'Parawol', 'Sagalé', 'Hérico', 'Diountou', 'Korbé', 'Linsan', 'Autre',
];

const COUNTRIES = [
  'Guinée', 'Sénégal', "Côte d'Ivoire", 'Mali', 'Burkina Faso', 'Togo',
  'Bénin', 'Niger', 'France', 'Belgique', 'Suisse', 'Allemagne', 'Espagne',
  'Italie', 'États-Unis', 'Canada', 'Royaume-Uni', 'Autre',
].sort();

export default function AdminDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Antennes
  const [allAntennas, setAllAntennas] = useState<Antenna[]>([]);
  const [loadingAntennas, setLoadingAntennas] = useState(false);
  const [fAntennaIds, setFAntennaIds] = useState<string[]>([]);

  // Champs édition
  const [fFirstName, setFFirstName] = useState('');
  const [fLastName, setFLastName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fCity, setFCity] = useState('');
  const [fPostalCode, setFPostalCode] = useState('');
  const [fAddressLine1, setFAddressLine1] = useState('');
  const [fCountry, setFCountry] = useState('');
  const [fCustomCountry, setFCustomCountry] = useState('');
  const [fOriginSubPrefecture, setFOriginSubPrefecture] = useState('');
  const [fCustomOriginSubPrefecture, setFCustomOriginSubPrefecture] = useState('');
  const [fAssociationTitle, setFAssociationTitle] = useState('');
  const [fCustomAssociationTitle, setFCustomAssociationTitle] = useState('');

  useEffect(() => {
    void fetchUser();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchUser() {
    setLoading(true);
    setError(null);
    try {
      const found = await superAdminApi.getAntennaAdmin(id);
      hydrateUser(found);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les détails de l'administrateur",
      );
    } finally {
      setLoading(false);
    }
  }

  function hydrateUser(found: UserDetail) {
    setUser(found);
    setFFirstName(found.firstName ?? '');
    setFLastName(found.lastName ?? '');
    setFPhone(found.phone ?? '');
    setFCity(found.city ?? '');
    setFPostalCode(found.postalCode ?? '');
    setFAddressLine1(found.addressLine1 ?? '');

    // Antennes affiliées actives
    const activeIds = (found.adminAssignments ?? [])
      .filter(a => a.isActive)
      .map(a => a.antenna.id);
    setFAntennaIds(activeIds);

    // Hydratation chirurgicale : Pays
    const uCountry = found.country ?? '';
    if (uCountry && !COUNTRIES.includes(uCountry)) {
      setFCountry('Autre');
      setFCustomCountry(uCountry);
    } else {
      setFCountry(uCountry);
      setFCustomCountry('');
    }

    // Hydratation chirurgicale : Origine
    const uOrigin = found.originSubPrefecture ?? '';
    if (uOrigin && !COMMUNES_ORIGINE.includes(uOrigin)) {
      setFOriginSubPrefecture('Autre');
      setFCustomOriginSubPrefecture(uOrigin);
    } else {
      setFOriginSubPrefecture(uOrigin);
      setFCustomOriginSubPrefecture('');
    }

    // Hydratation chirurgicale : Fonction
    const uRole = found.function || found.associationTitle || '';
    if (uRole && !ASSOCIATION_TITLES.includes(uRole)) {
      setFAssociationTitle('Autre');
      setFCustomAssociationTitle(uRole);
    } else {
      setFAssociationTitle(uRole);
      setFCustomAssociationTitle('');
    }
  }

  async function loadAntennas() {
    setLoadingAntennas(true);
    try {
      const res = await api.listAntennas({ pageSize: 100, isActive: true });
      setAllAntennas(res.items);
    } finally {
      setLoadingAntennas(false);
    }
  }

  function handleStartEdit() {
    setSaveOk(false);
    setSaveError(null);
    setIsEditing(true);
    void loadAntennas();
  }

  function handleCancelEdit() {
    if (user) hydrateUser(user);
    setIsEditing(false);
    setSaveError(null);
  }

  // Logique devise — même règle que AdminUserForm
  const selectedCurrency = fAntennaIds.length > 0
    ? allAntennas.find(a => a.id === fAntennaIds[0])?.defaultCurrency
    : null;

  function handleToggleAntenna(antennaId: string, currency?: string | null) {
    if (selectedCurrency && currency !== selectedCurrency && !fAntennaIds.includes(antennaId)) return;
    setFAntennaIds(prev =>
      prev.includes(antennaId) ? prev.filter(x => x !== antennaId) : [...prev, antennaId]
    );
  }

  async function handleToggleStatus() {
    if (!user || busy) return;
    setBusy(true);
    try {
      if (user.status === 'ACTIVE') {
        await superAdminApi.suspendAntennaAdmin(id);
      } else {
        await superAdminApi.activateAntennaAdmin(id);
      }
      await fetchUser();
    } catch {
      alert('Erreur lors du changement de statut');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!user || saving) return;
    if (fAntennaIds.length === 0) {
      setSaveError("Veuillez sélectionner au moins une antenne.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const finalCountry = fCountry === 'Autre' ? fCustomCountry : fCountry;
      const finalOrigin = fOriginSubPrefecture === 'Autre' ? fCustomOriginSubPrefecture : fOriginSubPrefecture;
      const finalTitle = fAssociationTitle === 'Autre' ? fCustomAssociationTitle : fAssociationTitle;

      await superAdminApi.updateAntennaAdmin(id, {
        firstName: fFirstName.trim() || undefined,
        lastName: fLastName.trim() || undefined,
        phone: fPhone.trim() || undefined,
        city: fCity.trim() || undefined,
        country: finalCountry.trim() || undefined,
        postalCode: fPostalCode.trim() || undefined,
        originSubPrefecture: finalOrigin.trim() || undefined,
        addressLine1: fAddressLine1.trim() || undefined,
        function: finalTitle.trim() || undefined,
        associationTitle: finalTitle.trim() || undefined,
        antennaIds: fAntennaIds,
      });

      await fetchUser();
      setIsEditing(false);
      setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || busy) return;
    const confirmed = window.confirm(
      `Supprimer définitivement le compte de ${fullName(user)} ?`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await superAdminApi.deleteAntennaAdmin(id);
      router.push('/super-admin/admins');
    } catch {
      alert('Erreur lors de la suppression');
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Chargement...">
        <style>{`@keyframes saddspin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '.75rem', color: '#B91C1C', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '.85rem' }}>
          <div style={{ width: 22, height: 22, border: '2.5px solid rgba(220,38,38,.12)', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'saddspin .8s linear infinite' }} />
          Récupération du profil…
        </div>
      </AppShell>
    );
  }

  if (error || !user) {
    return (
      <AppShell title="Erreur">
        <div style={{ padding: '2rem', maxWidth: 700, margin: '0 auto' }}>
          <Link href="/super-admin/admins" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', fontWeight: 700, color: '#DC2626', textDecoration: 'none', marginBottom: '1.5rem' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Retour aux administrateurs
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.9rem 1.1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, color: '#B91C1C', fontSize: '.82rem', fontWeight: 800 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
            {error ?? 'Administrateur introuvable'}
          </div>
        </div>
      </AppShell>
    );
  }

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  const activeAssignments = (user.adminAssignments ?? []).filter(a => a.isActive);

  return (
    <AppShell title={`Profil : ${fullName(user)}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        @keyframes saddspin { to { transform: rotate(360deg); } }
        @keyframes saddin { to { opacity: 1; transform: translateY(0); } }
        @keyframes saddpulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

        .sadd-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 960px; margin: 0 auto; }

        .sadd-back { display: inline-flex; align-items: center; gap: .4rem; font-size: .78rem; font-weight: 700; color: #DC2626; text-decoration: none; margin-bottom: 1.25rem; opacity: 0; transform: translateY(8px); animation: saddin .4s .02s cubic-bezier(.22,1,.36,1) forwards; transition: color .15s; }
        .sadd-back:hover { color: #991B1B; }

        .sadd-eyebrow { font-size: .67rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #B91C1C; margin-bottom: .4rem; display: flex; align-items: center; gap: .45rem; opacity: 0; transform: translateY(8px); animation: saddin .45s .05s cubic-bezier(.22,1,.36,1) forwards; }
        .sadd-dot { width: 6px; height: 6px; background: #DC2626; border-radius: 50%; animation: saddpulse 2s ease-in-out infinite; }

        .sadd-page-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.6rem, 3.5vw, 2.1rem); font-weight: 600; color: #991B1B; letter-spacing: -0.025em; line-height: 1.1; margin-bottom: 1rem; opacity: 0; transform: translateY(8px); animation: saddin .45s .06s cubic-bezier(.22,1,.36,1) forwards; }
        .sadd-page-title span { color: #DC2626; }

        .sadd-hero { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; background: rgba(255,255,255,.95); backdrop-filter: blur(16px); border-radius: 22px; border: 1px solid rgba(220,38,38,.12); box-shadow: 0 4px 24px rgba(220,38,38,.08), 0 1px 2px rgba(0,0,0,.04); padding: 1.5rem; margin-bottom: 1rem; opacity: 0; transform: translateY(10px); animation: saddin .5s .08s cubic-bezier(.22,1,.36,1) forwards; position: relative; overflow: hidden; }
        .sadd-hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #991B1B, #DC2626, #FCA5A5); border-radius: 22px 22px 0 0; }
        .sadd-hero-left { display: flex; align-items: center; gap: 1rem; min-width: 0; flex: 1; }
        .sadd-hero-content { min-width: 0; flex: 1; }
        .sadd-avatar { width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(145deg, #991B1B, #DC2626); display: flex; align-items: center; justify-content: center; color: white; font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; box-shadow: 0 6px 18px rgba(220,38,38,.28); flex-shrink: 0; }
        .sadd-hero-name { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.3rem, 3vw, 1.8rem); font-weight: 700; color: #991B1B; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: .35rem; word-break: normal; overflow-wrap: anywhere; }
        .sadd-hero-meta { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
        .sadd-role-tag { display: inline-flex; align-items: center; gap: .35rem; font-size: .63rem; font-weight: 800; background: #EFF6FF; color: #1D4ED8; padding: .25rem .7rem; border-radius: 99px; border: 1px solid #BFDBFE; letter-spacing: .04em; text-transform: uppercase; }
        .sadd-status-active { display: inline-flex; align-items: center; gap: .35rem; font-size: .63rem; font-weight: 800; background: #ECFDF5; color: #059669; padding: .25rem .7rem; border-radius: 99px; border: 1px solid #A7F3D0; letter-spacing: .04em; text-transform: uppercase; }
        .sadd-status-suspended { display: inline-flex; align-items: center; gap: .35rem; font-size: .63rem; font-weight: 800; background: #FEF2F2; color: #DC2626; padding: .25rem .7rem; border-radius: 99px; border: 1px solid #FECACA; letter-spacing: .04em; text-transform: uppercase; }
        .sadd-hero-email { margin-top: .45rem; font-size: .8rem; color: #6B7280; font-weight: 600; overflow-wrap: anywhere; }

        .sadd-actions-desktop { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
        .sadd-actions-mobile { display: none; gap: .5rem; align-items: center; flex-wrap: wrap; }

        .sadd-btn-edit, .sadd-btn-suspend, .sadd-btn-del, .sadd-btn-cancel-edit { height: 38px; padding: 0 1rem; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: .78rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: .4rem; transition: all .15s; white-space: nowrap; }
        .sadd-btn-edit { border: none; background: linear-gradient(135deg, #991B1B, #DC2626); color: white; box-shadow: 0 4px 14px rgba(220,38,38,.28); }
        .sadd-btn-edit:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(220,38,38,.38); }
        .sadd-btn-cancel-edit { border: 1.5px solid rgba(220,38,38,.22); background: #ffffff; color: #991B1B; }
        .sadd-btn-cancel-edit:hover { background: #FEF2F2; border-color: rgba(220,38,38,.38); }
        .sadd-btn-suspend { border: 1.5px solid rgba(217,119,6,.25); background: #FFFBEB; color: #B45309; }
        .sadd-btn-suspend:hover:not(:disabled) { background: #FEF3C7; border-color: rgba(217,119,6,.45); transform: translateY(-1px); }
        .sadd-btn-del { border: 1.5px solid rgba(220,38,38,.22); background: #ffffff; color: #DC2626; }
        .sadd-btn-del:hover:not(:disabled) { background: #FEF2F2; border-color: rgba(220,38,38,.4); transform: translateY(-1px); }
        .sadd-btn-edit:disabled, .sadd-btn-suspend:disabled, .sadd-btn-del:disabled, .sadd-btn-cancel-edit:disabled { opacity: .55; cursor: not-allowed; }

        .sadd-btn-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; flex-shrink: 0; }
        .sadd-btn-icon:disabled { opacity: .55; cursor: not-allowed; }
        .sadd-icon-edit { background: linear-gradient(135deg, #991B1B, #DC2626); color: white; border: none; box-shadow: 0 4px 12px rgba(220,38,38,.28); }
        .sadd-icon-cancel { background: #ffffff; color: #991B1B; border: 1.5px solid rgba(220,38,38,.22); }
        .sadd-icon-suspend { background: #FFFBEB; color: #B45309; border: 1.5px solid rgba(217,119,6,.25); }
        .sadd-icon-del { background: #ffffff; color: #DC2626; border: 1.5px solid rgba(220,38,38,.22); }

        .sadd-save-ok { display: flex; align-items: center; gap: .5rem; padding: .7rem .95rem; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 11px; color: #065F46; font-size: .8rem; font-weight: 700; margin-bottom: 1rem; animation: saddin .3s cubic-bezier(.22,1,.36,1); }

        .sadd-edit-panel, .sadd-card { background: rgba(255,255,255,.95); backdrop-filter: blur(16px); border-radius: 22px; border: 1px solid rgba(220,38,38,.10); box-shadow: 0 4px 24px rgba(220,38,38,.06), 0 1px 2px rgba(0,0,0,.03); overflow: hidden; margin-bottom: 1rem; opacity: 0; transform: translateY(10px); }
        .sadd-edit-panel { animation: saddin .45s .12s cubic-bezier(.22,1,.36,1) forwards; }
        .sadd-card.d1 { animation: saddin .5s .12s cubic-bezier(.22,1,.36,1) forwards; }
        .sadd-card.d2 { animation: saddin .5s .17s cubic-bezier(.22,1,.36,1) forwards; }
        .sadd-card.d3 { animation: saddin .5s .22s cubic-bezier(.22,1,.36,1) forwards; }
        .sadd-card.d4 { animation: saddin .5s .27s cubic-bezier(.22,1,.36,1) forwards; }

        .sadd-card-h, .sadd-edit-head { padding: .95rem 1.4rem; border-bottom: 1px solid rgba(220,38,38,.07); display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
        .sadd-edit-head { justify-content: space-between; background: rgba(254,242,242,.35); }
        .sadd-card-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sadd-card-title, .sadd-edit-title { font-family: 'Cormorant Garamond', serif; font-size: 1.02rem; font-weight: 600; color: #991B1B; letter-spacing: -0.01em; }
        .sadd-section-divider { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(220,38,38,.18), transparent); min-width: 60px; }

        .sadd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem 1.25rem; padding: 1.25rem 1.4rem; }
        .sadd-edit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem 1.25rem; }
        .sadd-edit-body { padding: 1.4rem; }
        .sadd-edit-section { margin-bottom: 1.25rem; }
        .sadd-edit-section:last-of-type { margin-bottom: 0; }
        .sadd-edit-section-title { font-size: .66rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: .8rem; display: flex; align-items: center; gap: .5rem; }
        .sadd-edit-section-title::after { content: ''; flex: 1; height: 1px; background: rgba(220,38,38,.10); }

        .sadd-field, .sadd-edit-field { display: flex; flex-direction: column; gap: .35rem; min-width: 0; }
        .sadd-field-label { font-size: .66rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #B91C1C; }
        .sadd-field-value { font-size: .88rem; font-weight: 600; color: #000000; word-break: break-word; }
        .sadd-field-value.empty { color: #D1D5DB; }
        .sadd-edit-label { font-size: .66rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #B91C1C; }

        .sadd-edit-input, .sadd-edit-select { width: 100%; min-height: 46px; border-radius: 11px; border: 1.5px solid rgba(220,38,38,.16); background: #ffffff; padding: 0 .95rem; font-family: 'DM Sans', sans-serif; font-size: .875rem; font-weight: 500; color: #000000; outline: none; transition: border-color .18s, box-shadow .18s; box-sizing: border-box; }
        .sadd-edit-input:focus, .sadd-edit-select:focus { border-color: rgba(220,38,38,.5); box-shadow: 0 0 0 3px rgba(220,38,38,.08); background: #ffffff; }
        .sadd-edit-input::placeholder { color: rgba(0,0,0,.35); }
        .sadd-edit-select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23B91C1C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; padding-right: 2.5rem; }

        /* ── Antenne chips (vue) ── */
        .sadd-antenna-chips { display: flex; flex-wrap: wrap; gap: .5rem; padding: 1.1rem 1.4rem; }
        .sadd-antenna-chip { display: inline-flex; align-items: center; gap: .45rem; background: rgba(254,242,242,.7); border: 1px solid rgba(220,38,38,.18); border-radius: 10px; padding: .4rem .75rem; font-size: .78rem; font-weight: 700; color: #111827; }
        .sadd-antenna-chip-code { font-family: 'DM Mono', monospace; font-size: .7rem; color: #DC2626; background: rgba(220,38,38,.08); padding: .1rem .35rem; border-radius: 5px; }
        .sadd-antenna-chip-currency { font-size: .68rem; color: #6B7280; font-weight: 600; }
        .sadd-antenna-empty { padding: 1.1rem 1.4rem; font-size: .82rem; color: #D1D5DB; font-weight: 600; }

        /* ── Antenne cards (édition) ── */
        .sadd-ant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: .6rem; }
        .sadd-ant-card { display: flex; align-items: center; gap: .6rem; padding: .7rem .9rem; border-radius: 11px; border: 2px solid; cursor: pointer; transition: all .18s; }
        .sadd-ant-card.active { border-color: rgba(220,38,38,.6); background: rgba(254,242,242,.6); box-shadow: 0 4px 12px rgba(220,38,38,.08); }
        .sadd-ant-card.idle { border-color: rgba(229,231,235,1); background: white; }
        .sadd-ant-card.disabled { border-color: rgba(229,231,235,.5); background: rgba(243,244,246,.5); opacity: 0.5; cursor: not-allowed; }
        .sadd-ant-card:hover:not(.disabled):not(.active) { border-color: rgba(220,38,38,.3); transform: translateY(-1px); }
        .sadd-ant-chk { width: 18px; height: 18px; border-radius: 6px; border: 2px solid; display: flex; align-items: center; justify-content: center; transition: all .2s; flex-shrink: 0; }
        .sadd-ant-card.active .sadd-ant-chk { background: #DC2626; border-color: #DC2626; color: white; }
        .sadd-ant-card.idle .sadd-ant-chk, .sadd-ant-card.disabled .sadd-ant-chk { border-color: #D1D5DB; }
        .sadd-currency-filter { background: #FEF2F2; color: #DC2626; padding: 2px 8px; border-radius: 6px; border: 1px solid #FECACA; font-size: .6rem; font-weight: 800; }

        .sadd-tech { padding: 1rem 1.4rem; background: rgba(254,242,242,.28); border-top: 1px solid rgba(220,38,38,.06); font-size: .76rem; color: #6B7280; display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
        .sadd-tech code { color: #4B5563; font-weight: 700; font-family: 'DM Sans', sans-serif; background: #ffffff; border: 1px solid rgba(220,38,38,.10); padding: .18rem .45rem; border-radius: 8px; }

        .sadd-edit-footer { display: flex; gap: .65rem; align-items: center; padding-top: 1rem; border-top: 1px solid rgba(220,38,38,.08); flex-wrap: wrap; margin-top: 1rem; }
        .sadd-btn-save, .sadd-btn-cancel-save { min-height: 44px; padding: 0 1.25rem; border-radius: 11px; font-family: 'DM Sans', sans-serif; font-size: .84rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: .45rem; transition: all .15s; }
        .sadd-btn-save { background: linear-gradient(135deg, #991B1B, #DC2626); border: none; color: white; box-shadow: 0 4px 14px rgba(220,38,38,.28); }
        .sadd-btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(220,38,38,.36); }
        .sadd-btn-cancel-save { background: #ffffff; border: 1.5px solid rgba(220,38,38,.22); color: #991B1B; }
        .sadd-btn-cancel-save:hover:not(:disabled) { background: #FEF2F2; border-color: rgba(220,38,38,.38); }
        .sadd-btn-save:disabled, .sadd-btn-cancel-save:disabled { opacity: .6; cursor: not-allowed; }
        .sadd-save-error { display: flex; align-items: center; gap: .5rem; padding: .7rem .95rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 11px; color: #B91C1C; font-size: .78rem; font-weight: 700; width: 100%; }
        .sadd-col-span-2 { grid-column: span 2; }

        @media (max-width: 640px) {
          .sadd-wrap { padding: .85rem .85rem 4rem; }
          .sadd-hero { flex-direction: column; align-items: stretch; }
          .sadd-hero-left { width: 100%; align-items: flex-start; }
          .sadd-hero-content { width: 100%; }
          .sadd-hero-name { font-size: 1.2rem; line-height: 1.12; }
          .sadd-actions-mobile { display: flex; width: 100%; justify-content: flex-start; }
          .sadd-actions-desktop { display: none; }
          .sadd-edit-body, .sadd-grid, .sadd-card-h, .sadd-edit-head, .sadd-tech { padding-left: 1rem; padding-right: 1rem; }
          .sadd-grid, .sadd-edit-grid { gap: .9rem 1rem; }
          .sadd-edit-footer { flex-direction: column; align-items: stretch; }
          .sadd-btn-save, .sadd-btn-cancel-save, .sadd-save-error, .sadd-save-ok { width: 100%; justify-content: center; }
          .sadd-ant-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 430px) {
          .sadd-grid, .sadd-edit-grid { grid-template-columns: 1fr; }
          .sadd-col-span-2 { grid-column: span 1; }
        }
      `}</style>

      <div className="sadd-wrap">
        <Link href="/super-admin/admins" className="sadd-back">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux administrateurs
        </Link>

        <div className="sadd-eyebrow">
          <div className="sadd-dot" />
          Super Admin
        </div>

        <h1 className="sadd-page-title">
          Détail <span>administrateur</span>
        </h1>

        {/* ── HERO ── */}
        <div className="sadd-hero">
          <div className="sadd-hero-left">
            <div className="sadd-avatar">{initials || '?'}</div>
            <div className="sadd-hero-content">
              <div className="sadd-hero-name">{fullName(user)}</div>
              <div className="sadd-hero-meta">
                <span className="sadd-role-tag">
                  <div style={{ width: 5, height: 5, background: '#3B82F6', borderRadius: '50%' }} />
                  Administrateur d&apos;antenne
                </span>
                <span className={user.status === 'ACTIVE' ? 'sadd-status-active' : 'sadd-status-suspended'}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: user.status === 'ACTIVE' ? '#059669' : '#DC2626', flexShrink: 0 }} />
                  {user.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                </span>
              </div>
              {user.email && <div className="sadd-hero-email">{user.email}</div>}
            </div>
          </div>

          <div className="sadd-actions-desktop">
            {!isEditing ? (
              <button type="button" className="sadd-btn-edit" onClick={handleStartEdit}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Modifier
              </button>
            ) : (
              <button type="button" className="sadd-btn-cancel-edit" onClick={handleCancelEdit}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Annuler
              </button>
            )}
            <button type="button" className="sadd-btn-suspend" disabled={busy} onClick={() => void handleToggleStatus()}>
              {busy ? (
                <div style={{ width: 13, height: 13, border: '2px solid rgba(180,83,9,.3)', borderTopColor: '#B45309', borderRadius: '50%', animation: 'saddspin .7s linear infinite' }} />
              ) : (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
                </svg>
              )}
              {user.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
            </button>
            <button type="button" className="sadd-btn-del" disabled={busy} onClick={() => void handleDelete()}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Supprimer
            </button>
          </div>

          <div className="sadd-actions-mobile">
            {!isEditing ? (
              <button type="button" className="sadd-btn-icon sadd-icon-edit" onClick={handleStartEdit}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            ) : (
              <button type="button" className="sadd-btn-icon sadd-icon-cancel" onClick={handleCancelEdit}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button type="button" className="sadd-btn-icon sadd-icon-suspend" disabled={busy} onClick={() => void handleToggleStatus()}>
              {busy ? (
                <div style={{ width: 14, height: 14, border: '2px solid rgba(180,83,9,.3)', borderTopColor: '#B45309', borderRadius: '50%', animation: 'saddspin .7s linear infinite' }} />
              ) : (
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
                </svg>
              )}
            </button>
            <button type="button" className="sadd-btn-icon sadd-icon-del" disabled={busy} onClick={() => void handleDelete()}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {saveOk && (
          <div className="sadd-save-ok">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Profil mis à jour avec succès.
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {isEditing && (
          <div className="sadd-edit-panel">
            <div className="sadd-edit-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(220,38,38,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', flexShrink: 0 }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <span className="sadd-edit-title">Modifier le profil</span>
              </div>
            </div>

            <div className="sadd-edit-body">

              {/* Section antennes */}
              <div className="sadd-edit-section">
                <div className="sadd-edit-section-title" style={{ justifyContent: 'space-between' }}>
                  <span>Antennes assignées</span>
                  {selectedCurrency && (
                    <span className="sadd-currency-filter">Devise : {selectedCurrency}</span>
                  )}
                </div>
                {loadingAntennas ? (
                  <div style={{ fontSize: '.8rem', color: '#6B7280', fontWeight: 600 }}>Chargement des antennes…</div>
                ) : (
                  <div className="sadd-ant-grid">
                    {allAntennas.map(a => {
                      const isSelected = fAntennaIds.includes(a.id);
                      const isBlocked = !!(selectedCurrency && a.defaultCurrency !== selectedCurrency && !isSelected);
                      const cardClass = isSelected ? 'active' : isBlocked ? 'disabled' : 'idle';
                      return (
                        <div
                          key={a.id}
                          className={`sadd-ant-card ${cardClass}`}
                          onClick={() => handleToggleAntenna(a.id, a.defaultCurrency)}
                        >
                          <div className="sadd-ant-chk">
                            {isSelected && (
                              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '.82rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                            <div style={{ fontSize: '.68rem', fontWeight: 600, color: isBlocked ? '#DC2626' : '#6B7280' }}>Devise : {a.defaultCurrency}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section identité */}
              <div className="sadd-edit-section">
                <div className="sadd-edit-section-title">Identité</div>
                <div className="sadd-edit-grid">
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Prénom</label>
                    <input className="sadd-edit-input" value={fFirstName} onChange={e => setFFirstName(e.target.value)} placeholder="Prénom" />
                  </div>
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Nom</label>
                    <input className="sadd-edit-input" value={fLastName} onChange={e => setFLastName(e.target.value)} placeholder="Nom" />
                  </div>
                  <div className="sadd-edit-field sadd-col-span-2">
                    <label className="sadd-edit-label">Téléphone</label>
                    <input className="sadd-edit-input" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+33 6 …" />
                  </div>
                </div>
              </div>

              {/* Section localisation */}
              <div className="sadd-edit-section">
                <div className="sadd-edit-section-title">Localisation &amp; Origine</div>
                <div className="sadd-edit-grid">
                  <div className="sadd-edit-field sadd-col-span-2">
                    <label className="sadd-edit-label">Adresse de résidence</label>
                    <input className="sadd-edit-input" value={fAddressLine1} onChange={e => setFAddressLine1(e.target.value)} placeholder="N° et nom de rue…" />
                  </div>
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Code postal</label>
                    <input className="sadd-edit-input" value={fPostalCode} onChange={e => setFPostalCode(e.target.value)} placeholder="75001" />
                  </div>
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Ville</label>
                    <input className="sadd-edit-input" value={fCity} onChange={e => setFCity(e.target.value)} placeholder="Paris" />
                  </div>
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Pays</label>
                    <select
                      className="sadd-edit-select"
                      value={fCountry}
                      onChange={e => { setFCountry(e.target.value); if (e.target.value !== 'Autre') setFCustomCountry(''); }}
                    >
                      <option value="">Sélectionnez un pays…</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {fCountry === 'Autre' && (
                      <input className="sadd-edit-input" style={{ marginTop: '.45rem' }} value={fCustomCountry} onChange={e => setFCustomCountry(e.target.value)} placeholder="Précisez le pays" />
                    )}
                  </div>
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Commune d&apos;origine</label>
                    <select
                      className="sadd-edit-select"
                      value={fOriginSubPrefecture}
                      onChange={e => { setFOriginSubPrefecture(e.target.value); if (e.target.value !== 'Autre') setFCustomOriginSubPrefecture(''); }}
                    >
                      <option value="">Sélectionnez une commune…</option>
                      {COMMUNES_ORIGINE.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {fOriginSubPrefecture === 'Autre' && (
                      <input className="sadd-edit-input" style={{ marginTop: '.45rem' }} value={fCustomOriginSubPrefecture} onChange={e => setFCustomOriginSubPrefecture(e.target.value)} placeholder="Précisez la commune" />
                    )}
                  </div>
                  <div className="sadd-edit-field sadd-col-span-2">
                    <label className="sadd-edit-label">Poste occupé</label>
                    <select
                      className="sadd-edit-select"
                      value={fAssociationTitle}
                      onChange={e => { setFAssociationTitle(e.target.value); if (e.target.value !== 'Autre') setFCustomAssociationTitle(''); }}
                    >
                      <option value="">Sélectionnez un poste…</option>
                      {ASSOCIATION_TITLES.map(title => <option key={title} value={title}>{title}</option>)}
                    </select>
                    {fAssociationTitle === 'Autre' && (
                      <input className="sadd-edit-input" style={{ marginTop: '.45rem' }} value={fCustomAssociationTitle} onChange={e => setFCustomAssociationTitle(e.target.value)} placeholder="Précisez le poste" />
                    )}
                  </div>
                </div>
              </div>

              <div className="sadd-edit-footer">
                <button type="button" className="sadd-btn-save" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'saddspin .7s linear infinite' }} />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Enregistrer
                    </>
                  )}
                </button>
                <button type="button" className="sadd-btn-cancel-save" disabled={saving} onClick={handleCancelEdit}>
                  Annuler
                </button>
                {saveError && (
                  <div className="sadd-save-error">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                    </svg>
                    {saveError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CARD : Antennes affiliées ── */}
        <div className="sadd-card d1">
          <div className="sadd-card-h">
            <div className="sadd-card-ico" style={{ background: 'rgba(254,242,242,.8)', color: '#DC2626' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </div>
            <span className="sadd-card-title">Antennes affiliées</span>
            <div className="sadd-section-divider" />
          </div>
          {activeAssignments.length > 0 ? (
            <div className="sadd-antenna-chips">
              {activeAssignments.map(a => (
                <div key={a.id} className="sadd-antenna-chip">
                  <span>{a.antenna.name}</span>
                  <span className="sadd-antenna-chip-code">{a.antenna.code}</span>
                  {a.antenna.defaultCurrency && (
                    <span className="sadd-antenna-chip-currency">{a.antenna.defaultCurrency}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="sadd-antenna-empty">Aucune antenne affiliée</div>
          )}
        </div>

        {/* ── CARD : Informations du compte ── */}
        <div className="sadd-card d2">
          <div className="sadd-card-h">
            <div className="sadd-card-ico" style={{ background: 'rgba(254,242,242,.8)', color: '#DC2626' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="sadd-card-title">Informations du compte</span>
            <div className="sadd-section-divider" />
          </div>
          <div className="sadd-grid">
            <div className="sadd-field">
              <span className="sadd-field-label">Prénom</span>
              <span className="sadd-field-value">{user.firstName || '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Nom</span>
              <span className="sadd-field-value">{user.lastName || '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Téléphone</span>
              <span className={`sadd-field-value${user.phone ? '' : ' empty'}`}>{user.phone ?? '—'}</span>
            </div>
            <div className="sadd-field sadd-col-span-2">
              <span className="sadd-field-label">Email</span>
              <span className="sadd-field-value">{user.email}</span>
            </div>
          </div>
        </div>

        {/* ── CARD : Localisation, Origine & Poste ── */}
        <div className="sadd-card d3">
          <div className="sadd-card-h">
            <div className="sadd-card-ico" style={{ background: 'rgba(254,242,242,.8)', color: '#DC2626' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="sadd-card-title">Localisation, Origine &amp; Poste</span>
            <div className="sadd-section-divider" />
          </div>
          <div className="sadd-grid">
            <div className="sadd-field sadd-col-span-2">
              <span className="sadd-field-label">Adresse de résidence</span>
              <span className={`sadd-field-value${user.addressLine1 ? '' : ' empty'}`}>{user.addressLine1 || '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Code postal</span>
              <span className={`sadd-field-value${user.postalCode ? '' : ' empty'}`}>{user.postalCode ?? '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Ville</span>
              <span className={`sadd-field-value${user.city ? '' : ' empty'}`}>{user.city ?? '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Pays</span>
              <span className={`sadd-field-value${user.country ? '' : ' empty'}`}>{user.country ?? '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Commune d&apos;origine</span>
              <span className={`sadd-field-value${user.originSubPrefecture ? '' : ' empty'}`}>{user.originSubPrefecture ?? '—'}</span>
            </div>
            <div className="sadd-field sadd-col-span-2">
              <span className="sadd-field-label">Poste occupé</span>
              <span className={`sadd-field-value${user.function || user.associationTitle ? '' : ' empty'}`}>
                {user.function || user.associationTitle || 'Non défini'}
              </span>
            </div>
          </div>
        </div>

        {/* ── CARD : Informations techniques ── */}
        <div className="sadd-card d4">
          <div className="sadd-card-h">
            <div className="sadd-card-ico" style={{ background: 'rgba(254,242,242,.8)', color: '#DC2626' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="sadd-card-title">Informations techniques</span>
            <div className="sadd-section-divider" />
          </div>
          <div className="sadd-tech">
            <span>ID unique :</span>
            <code>{user.id}</code>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
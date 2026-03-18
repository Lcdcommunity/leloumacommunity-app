// web/app/(protected)/super-admin/admins/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { superAdminApi, type UserDetail } from '../../../../../lib/super-admin-api';
import { formatDate, fullName } from '../../../../../lib/format';

export default function AdminDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [user,      setUser]      = useState<UserDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveOk,    setSaveOk]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form fields
  const [fFirstName,           setFFirstName]           = useState('');
  const [fLastName,            setFLastName]            = useState('');
  const [fPhone,               setFPhone]               = useState('');
  const [fCity,                setFCity]                = useState('');
  const [fCountry,             setFCountry]             = useState('');
  const [fPostalCode,          setFPostalCode]          = useState('');
  const [fOriginSubPrefecture, setFOriginSubPrefecture] = useState('');
  const [fAddressLine1,        setFAddressLine1]        = useState('');
  const [fAddressLine2,        setFAddressLine2]        = useState('');

  useEffect(() => {
    async function fetchUser() {
      try {
        // Contournement : la route GET /super-admin/admins/:id n'existe pas côté backend.
        // On récupère la liste complète et on filtre sur l'id.
        const res = await superAdminApi.listAntennaAdmins({ page: 1, pageSize: 200 });
        const found = res.items.find((u) => u.id === id) as UserDetail | undefined;
        if (!found) throw new Error('Administrateur introuvable dans la liste.');
        setUser(found);
        setFFirstName(found.firstName ?? '');
        setFLastName(found.lastName ?? '');
        setFPhone(found.phone ?? '');
        setFCity(found.city ?? '');
        setFCountry(found.country ?? '');
        setFPostalCode(found.postalCode ?? '');
        setFOriginSubPrefecture(found.originSubPrefecture ?? '');
        setFAddressLine1(found.addressLine1 ?? '');
        setFAddressLine2(found.addressLine2 ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger les détails de l'administrateur");
      } finally {
        setLoading(false);
      }
    }
    void fetchUser();
  }, [id]);

  async function handleToggleStatus() {
    if (!user || busy) return;
    setBusy(true);
    try {
      if (user.status === 'ACTIVE') await superAdminApi.suspendAntennaAdmin(id);
      else await superAdminApi.activateAntennaAdmin(id);
      // Re-fetch via liste
      const res = await superAdminApi.listAntennaAdmins({ page: 1, pageSize: 200 });
      const updated = res.items.find((u) => u.id === id) as UserDetail | undefined;
      if (updated) {
        setUser(updated);
        setFFirstName(updated.firstName ?? '');
        setFLastName(updated.lastName ?? '');
        setFPhone(updated.phone ?? '');
        setFCity(updated.city ?? '');
        setFCountry(updated.country ?? '');
        setFPostalCode(updated.postalCode ?? '');
        setFOriginSubPrefecture(updated.originSubPrefecture ?? '');
        setFAddressLine1(updated.addressLine1 ?? '');
        setFAddressLine2(updated.addressLine2 ?? '');
      }
    } catch {
      alert('Erreur lors du changement de statut');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!user || saving) return;
    setSaving(true); setSaveError(null); setSaveOk(false);
    try {
      await superAdminApi.updateAntennaAdmin(id, {
        firstName:           fFirstName.trim()           || undefined,
        lastName:            fLastName.trim()            || undefined,
        phone:               fPhone.trim()               || undefined,
        city:                fCity.trim()                || undefined,
        country:             fCountry.trim()             || undefined,
        postalCode:          fPostalCode.trim()          || undefined,
        originSubPrefecture: fOriginSubPrefecture.trim() || undefined,
        addressLine1:        fAddressLine1.trim()        || undefined,
        addressLine2:        fAddressLine2.trim()        || undefined,
      });
      // Re-fetch updated data
      const res = await superAdminApi.listAntennaAdmins({ page: 1, pageSize: 200 });
      const updated = res.items.find((u) => u.id === id) as UserDetail | undefined;
      if (updated) {
        setUser(updated);
        setFFirstName(updated.firstName ?? '');
        setFLastName(updated.lastName ?? '');
        setFPhone(updated.phone ?? '');
        setFCity(updated.city ?? '');
        setFCountry(updated.country ?? '');
        setFPostalCode(updated.postalCode ?? '');
        setFOriginSubPrefecture(updated.originSubPrefecture ?? '');
        setFAddressLine1(updated.addressLine1 ?? '');
        setFAddressLine2(updated.addressLine2 ?? '');
      }
      setIsEditing(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !confirm(`Supprimer définitivement le compte de ${fullName(user)} ?`) || busy) return;
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
        <style>{`@keyframes sadinspin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '.75rem', color: '#6B7280', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '.85rem' }}>
          <div style={{ width: 22, height: 22, border: '2.5px solid rgba(220,38,38,.12)', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'sadinspin .8s linear infinite' }} />
          Récupération du profil&hellip;
        </div>
      </AppShell>
    );
  }

  if (error || !user) {
    return (
      <AppShell title="Erreur">
        <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
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

  return (
    <AppShell title={`Profil : ${fullName(user)}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes sadinspin{to{transform:rotate(360deg)}}
        @keyframes eain{to{opacity:1;transform:translateY(0)}}

        .sadd-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1000px;margin:0 auto}

        .sadd-back{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:700;color:#DC2626;text-decoration:none;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:eain .4s .02s cubic-bezier(.22,1,.36,1) forwards;transition:color .15s}
        .sadd-back:hover{color:#991B1B}

        .sadd-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem;opacity:0;transform:translateY(8px);animation:eain .45s .05s cubic-bezier(.22,1,.36,1) forwards}
        .sadd-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:sapulse 2s ease-in-out infinite}
        @keyframes sapulse{0%,100%{opacity:1}50%{opacity:.3}}

        /* ── Hero ── */
        .sadd-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;padding:1.5rem;margin-bottom:1rem;opacity:0;transform:translateY(10px);animation:eain .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        .sadd-hero-left{display:flex;align-items:center;gap:1rem;min-width:0}
        .sadd-avatar{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;color:white;font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:700;box-shadow:0 4px 14px rgba(220,38,38,.28);flex-shrink:0}
        .sadd-hero-name{font-family:'Cormorant Garamond',serif;font-size:clamp(1.3rem,3vw,1.75rem);font-weight:700;color:#0F172A;letter-spacing:-.01em;line-height:1.15;margin-bottom:.3rem}
        .sadd-hero-meta{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
        .sadd-role-tag{display:inline-flex;align-items:center;gap:.35rem;font-size:.65rem;font-weight:800;background:#EFF6FF;color:#1D4ED8;padding:.22rem .65rem;border-radius:99px;border:1px solid #BFDBFE;letter-spacing:.04em}
        .sadd-hero-email{font-size:.78rem;font-weight:600;color:#6B7280}

        /* ── Status badge ── */
        .sadd-status-active{display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;font-weight:900;color:#059669;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:99px;padding:.22rem .65rem}
        .sadd-status-suspended{display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;font-weight:900;color:#DC2626;background:#FEF2F2;border:1px solid #FECACA;border-radius:99px;padding:.22rem .65rem}

        /* ── Action buttons (hero) ── */
        .sadd-btn-edit{height:36px;padding:0 1rem;border-radius:9px;border:none;background:linear-gradient(135deg,#991B1B,#DC2626);color:white;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;box-shadow:0 4px 12px rgba(220,38,38,.28);transition:all .15s}
        .sadd-btn-edit:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(220,38,38,.38)}
        .sadd-btn-cancel-edit{height:36px;padding:0 1rem;border-radius:9px;border:1.5px solid rgba(220,38,38,.2);background:rgba(254,242,242,.5);color:#B91C1C;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:all .15s}
        .sadd-btn-cancel-edit:hover{background:#FEE2E2;border-color:rgba(220,38,38,.4)}
        .sadd-btn-suspend{height:36px;padding:0 1rem;border-radius:9px;border:1.5px solid rgba(217,119,6,.25);background:#FFFBEB;color:#B45309;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:all .15s}
        .sadd-btn-suspend:hover:not(:disabled){background:#FEF3C7;border-color:rgba(217,119,6,.45);transform:translateY(-1px)}
        .sadd-btn-suspend:disabled{opacity:.55;cursor:not-allowed}
        .sadd-btn-del{height:36px;padding:0 1rem;border-radius:9px;border:1.5px solid rgba(220,38,38,.2);background:white;color:#DC2626;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:all .15s}
        .sadd-btn-del:hover:not(:disabled){background:#FEF2F2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}
        .sadd-btn-del:disabled{opacity:.55;cursor:not-allowed}

        /* ── Info cards ── */
        .sadd-card{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;margin-bottom:1rem;opacity:0;transform:translateY(10px)}
        .sadd-card.d1{animation:eain .5s .12s cubic-bezier(.22,1,.36,1) forwards}
        .sadd-card.d2{animation:eain .5s .17s cubic-bezier(.22,1,.36,1) forwards}
        .sadd-card.d3{animation:eain .5s .22s cubic-bezier(.22,1,.36,1) forwards}

        .sadd-card-h{padding:.85rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;gap:.5rem}
        .sadd-card-ico{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .sadd-card-title{font-size:.72rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#374151}

        .sadd-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.1rem 2rem;padding:1.25rem 1.4rem}
        @media(max-width:560px){.sadd-grid{grid-template-columns:1fr}}
        .sadd-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
        @media(max-width:680px){.sadd-grid-3{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:420px){.sadd-grid-3{grid-template-columns:1fr}}

        .sadd-field{display:flex;flex-direction:column;gap:.2rem;min-width:0}
        .sadd-field-label{font-size:.62rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF}
        .sadd-field-value{font-size:.86rem;font-weight:700;color:#111827;word-break:break-word}
        .sadd-field-value.empty{color:#D1D5DB}
        .sadd-field-value.mono{font-family:'DM Mono',monospace;font-size:.78rem}

        /* ── Technical info ── */
        .sadd-tech{padding:.75rem 1.4rem;background:rgba(249,250,251,.6);border-top:1px solid rgba(220,38,38,.06);font-size:.7rem;color:#9CA3AF;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
        .sadd-tech code{color:#6B7280;font-weight:700;font-family:'DM Mono',monospace}

        /* ── Edit form panel ── */
        .sadd-edit-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1.5px solid rgba(220,38,38,.18);box-shadow:0 2px 18px rgba(220,38,38,.08),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;margin-bottom:1rem;opacity:0;transform:translateY(10px);animation:eain .4s cubic-bezier(.22,1,.36,1) forwards}
        .sadd-edit-head{padding:.9rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.1);display:flex;align-items:center;justify-content:space-between;background:rgba(254,242,242,.3)}
        .sadd-edit-title{font-size:.72rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#B91C1C}
        .sadd-edit-body{padding:1.4rem}
        .sadd-edit-section{margin-bottom:1.25rem}
        .sadd-edit-section-title{font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF;margin-bottom:.75rem;display:flex;align-items:center;gap:.5rem}
        .sadd-edit-section-title::after{content:'';flex:1;height:1px;background:rgba(220,38,38,.1)}
        .sadd-edit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}
        @media(max-width:520px){.sadd-edit-grid{grid-template-columns:1fr}}
        .sadd-edit-field{display:flex;flex-direction:column;gap:.3rem}
        .sadd-edit-label{font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#DC2626}
        .sadd-edit-input{min-height:44px;border-radius:11px;border:1px solid rgba(220,38,38,.16);background:rgba(255,255,255,.9);padding:0 .9rem;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:600;color:#111827;outline:none;transition:border-color .18s,box-shadow .18s;width:100%;box-sizing:border-box}
        .sadd-edit-input:focus{border-color:rgba(220,38,38,.5);box-shadow:0 0 0 3px rgba(220,38,38,.08);background:white}
        .sadd-edit-input::placeholder{color:rgba(107,114,128,.4);font-weight:400}
        .sadd-edit-footer{display:flex;gap:.6rem;align-items:center;padding-top:1rem;border-top:1px solid rgba(220,38,38,.08);flex-wrap:wrap}
        .sadd-btn-save{min-height:44px;padding:0 1.3rem;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;border-radius:11px;color:white;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.45rem;box-shadow:0 4px 14px rgba(220,38,38,.28);transition:transform .15s,box-shadow .2s}
        .sadd-btn-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(220,38,38,.38)}
        .sadd-btn-save:disabled{opacity:.6;cursor:not-allowed}
        .sadd-btn-cancel-save{min-height:44px;padding:0 1.1rem;background:rgba(249,250,251,.9);border:1px solid rgba(220,38,38,.18);border-radius:11px;color:#6B7280;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:700;cursor:pointer;transition:all .15s}
        .sadd-btn-cancel-save:hover:not(:disabled){background:#F3F4F6;color:#374151}
        .sadd-save-error{display:flex;align-items:center;gap:.5rem;padding:.65rem .9rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;color:#B91C1C;font-size:.78rem;font-weight:700;width:100%}
        .sadd-save-ok{display:flex;align-items:center;gap:.5rem;padding:.65rem .9rem;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;color:#065F46;font-size:.78rem;font-weight:700;margin-bottom:1rem;animation:eain .3s cubic-bezier(.22,1,.36,1)}
      `}</style>

      <div className="sadd-wrap">

        {/* Back */}
        <Link href="/super-admin/admins" className="sadd-back">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux administrateurs
        </Link>

        {/* Eyebrow */}
        <div className="sadd-eyebrow">
          <div className="sadd-dot" />Super Admin
        </div>

        {/* ── Hero ── */}
        <div className="sadd-hero">
          <div className="sadd-hero-left">
            <div className="sadd-avatar">{initials || '?'}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sadd-hero-name">{fullName(user)}</div>
              <div className="sadd-hero-meta">
                <span className="sadd-role-tag">
                  <div style={{ width: 5, height: 5, background: '#3B82F6', borderRadius: '50%' }} />
                  ADMINISTRATEUR D&apos;ANTENNE
                </span>
                <span className={user.status === 'ACTIVE' ? 'sadd-status-active' : 'sadd-status-suspended'}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: user.status === 'ACTIVE' ? '#059669' : '#DC2626', flexShrink: 0 }} />
                  {user.status === 'ACTIVE' ? 'ACTIF' : 'SUSPENDU'}
                </span>
              </div>
              {user.email && <div className="sadd-hero-email" style={{ marginTop: '.3rem' }}>{user.email}</div>}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
            {!isEditing ? (
              <button className="sadd-btn-edit" onClick={() => { setIsEditing(true); setSaveOk(false); setSaveError(null); }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Modifier
              </button>
            ) : (
              <button className="sadd-btn-cancel-edit" onClick={() => { setIsEditing(false); setSaveError(null); }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Annuler
              </button>
            )}
            <button className="sadd-btn-suspend" disabled={busy} onClick={handleToggleStatus}>
              {busy
                ? <div style={{ width: 13, height: 13, border: '2px solid rgba(180,83,9,.3)', borderTopColor: '#B45309', borderRadius: '50%', animation: 'sadinspin .7s linear infinite' }} />
                : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" /></svg>
              }
              {user.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
            </button>
            <button className="sadd-btn-del" disabled={busy} onClick={handleDelete}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Supprimer
            </button>
          </div>
        </div>

        {/* Save success toast */}
        {saveOk && (
          <div className="sadd-save-ok">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            Profil mis à jour avec succès.
          </div>
        )}

        {/* ── Edit form ── */}
        {isEditing && (
          <div className="sadd-edit-panel">
            <div className="sadd-edit-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(220,38,38,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </div>
                <span className="sadd-edit-title">Modifier le profil</span>
              </div>
            </div>
            <div className="sadd-edit-body">

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
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Téléphone</label>
                    <input className="sadd-edit-input" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+33 6 …" />
                  </div>
                </div>
              </div>

              <div className="sadd-edit-section">
                <div className="sadd-edit-section-title">Adresse</div>
                <div className="sadd-edit-grid">
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Adresse 1</label>
                    <input className="sadd-edit-input" value={fAddressLine1} onChange={e => setFAddressLine1(e.target.value)} placeholder="Rue, avenue…" />
                  </div>
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Adresse 2</label>
                    <input className="sadd-edit-input" value={fAddressLine2} onChange={e => setFAddressLine2(e.target.value)} placeholder="Appartement, étage…" />
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
                    <input className="sadd-edit-input" value={fCountry} onChange={e => setFCountry(e.target.value)} placeholder="France" />
                  </div>
                  <div className="sadd-edit-field">
                    <label className="sadd-edit-label">Commune d&apos;origine</label>
                    <input className="sadd-edit-input" value={fOriginSubPrefecture} onChange={e => setFOriginSubPrefecture(e.target.value)} placeholder="Ex: Sagalé" />
                  </div>
                </div>
              </div>

              <div className="sadd-edit-footer">
                <button className="sadd-btn-save" disabled={saving} onClick={() => void handleSave()}>
                  {saving
                    ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'sadinspin .7s linear infinite' }} />Enregistrement…</>
                    : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Enregistrer</>
                  }
                </button>
                <button className="sadd-btn-cancel-save" disabled={saving} onClick={() => { setIsEditing(false); setSaveError(null); }}>
                  Annuler
                </button>
                {saveError && (
                  <div className="sadd-save-error">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                    {saveError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Compte ── */}
        <div className="sadd-card d1">
          <div className="sadd-card-h">
            <div className="sadd-card-ico" style={{ background: 'rgba(254,242,242,.8)', color: '#DC2626' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="sadd-card-title">Informations du compte</span>
          </div>
          <div className="sadd-grid sadd-grid-3">
            <div className="sadd-field">
              <span className="sadd-field-label">Prénom</span>
              <span className="sadd-field-value">{user.firstName || <span className="empty">—</span>}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Nom</span>
              <span className="sadd-field-value">{user.lastName || <span className="empty">—</span>}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Téléphone</span>
              <span className={`sadd-field-value${user.phone ? '' : ' empty'}`}>{user.phone ?? '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Email</span>
              <span className="sadd-field-value">{user.email}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Date d&apos;inscription</span>
              <span className="sadd-field-value">{formatDate(user.createdAt)}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Statut</span>
              <span className={user.status === 'ACTIVE' ? 'sadd-status-active' : 'sadd-status-suspended'} style={{ width: 'fit-content' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: user.status === 'ACTIVE' ? '#059669' : '#DC2626', flexShrink: 0 }} />
                {user.status === 'ACTIVE' ? 'Compte actif' : 'Compte suspendu'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Localisation ── */}
        <div className="sadd-card d2">
          <div className="sadd-card-h">
            <div className="sadd-card-ico" style={{ background: 'rgba(240,253,250,.9)', color: '#0F766E' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="sadd-card-title">Localisation &amp; Origine</span>
          </div>
          <div className="sadd-grid">
            <div className="sadd-field">
              <span className="sadd-field-label">Ville</span>
              <span className={`sadd-field-value${user.city ? '' : ' empty'}`}>{user.city ?? '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Pays</span>
              <span className={`sadd-field-value${user.country ? '' : ' empty'}`}>{user.country ?? '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Code postal</span>
              <span className={`sadd-field-value${user.postalCode ? '' : ' empty'}`}>{user.postalCode ?? '—'}</span>
            </div>
            <div className="sadd-field">
              <span className="sadd-field-label">Commune d&apos;origine</span>
              <span className={`sadd-field-value${user.originSubPrefecture ? '' : ' empty'}`}>{user.originSubPrefecture ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Infos techniques ── */}
        <div className="sadd-card d3">
          <div className="sadd-card-h">
            <div className="sadd-card-ico" style={{ background: 'rgba(239,246,255,.9)', color: '#1D4ED8' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="sadd-card-title">Informations techniques</span>
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
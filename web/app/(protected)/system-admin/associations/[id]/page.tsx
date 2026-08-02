// web/app/(protected)/system-admin/associations/[id]/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import { formatDate } from '../../../../../lib/format';

interface AssociationDetail {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  domainName?: string | null;
  defaultCurrency: string;
  country?: string | null;
  createdAt: string;
  updatedAt: string;
  logoFile?: { id: string; url: string } | null;
  themeColors?: Record<string, string> | null;
  fontFamily?: string | null;
  _count: {
    users: number;
    antennas: number;
  };
}

const FONT_OPTIONS = [
  { name: 'DM Sans (Moderne)', value: "'DM Sans', sans-serif" },
  { name: 'Inter (Pro)', value: "'Inter', sans-serif" },
  { name: 'Montserrat (Élégant)', value: "'Montserrat', sans-serif" },
  { name: 'Playfair Display (Classique)', value: "'Playfair Display', serif" },
  { name: 'Roboto (Standard)', value: "'Roboto', sans-serif" },
];

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GNF', label: 'Franc guinéen (GNF)' },
  { value: 'XOF', label: 'Franc CFA (XOF)' },
  { value: 'USD', label: 'Dollar américain (USD)' },
  { value: 'GBP', label: 'Livre sterling (GBP)' },
  { value: 'CHF', label: 'Franc suisse (CHF)' },
  { value: 'CAD', label: 'Dollar canadien (CAD)' },
];

export default function AssociationDetails() {
  const { id } = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [asso, setAsso] = useState<AssociationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editFontFamily, setEditFontFamily] = useState(FONT_OPTIONS[0].value);
  const [editPrimaryColor, setEditPrimaryColor] = useState('#7C3AED');
  const [editSecondaryColor, setEditSecondaryColor] = useState('#10B981');
  const [editCurrency, setEditCurrency] = useState('EUR');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [domainNameServers, setDomainNameServers] = useState<string[] | null>(null);
  const [domainActionError, setDomainActionError] = useState<string | null>(null);

  const fetchAssociation = useCallback(() => {
    return api.getAssociationByIdSystemAdmin(id as string).then((data) => {
      const d = data as AssociationDetail;
      setAsso(d);
      setEditName(d.name);
      setEditCode(d.code);
      setEditDomain(d.domainName || '');
      setEditFontFamily(d.fontFamily || FONT_OPTIONS[0].value);
      setEditPrimaryColor(d.themeColors?.primary || '#7C3AED');
      setEditSecondaryColor(d.themeColors?.secondary || '#10B981');
      setEditCurrency(d.defaultCurrency || 'EUR');
      setLogoPreview(d.logoFile?.url || null);
      setLogoFile(null);
    });
  }, [id]);

  useEffect(() => {
    fetchAssociation()
      .catch(() => router.push('/system-admin/associations'))
      .finally(() => setLoading(false));
  }, [fetchAssociation, router]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleStatus = async () => {
    if (!asso) return;
    const action = asso.isActive ? 'suspendre' : 'réactiver';
    if (!confirm(`Voulez-vous vraiment ${action} cette instance ?`)) return;

    setActionLoading(true);
    try {
      await api.updateAssociationStatusSystemAdmin(id as string, !asso.isActive);
      await fetchAssociation();
    } catch {
      alert("Erreur lors du changement de statut");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setDomainActionError(null);
    setDomainNameServers(null);
    try {
      const trimmedDomain = editDomain.trim();
      const domainChanged = trimmedDomain !== (asso?.domainName || '');

      let logoFileId: string | undefined;
      if (logoFile) {
        const uploadRes = await api.uploadFile(logoFile, { category: 'ASSOCIATION_DOCUMENT' });
        logoFileId = uploadRes.id;
      }

      await api.updateAssociationDetailsSystemAdmin(id as string, {
        name: editName,
        code: editCode,
        domainName: trimmedDomain,
        ...(logoFileId ? { logoFileId } : {}),
        themeColors: { primary: editPrimaryColor, secondary: editSecondaryColor },
        fontFamily: editFontFamily,
        defaultCurrency: editCurrency,
      });

      if (domainChanged && trimmedDomain) {
        try {
          const result = await api.provisionDomainSystemAdmin({
            associationId: id as string,
            domain: trimmedDomain,
          });
          setDomainNameServers(result.nameServers);
        } catch (provErr: unknown) {
          setDomainActionError(
            provErr instanceof Error ? provErr.message : 'Erreur de provisioning du domaine.',
          );
        }
      }

      setIsEditing(false);
      await fetchAssociation();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !asso) {
    return (
      <AppShell title="Chargement...">
        <div style={{ padding: '5rem', textAlign: 'center', color: '#7C3AED', fontWeight: 800 }}>
          Analyse de l&apos;instance...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Détails : ${asso.name}`}>
      <style>{`
        .det-wrap { font-family: 'DM Sans', sans-serif; padding: 2rem; max-width: 1100px; margin: 0 auto; animation: detIn 0.4s ease-out; }
        .det-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; gap: 1.5rem; }
        .status-hero { 
          padding: 0.5rem 1.2rem; border-radius: 99px; font-size: 0.8rem; font-weight: 800; text-transform: uppercase;
          background: ${asso.isActive ? '#ECFDF5' : '#FEF2F2'}; color: ${asso.isActive ? '#059669' : '#DC2626'};
          border: 1px solid ${asso.isActive ? '#A7F3D0' : '#FCA5A5'};
        }
        .det-grid { display: grid; grid-template-columns: 1fr 350px; gap: 1.5rem; }
        @media (max-width: 900px) { .det-grid { grid-template-columns: 1fr; } }
        
        .det-card { background: white; border-radius: 24px; border: 1px solid #EDE9FE; padding: 1.5rem; box-shadow: 0 4px 20px rgba(124,58,237,0.05); margin-bottom: 1.5rem; }
        .det-card-title { font-size: 0.9rem; font-weight: 800; color: #4C1D95; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
        
        .info-row { display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid #F9FAFB; align-items: center;}
        .info-label { color: #6B7280; font-weight: 500; font-size: 0.9rem; }
        .info-value { color: #111827; font-weight: 700; font-size: 0.9rem; text-align: right; }
        
        .sys-input { padding: 0.5rem 0.8rem; border-radius: 8px; border: 1px solid #DDD6FE; font-family: inherit; font-size: 0.85rem; font-weight: 600; outline: none; color: #111827; width: 60%; text-align: right; background: #F5F3FF; transition: border-color 0.2s;}
        .sys-input:focus { border-color: #7C3AED; }
        .sys-select {
          padding: 0.5rem 0.8rem; border-radius: 8px; border: 1px solid #DDD6FE; font-family: inherit;
          font-size: 0.85rem; font-weight: 600; outline: none; color: #111827; width: 60%; text-align: right;
          background: #F5F3FF; appearance: none; cursor: pointer;
        }
        
        .btn-edit { background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-edit:hover { background: #EDE9FE; }
        
        .btn-action { 
          width: 100%; padding: 1rem; border-radius: 14px; font-weight: 800; cursor: pointer; transition: all 0.2s; border: none;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          background: ${asso.isActive ? '#FEF2F2' : '#7C3AED'}; color: ${asso.isActive ? '#DC2626' : 'white'};
        }
        .btn-action:hover { transform: translateY(-2px); filter: brightness(0.95); }
        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
        .stat-box { background: #F5F3FF; border-radius: 16px; padding: 1.2rem; text-align: center; border: 1px solid #DDD6FE; }
        .stat-num { display: block; font-size: 1.8rem; font-weight: 800; color: #7C3AED; }
        .stat-label { font-size: 0.7rem; font-weight: 700; color: #6D28D9; text-transform: uppercase; }
        .ns-banner { background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 12px; padding: 1rem; margin-top: 1rem; font-size: 0.8rem; }
        .ns-banner code { display: block; font-weight: 700; color: #7C3AED; margin-top: 0.4rem; }

        .logo-upload-zone {
          width: 100%; height: 90px; border: 2px dashed rgba(124,58,237,0.3); border-radius: 12px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all 0.2s; background: rgba(124,58,237,0.02); position: relative; overflow: hidden;
        }
        .logo-upload-zone:hover { border-color: #7C3AED; background: white; }
        .logo-img { object-fit: contain; }
        .current-logo-preview { border-radius: 10px; object-fit: contain; background: #F5F3FF; border: 1px solid #DDD6FE; }
        .color-row { display: flex; gap: 0.6rem; }
        .color-item {
          flex: 1; position: relative; height: 42px; border-radius: 8px;
          background: #F5F3FF; overflow: hidden; display: flex; align-items: center; justify-content: center;
          border: 1px solid #DDD6FE;
        }
        .color-picker { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 2; }
        .color-display { display: flex; align-items: center; gap: 0.4rem; z-index: 1; pointer-events: none; }
        .color-circle { width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .color-label { font-size: 0.7rem; font-weight: 700; color: #111827; }
        .color-swatch-sm { width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.15); display: inline-block; }

        @keyframes detIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="det-wrap">
        <header className="det-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>{asso.name}</h1>
              <span className="status-hero">{asso.isActive ? '● Instance Active' : '○ Instance Suspendue'}</span>
            </div>
            <p style={{ color: '#6B7280', fontWeight: 500, margin: 0 }}>ID Système : <code style={{ color: '#7C3AED' }}>{asso.id}</code></p>
          </div>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 700, cursor: 'pointer' }}>← Retour à la liste</button>
        </header>

        <div className="det-grid">
          <div className="det-main">
            <div className="det-card">
              <div className="det-card-title">
                <span>📋 Identité de l&apos;Instance</span>
                {!isEditing && <button className="btn-edit" onClick={() => setIsEditing(true)}>Modifier</button>}
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateIdentity}>
                  <div className="info-row">
                    <span className="info-label">Nom Officiel</span>
                    <input className="sys-input" value={editName} onChange={e => setEditName(e.target.value)} required />
                  </div>
                  <div className="info-row">
                    <span className="info-label">Code Identifiant</span>
                    <input className="sys-input" style={{ fontFamily: 'monospace' }} value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase().replace(/\s/g,''))} required />
                  </div>
                  <div className="info-row">
                    <span className="info-label">Domaine Dédié</span>
                    <input className="sys-input" value={editDomain} onChange={e => setEditDomain(e.target.value)} placeholder="asso.lcd.com" />
                  </div>

                  <div className="info-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                    <span className="info-label">Logo</span>
                    <div className="logo-upload-zone" onClick={() => fileInputRef.current?.click()}>
                      {logoPreview ? (
                        <Image src={logoPreview} alt="Logo" fill className="logo-img" unoptimized />
                      ) : (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>📁</span>
                          <span style={{ color: '#7C3AED', fontWeight: 600, fontSize: '0.8rem' }}>Uploader un logo</span>
                        </div>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleLogoChange} hidden accept="image/*" />
                  </div>

                  <div className="info-row">
                    <span className="info-label">Police d&apos;écriture</span>
                    <select className="sys-select" value={editFontFamily} onChange={e => setEditFontFamily(e.target.value)} style={{ fontFamily: editFontFamily }}>
                      {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                    </select>
                  </div>

                  <div className="info-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                    <span className="info-label">Couleurs du thème</span>
                    <div className="color-row">
                      <div className="color-item">
                        <input type="color" className="color-picker" value={editPrimaryColor} onChange={e => setEditPrimaryColor(e.target.value)} />
                        <div className="color-display">
                          <span className="color-circle" style={{ backgroundColor: editPrimaryColor }} />
                          <span className="color-label">Principale</span>
                        </div>
                      </div>
                      <div className="color-item">
                        <input type="color" className="color-picker" value={editSecondaryColor} onChange={e => setEditSecondaryColor(e.target.value)} />
                        <div className="color-display">
                          <span className="color-circle" style={{ backgroundColor: editSecondaryColor }} />
                          <span className="color-label">Accent</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Devise par défaut</span>
                    <select className="sys-select" value={editCurrency} onChange={e => setEditCurrency(e.target.value)}>
                      {CURRENCY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                    <button type="button" className="btn-edit" onClick={() => setIsEditing(false)} disabled={actionLoading}>Annuler</button>
                    <button type="submit" className="btn-edit" style={{ background: '#7C3AED', color: 'white' }} disabled={actionLoading}>Enregistrer</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="info-row"><span className="info-label">Nom Officiel</span><span className="info-value">{asso.name}</span></div>
                  <div className="info-row"><span className="info-label">Code Identifiant</span><span className="info-value" style={{ fontFamily: 'monospace', color: '#7C3AED' }}>{asso.code}</span></div>
                  <div className="info-row"><span className="info-label">Domaine Dédié</span><span className="info-value">{asso.domainName || 'Non configuré'}</span></div>
                  <div className="info-row">
                    <span className="info-label">Logo</span>
                    <span className="info-value">
                      {asso.logoFile?.url
                        ? <Image src={asso.logoFile.url} alt="Logo" width={36} height={36} className="current-logo-preview" unoptimized />
                        : 'Non configuré'}
                    </span>
                  </div>
                  <div className="info-row"><span className="info-label">Police</span><span className="info-value" style={{ fontFamily: asso.fontFamily || undefined }}>{asso.fontFamily || 'Défaut'}</span></div>
                  <div className="info-row">
                    <span className="info-label">Couleurs</span>
                    <span className="info-value" style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <span className="color-swatch-sm" style={{ background: asso.themeColors?.primary || '#7C3AED' }} />
                      <span className="color-swatch-sm" style={{ background: asso.themeColors?.secondary || '#10B981' }} />
                    </span>
                  </div>
                </>
              )}

              {domainNameServers && (
                <div className="ns-banner">
                  Nameservers à configurer chez le registrar pour activer le domaine :
                  {domainNameServers.map(ns => <code key={ns}>{ns}</code>)}
                </div>
              )}
              {domainActionError && (
                <div className="ns-banner" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626' }}>
                  {domainActionError}
                </div>
              )}

              <div className="info-row" style={{ marginTop: '1rem', border: 'none' }}><span className="info-label">Devise par défaut</span><span className="info-value">{asso.defaultCurrency}</span></div>
              <div className="info-row" style={{ border: 'none' }}><span className="info-label">Pays</span><span className="info-value">{asso.country || 'Non spécifié'}</span></div>
              <div className="info-row" style={{ border: 'none' }}><span className="info-label">Date de création</span><span className="info-value">{formatDate(asso.createdAt)}</span></div>
            </div>

            <div className="det-card" style={{ background: 'linear-gradient(135deg, #FAF9FF 0%, #FFFFFF 100%)' }}>
              <h3 className="det-card-title">📈 Activité de l&apos;Instance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="stat-box">
                  <span className="stat-num">{asso._count?.users || 0}</span>
                  <span className="stat-label">Membres inscrits</span>
                </div>
                <div className="stat-box">
                  <span className="stat-num">{asso._count?.antennas || 0}</span>
                  <span className="stat-label">Antennes actives</span>
                </div>
              </div>
            </div>
          </div>

          <div className="det-side">
            <div className="det-card" style={{ borderColor: asso.isActive ? '#FCA5A5' : '#7C3AED' }}>
              <h3 className="det-card-title">⚙️ Actions Critiques</h3>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '1.5rem' }}>
                {asso.isActive 
                  ? "La suspension bloquera l'accès à tous les membres et administrateurs de cette instance immédiatement."
                  : "La réactivation restaurera tous les accès pour les membres de cette association."
                }
              </p>
              <button 
                className="btn-action" 
                onClick={toggleStatus} 
                disabled={actionLoading}
              >
                {actionLoading ? 'Traitement...' : asso.isActive ? '🚫 Suspendre l\'instance' : '✅ Réactiver l\'instance'}
              </button>
            </div>

            <div className="det-card">
              <h3 className="det-card-title">🛠️ Support technique</h3>
              <p style={{ fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center' }}>
                Dernière modification : <br/>
                <b>{formatDate(asso.updatedAt)}</b>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
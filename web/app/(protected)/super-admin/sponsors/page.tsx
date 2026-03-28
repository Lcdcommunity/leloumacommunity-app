// web/app/(protected)/super-admin/sponsors/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type Sponsor } from '../../../../lib/api-client';

function SponsorModal({ sponsor, onClose, onSuccess }: { sponsor?: Sponsor | null; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(sponsor?.name || '');
  const [websiteUrl, setWebsiteUrl] = useState(sponsor?.websiteUrl || '');
  const [contactEmail, setContactEmail] = useState(sponsor?.contactEmail || '');
  const [isActive, setIsActive] = useState(sponsor ? sponsor.isActive : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload = { name, websiteUrl: websiteUrl || undefined, contactEmail: contactEmail || undefined, isActive };
      if (sponsor) await api.updateSponsor(sponsor.id, payload);
      else await api.createSponsor(payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!sponsor || !confirm('Supprimer ce partenaire ?')) return;
    setSaving(true);
    try {
      await api.deleteSponsor(sponsor.id);
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur suppression');
      setSaving(false);
    }
  }

  return (
    <div className="sas-modal-overlay" onClick={onClose}>
      <div className="sas-modal" onClick={e => e.stopPropagation()}>
        <div className="sas-modal-head">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', margin: 0 }}>
            {sponsor ? 'Modifier le partenaire' : 'Nouveau partenaire'}
          </h2>
          <button className="sas-modal-close" onClick={onClose}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="sas-modal-body">
          {error && <div className="sas-error" style={{ marginBottom: '1rem', padding: '0.8rem', background: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
          <div className="sas-grid-2">
            <div className="sas-field" style={{ gridColumn: '1 / -1' }}>
              <label>Nom de l&apos;entreprise / Organisation <span>*</span></label>
              <input className="sas-input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="sas-field">
              <label>Site Web</label>
              <input type="url" className="sas-input" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://" />
            </div>
            <div className="sas-field">
              <label>Email de contact</label>
              <input type="email" className="sas-input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@entreprise.com" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', background: '#F9FAFB', padding: '0.8rem 1rem', borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#DC2626' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Partenaire actif (Visible)</span>
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            {sponsor ? (
              <button type="button" className="sas-btn-del" onClick={handleDelete} disabled={saving}>Supprimer</button>
            ) : <div/>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="sas-btn-cancel" onClick={onClose} disabled={saving}>Annuler</button>
              <button type="submit" className="sas-btn-submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperAdminSponsorsPage() {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; sponsor?: Sponsor | null }>({ isOpen: false });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.listSponsors();
      setItems(res.items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur chargement'); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell title="Partenaires & Sponsors">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@500;600;700;800&display=swap');
        .sas-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 1000px; margin: 0 auto; animation: sasin 0.4s ease forwards; }
        .sas-header { margin-bottom: 1.5rem; }
        .sas-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; color: #111827; line-height: 1.2; margin: 0; }
        .sas-title span { color: #DC2626; }
        .sas-panel { background: rgba(253,253,255,0.94); border-radius: 20px; border: 1px solid rgba(220,38,38,0.1); box-shadow: 0 4px 20px rgba(220,38,38,0.05); overflow: hidden; }
        .sas-panel-head { padding: 1rem 1.4rem; border-bottom: 1px solid rgba(220,38,38,0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(254,242,242,0.4); }
        .sas-new-btn { background: linear-gradient(135deg, #991B1B, #DC2626); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(220,38,38,0.25); }
        .sas-table { width: 100%; border-collapse: collapse; }
        .sas-table th { padding: 0.85rem 1.4rem; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #6B7280; text-align: left; border-bottom: 1px solid rgba(220,38,38,0.1); }
        .sas-row { border-bottom: 1px solid #F3F4F6; cursor: pointer; transition: background 0.15s; }
        .sas-row:hover { background: #FEF2F2; }
        .sas-table td { padding: 1rem 1.4rem; font-size: 0.85rem; font-weight: 600; color: #111827; }
        .sas-status { padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.65rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.3rem; }
        .sas-status.active { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
        .sas-status.inactive { background: #F3F4F6; color: #6B7280; border: 1px solid #E5E7EB; }
        .sas-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .sas-modal { background: white; width: 100%; max-width: 500px; border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; }
        .sas-modal-head { display: flex; justify-content: space-between; padding: 1.25rem 1.5rem; background: #FEF2F2; border-bottom: 1px solid #FECACA; }
        .sas-modal-body { padding: 1.5rem; }
        .sas-modal-close { background: white; border: 1px solid #E5E7EB; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .sas-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .sas-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .sas-field label { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; color: #B91C1C; }
        .sas-field label span { color: #9CA3AF; }
        .sas-input { height: 42px; border-radius: 10px; border: 1px solid #D1D5DB; padding: 0 1rem; font-family: 'DM Sans'; font-size: 0.88rem; font-weight: 600; outline: none; }
        .sas-input:focus { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
        .sas-btn-submit { background: linear-gradient(135deg, #991B1B, #DC2626); color: white; border: none; padding: 0 1.2rem; height: 42px; border-radius: 10px; font-weight: 800; cursor: pointer; }
        .sas-btn-cancel { background: white; border: 1px solid #D1D5DB; color: #4B5563; padding: 0 1.2rem; height: 42px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .sas-btn-del { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 0 1.2rem; height: 42px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        @media (max-width: 600px) { .sas-grid-2 { grid-template-columns: 1fr; } .hide-mobile { display: none; } }
        @keyframes sasin { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="sas-wrap">
        <div className="sas-header">
          <h1 className="sas-title">Réseau de <span>Partenaires</span></h1>
        </div>
        <div className="sas-panel">
          <div className="sas-panel-head">
            <span style={{ fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', fontSize: '0.8rem' }}>Mécènes & Sponsors</span>
            <button className="sas-new-btn" onClick={() => setModalState({ isOpen: true })}>+ Ajouter</button>
          </div>

          {/* Affichage des erreurs ou du chargement */}
          {error && <div style={{ margin: '1rem', padding: '1rem', background: '#FEF2F2', color: '#B91C1C', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280', fontSize: '0.9rem', fontWeight: 600 }}>Chargement des partenaires...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF', fontSize: '0.9rem', fontWeight: 600 }}>Aucun partenaire enregistré.</div>
          ) : (
            <table className="sas-table">
              <thead>
                <tr><th>Nom</th><th className="hide-mobile">Contact / Site</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {items.map(s => (
                  <tr key={s.id} className="sas-row" onClick={() => setModalState({ isOpen: true, sponsor: s })}>
                    <td>{s.name}</td>
                    <td className="hide-mobile" style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      {s.websiteUrl || s.contactEmail || '—'}
                    </td>
                    <td>
                      <span className={`sas-status ${s.isActive ? 'active' : 'inactive'}`}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.isActive ? '#059669' : '#6B7280' }}/>
                        {s.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {modalState.isOpen && (
        <SponsorModal sponsor={modalState.sponsor} onClose={() => setModalState({ isOpen: false })} onSuccess={() => { setModalState({ isOpen: false }); void load(); }} />
      )}
    </AppShell>
  );
}
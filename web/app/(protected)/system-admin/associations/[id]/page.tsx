// web/app/(protected)/system-admin/associations/[id]/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import { formatDate } from '../../../../../lib/format';

// Interface locale pour les détails (évite le "any")
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
  _count: {
    users: number;
    antennas: number;
  };
}

export default function AssociationDetails() {
  const { id } = useParams();
  const router = useRouter();
  const [asso, setAsso] = useState<AssociationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // loadData est maintenant "mémorisé" pour plaire au useEffect
  const loadData = useCallback(() => {
    setLoading(true);
    api.getAssociationByIdSystemAdmin(id as string)
      .then((data) => setAsso(data as AssociationDetail))
      .catch(() => router.push('/system-admin/associations'))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleStatus = async () => {
    if (!asso) return;
    const action = asso.isActive ? 'suspendre' : 'réactiver';
    if (!confirm(`Voulez-vous vraiment ${action} cette instance ?`)) return;
    
    setActionLoading(true);
    try {
      await api.updateAssociationStatusSystemAdmin(id as string, !asso.isActive);
      loadData();
    } catch {
      alert("Erreur lors du changement de statut");
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
        .det-card-title { font-size: 0.9rem; font-weight: 800; color: #4C1D95; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem; }
        .info-row { display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid #F9FAFB; }
        .info-label { color: #6B7280; font-weight: 500; font-size: 0.9rem; }
        .info-value { color: #111827; font-weight: 700; font-size: 0.9rem; text-align: right; }
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
              <h3 className="det-card-title">📋 Informations Générales</h3>
              <div className="info-row"><span className="info-label">Code Identifiant</span><span className="info-value" style={{ fontFamily: 'monospace' }}>{asso.code}</span></div>
              <div className="info-row"><span className="info-label">Domaine Dédié</span><span className="info-value">{asso.domainName || 'Non configuré'}</span></div>
              <div className="info-row"><span className="info-label">Devise par défaut</span><span className="info-value">{asso.defaultCurrency}</span></div>
              <div className="info-row"><span className="info-label">Pays</span><span className="info-value">{asso.country || 'Non spécifié'}</span></div>
              <div className="info-row"><span className="info-label">Date de création</span><span className="info-value">{formatDate(asso.createdAt)}</span></div>
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
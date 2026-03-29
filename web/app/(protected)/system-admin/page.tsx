// web/app/(protected)/system-admin/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../components/layout/AppShell';
import { api } from '../../../lib/api-client';
import { formatDate } from '../../../lib/format';

// ── TYPES ──────────────────────────────────────────────────
type AssociationItem = {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
  domainName: string | null;
  createdAt: string;
  _count: { users: number; antennas: number };
};

type SystemDashboardData = {
  stats: { totalAssociations: number; totalUsers: number };
  associations: AssociationItem[];
};

export default function SystemAdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<SystemDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(''); // État pour la recherche
  
  const [selectedAsso, setSelectedAsso] = useState<AssociationItem | null>(null);

  useEffect(() => {
    api.getSystemDashboard()
      .then((res) => setData(res as unknown as SystemDashboardData))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Filtrage des associations en fonction de la recherche
  const filteredAssociations = useMemo(() => {
    if (!data) return [];
    return data.associations.filter(a => 
      a.name.toLowerCase().includes(search.toLowerCase()) || 
      a.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const enrichedStats = useMemo(() => {
    if (!data) return null;
    const totalAntennas = data.associations.reduce((acc, curr) => acc + curr._count.antennas, 0);
    const avgUsers = data.stats.totalAssociations > 0 
      ? (data.stats.totalUsers / data.stats.totalAssociations).toFixed(1) 
      : 0;
    return { totalAntennas, avgUsers, activeRate: "100%" };
  }, [data]);

  return (
    <AppShell title="Console Grand Chef">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        .sys-wrap { font-family: 'Plus Jakarta Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; animation: sysin 0.6s ease-out; }
        .sys-header { text-align: center; margin-bottom: 2rem; }
        .sys-title { font-size: clamp(1.5rem, 5vw, 2.5rem); font-weight: 800; color: #0F172A; letter-spacing: -0.04em; margin: 0; }
        .sys-title span { background: linear-gradient(135deg, #7C3AED, #C026D3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sys-subtitle { font-size: 0.9rem; color: #64748B; margin-top: 0.5rem; font-weight: 500; }

        .sys-actions { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin: 2rem 0; }
        .sys-btn-new { 
          background: #7C3AED; color: white; border: none; height: 48px; padding: 0 1.5rem; border-radius: 14px; 
          font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.6rem;
          box-shadow: 0 10px 20px rgba(124, 58, 237, 0.2); transition: all 0.3s ease; 
        }
        .sys-btn-new:hover { transform: translateY(-2px); background: #6D28D9; }

        .search-input {
          width: 100%; max-width: 400px; height: 44px; border-radius: 12px; border: 2px solid #F1F5F9;
          padding: 0 1rem; font-family: inherit; font-size: 0.9rem; outline: none; transition: border-color 0.2s;
          background: white; text-align: center;
        }
        .search-input:focus { border-color: #7C3AED; }

        .sys-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(0.5rem, 2vw, 1.2rem); margin-bottom: 2.5rem; }
        .stat-card { background: white; padding: 1.2rem 0.5rem; border-radius: 20px; border: 1px solid #F1F5F9; box-shadow: 0 4px 6px rgba(0,0,0,0.02); text-align: center; }
        .stat-icon { font-size: 1.2rem; margin-bottom: 0.5rem; }
        .stat-val { font-size: clamp(1.1rem, 3vw, 1.6rem); font-weight: 800; color: #1E293B; margin-bottom: 0.1rem; }
        .stat-lbl { font-size: 0.6rem; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; }

        .asso-list-header { text-align: center; margin-bottom: 1.5rem; }
        .asso-list-header h2 { font-size: 1.2rem; font-weight: 800; color: #1E293B; margin: 0; }
        
        .asso-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .asso-row-card { 
          background: white; border-radius: 20px; border: 1px solid #F1F5F9; padding: 1.2rem;
          display: flex; justify-content: space-between; align-items: center; cursor: pointer;
          transition: all 0.2s ease;
        }
        .asso-row-card:hover { border-color: #7C3AED; transform: translateX(5px); background: #FBFBFF; }
        
        .asso-info-main { display: flex; flex-direction: column; gap: 0.2rem; }
        .asso-name { font-weight: 800; color: #1E293B; font-size: 0.95rem; }
        .asso-sub { font-size: 0.7rem; color: #94A3B8; font-weight: 600; }

        .asso-meta { text-align: right; }
        .badge-status { padding: 0.3rem 0.6rem; border-radius: 8px; font-size: 0.6rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.3rem; text-transform: uppercase; }
        .badge-active { background: #DCFCE7; color: #15803D; }
        .badge-inactive { background: #FEE2E2; color: #B91C1C; }

        .sys-error-banner { background: #FEF2F2; color: #DC2626; padding: 1rem; border-radius: 12px; margin-bottom: 2rem; text-align: center; font-weight: 600; border: 1px solid #FEE2E2; }

        .modal-overlay { 
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
          background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 9999;
          padding: 1.5rem; animation: fadeIn 0.3s ease;
        }
        .modal-content { 
          background: white; width: 100%; max-width: 450px; border-radius: 32px; 
          padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative; animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-close { position: absolute; top: 1.2rem; right: 1.2rem; border: none; background: #F1F5F9; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: 800; color: #64748B; }
        
        .modal-header { text-align: center; margin-bottom: 2rem; }
        .modal-title { font-size: 1.5rem; font-weight: 800; color: #1E293B; margin-bottom: 0.5rem; }
        
        .detail-row { display: flex; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid #F1F5F9; }
        .detail-label { font-size: 0.8rem; font-weight: 600; color: #94A3B8; }
        .detail-value { font-size: 0.85rem; font-weight: 700; color: #1E293B; }

        .btn-full { width: 100%; margin-top: 2rem; background: #1E293B; color: white; border: none; height: 50px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-full:hover { background: #0F172A; }

        @keyframes sysin { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      <div className="sys-wrap">
        <header className="sys-header">
          <h1 className="sys-title">Console <span>Grand Chef</span></h1>
          <p className="sys-subtitle">Supervision de la plateforme communautaire</p>
        </header>

        {/* AFFICHAGE DE L'ERREUR SI ELLE EXISTE */}
        {error && <div className="sys-error-banner">⚠️ Erreur : {error}</div>}

        <div className="sys-actions">
          <button className="sys-btn-new" onClick={() => router.push('/system-admin/associations/new')}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Déployer une instance
          </button>
          
          <input 
            className="search-input" 
            placeholder="Rechercher une association..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#94A3B8', fontWeight: 600 }}>Initialisation...</div>
        ) : data ? (
          <>
            <div className="sys-stats-grid">
              <div className="stat-card"><div className="stat-icon">🏢</div><div className="stat-val">{data.stats.totalAssociations}</div><div className="stat-lbl">Instances</div></div>
              <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-val">{data.stats.totalUsers}</div><div className="stat-lbl">Membres</div></div>
              <div className="stat-card"><div className="stat-icon">📡</div><div className="stat-val">{enrichedStats?.totalAntennas}</div><div className="stat-lbl">Antennes</div></div>
              <div className="stat-card"><div className="stat-icon">📊</div><div className="stat-val">{enrichedStats?.avgUsers}</div><div className="stat-lbl">Moyenne</div></div>
              <div className="stat-card"><div className="stat-icon">⚡</div><div className="stat-val">{enrichedStats?.activeRate}</div><div className="stat-lbl">Status</div></div>
              <div className="stat-card"><div className="stat-icon">🛡️</div><div className="stat-val">SaaS</div><div className="stat-lbl">Mode</div></div>
            </div>

            <div className="asso-list-header">
              <h2>Parc des Associations</h2>
            </div>

            <div className="asso-grid">
              {filteredAssociations.map((asso) => (
                <div key={asso.id} className="asso-row-card" onClick={() => setSelectedAsso(asso)}>
                  <div className="asso-info-main">
                    <span className="asso-name">{asso.name}</span>
                    <span className="asso-sub">ID: {asso.code} • {asso._count.users} membres</span>
                  </div>
                  <div className="asso-meta">
                    <span className={`badge-status ${asso.isActive !== false ? 'badge-active' : 'badge-inactive'}`}>
                      {asso.isActive !== false ? 'En ligne' : 'Suspendu'}
                    </span>
                  </div>
                </div>
              ))}
              
              {filteredAssociations.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                  Aucun résultat pour &quot;{search}&quot;
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* MODAL DE DÉTAILS */}
        {selectedAsso && (
          <div className="modal-overlay" onClick={() => setSelectedAsso(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedAsso(null)}>✕</button>
              
              <div className="modal-header">
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏛️</div>
                <h3 className="modal-title">{selectedAsso.name}</h3>
                <span className={`badge-status ${selectedAsso.isActive !== false ? 'badge-active' : 'badge-inactive'}`}>
                   {selectedAsso.isActive !== false ? 'Instance Active' : 'Instance Suspendue'}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Code Identifiant</span>
                <span className="detail-value">{selectedAsso.code}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Sous-domaine</span>
                <span className="detail-value">{selectedAsso.domainName || 'standard.lcd.com'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Utilisateurs</span>
                <span className="detail-value">{selectedAsso._count.users} inscrits</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Antennes</span>
                <span className="detail-value">{selectedAsso._count.antennas} antennes</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date Déploiement</span>
                <span className="detail-value">{formatDate(selectedAsso.createdAt)}</span>
              </div>

              {/* FIX LIGNE 212 : Utilisation de &apos; pour l'apostrophe */}
              <button 
                className="btn-full" 
                onClick={() => router.push(`/system-admin/associations/${selectedAsso.id}`)}
              >
                Gérer l&apos;instance complètement
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
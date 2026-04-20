// web/app/(protected)/admin/elections/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Election } from '../../../../types/election';
import { LiveResults } from '../../../../components/elections/LiveResults';

export default function AdminElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    api.listElectionsAdmin()
      .then(data => {
        if (isMounted) {
          setElections(data);
          if (data.length > 0) {
            setSelectedElectionId(data[0].id);
          }
        }
      })
      .catch(err => console.error("Erreur chargement historique élections:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  return (
    <AppShell title="Historique des Élections">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        
        .el-wrap { padding: clamp(1.25rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; font-family: 'DM Sans', sans-serif; }
        .el-header { margin-bottom: 2rem; opacity: 0; transform: translateY(10px); animation: fadein 0.5s forwards; }
        .el-eyebrow { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem; }
        .el-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; }
        .el-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.6rem, 4vw, 2.2rem); color: #111827; font-weight: 700; margin: 0; }

        .el-grid { display: grid; grid-template-columns: 350px 1fr; gap: 2rem; align-items: start; }
        @media (max-width: 900px) { .el-grid { grid-template-columns: 1fr; } }

        .el-history-list { display: flex; flex-direction: column; gap: 1rem; opacity: 0; transform: translateY(10px); animation: fadein 0.5s 0.1s forwards; }
        .el-card { background: white; border-radius: 18px; border: 1.5px solid #E2E8F0; padding: 1.25rem; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
        .el-card:hover { border-color: #93C5FD; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(37,99,235,0.06); }
        .el-card.active { border-color: #2563EB; background: #EFF6FF; box-shadow: 0 0 0 1px #2563EB inset; }
        
        .el-card-title { font-size: 0.95rem; font-weight: 800; color: #1E3A8A; margin-bottom: 0.4rem; line-height: 1.3; }
        .el-card-desc { font-size: 0.8rem; color: #64748B; margin-bottom: 1rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        .el-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 0.8rem; }
        .el-badge.DRAFT { background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0; }
        .el-badge.OPEN { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
        .el-badge.CLOSED, .el-badge.ARCHIVED { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
        .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }

        .el-live-panel { background: rgba(253,253,255,0.9); backdrop-filter: blur(12px); border-radius: 24px; padding: 2rem; border: 1px solid rgba(37,99,235,0.1); box-shadow: 0 4px 25px rgba(37,99,235,0.05); opacity: 0; animation: fadein 0.5s 0.2s forwards; }
        .el-live-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid #E2E8F0; padding-bottom: 1rem; }
        .el-live-title { font-size: 1rem; font-weight: 800; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
        .el-live-icon { width: 32px; height: 32px; background: #EFF6FF; color: #2563EB; border-radius: 8px; display: flex; align-items: center; justify-content: center; }

        .el-empty { text-align: center; padding: 4rem 1rem; color: #94A3B8; }
        .el-empty svg { margin: 0 auto 1rem; color: #CBD5E1; }
        .el-empty h3 { font-size: 1.1rem; font-weight: 700; color: #475569; margin-bottom: 0.5rem; }

        @keyframes fadein { to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <div className="el-wrap">
        <div className="el-header">
          <div className="el-eyebrow"><div className="el-eyebrow-dot" />Espace Administrateur</div>
          <h1 className="el-title">Historique des Élections</h1>
        </div>

        {loading ? (
          <div className="el-empty">
            <svg className="animate-spin" width="32" height="32" fill="none" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="#2563EB" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Chargement des scrutins...</p>
          </div>
        ) : elections.length === 0 ? (
          <div className="el-empty" style={{ background: 'white', borderRadius: '24px', border: '1px dashed #CBD5E1' }}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3>Aucune élection trouvée</h3>
            {/* ⚡ CORRECTION : Apostrophes échappées */}
            <p style={{ fontSize: '0.85rem' }}>Le bureau exécutif n&apos;a pas encore configuré d&apos;élection pour l&apos;association.</p>
          </div>
        ) : (
          <div className="el-grid">
            
            <div className="el-history-list">
              {elections.map(election => (
                <div 
                  key={election.id} 
                  className={`el-card ${selectedElectionId === election.id ? 'active' : ''}`}
                  onClick={() => setSelectedElectionId(election.id)}
                >
                  <div className={`el-badge ${election.status}`}>
                    {election.status === 'OPEN' && <span className="pulse-dot" />}
                    {election.status === 'OPEN' ? 'En cours' : election.status === 'DRAFT' ? 'À venir' : 'Clôturée'}
                  </div>
                  <h2 className="el-card-title">{election.title}</h2>
                  <p className="el-card-desc">{election.description || "Aucune description fournie pour ce scrutin."}</p>
                  
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: selectedElectionId === election.id ? '#2563EB' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Voir les résultats
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            <div className="el-live-panel">
              <div className="el-live-header">
                <h3 className="el-live-title">
                  <div className="el-live-icon">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  Résultats détaillés
                </h3>
              </div>
              
              {selectedElectionId ? (
                <LiveResults electionId={selectedElectionId} />
              ) : (
                <div className="el-empty">
                  <p>Sélectionnez un scrutin pour afficher les statistiques.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </AppShell>
  );
}
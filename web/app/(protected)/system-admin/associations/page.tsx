// web/app/(protected)/system-admin/associations/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';
import Link from 'next/link';

// Interface stricte pour la sécurité du typage
interface AssociationSummary {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    users: number;
    antennas: number;
  };
}

export default function ManageAssociations() {
  const [associations, setAssociations] = useState<AssociationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    api.getSystemDashboard()
      .then(data => {
        if (mounted) {
          // Utilisation d'un cast "unknown" pour assurer la transition fluide 
          // entre la réponse API et l'interface attendue par le Frontend
          setAssociations(data.associations as unknown as AssociationSummary[]);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  return (
    <AppShell title="Gestion des Instances">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .asso-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; animation: fadeUp 0.4s ease-out; }
        .asso-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
        
        .asso-card { 
          background: white; border-radius: 24px; border: 1px solid #EDE9FE; padding: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden;
          display: flex; flex-direction: column;
        }
        .asso-card:hover { transform: translateY(-5px); border-color: #7C3AED; box-shadow: 0 12px 30px rgba(124,58,237,0.1); }
        
        .asso-badge { position: absolute; top: 1.5rem; right: 1.5rem; padding: 0.3rem 0.8rem; border-radius: 99px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; }
        .badge-active { background: #ECFDF5; color: #059669; }
        .badge-inactive { background: #FEF2F2; color: #DC2626; }

        .asso-name { font-size: 1.25rem; font-weight: 800; color: #111827; margin-bottom: 0.35rem; padding-right: 4.5rem; }
        .asso-code { font-family: monospace; font-size: 0.75rem; color: #7C3AED; font-weight: 700; background: #F5F3FF; padding: 0.2rem 0.5rem; border-radius: 6px; width: fit-content; }

        .asso-stats { display: flex; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #F3F4F6; }
        .stat-item { flex: 1; }
        .stat-val { display: block; font-size: 1.1rem; font-weight: 800; color: #1F2937; }
        .stat-lbl { display: block; font-size: 0.65rem; color: #9CA3AF; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }

        .btn-manage { 
          width: 100%; margin-top: 1.5rem; padding: 0.85rem; border-radius: 12px; border: 1.5px solid #EDE9FE;
          background: #FAF9FF; color: #7C3AED; font-weight: 700; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem; text-decoration: none; font-size: 0.85rem;
        }
        .btn-manage:hover { background: #7C3AED; color: white; border-color: #7C3AED; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="asso-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Instances <span style={{ color: '#7C3AED' }}>Déployées</span>
            </h1>
            <p style={{ color: '#6B7280', fontWeight: 500, marginTop: '0.4rem' }}>
              Visualisez et gérez l&apos;ensemble des associations sur la plateforme.
            </p>
          </div>
          <Link href="/system-admin/associations/new" style={{ 
            padding: '0.8rem 1.6rem', background: '#7C3AED', color: 'white', borderRadius: '14px', 
            fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
            fontSize: '0.9rem', transition: 'all 0.2s'
          }}>
            + Déployer une instance
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '6rem', textAlign: 'center', color: '#7C3AED', fontWeight: 800, fontSize: '1.1rem' }}>
            Chargement du parc applicatif...
          </div>
        ) : (
          <div className="asso-grid">
            {associations.map((asso) => (
              <div key={asso.id} className="asso-card">
                <span className={`asso-badge ${asso.isActive ? 'badge-active' : 'badge-inactive'}`}>
                  {asso.isActive ? 'Opérationnel' : 'Suspendu'}
                </span>
                <div className="asso-name">{asso.name}</div>
                <span className="asso-code">{asso.code}</span>
                
                <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: '#6B7280', fontWeight: 500 }}>
                  Créée le {formatDate(asso.createdAt)}
                </div>

                <div className="asso-stats">
                  <div className="stat-item">
                    <span className="stat-val">{asso._count?.users || 0}</span>
                    <span className="stat-lbl">Membres</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-val">{asso._count?.antennas || 0}</span>
                    <span className="stat-lbl">Antennes</span>
                  </div>
                </div>

                <Link href={`/system-admin/associations/${asso.id}`} className="btn-manage">
                  Configuration de l&apos;instance
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            ))}
            
            {!loading && associations.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '5rem', textAlign: 'center', background: '#F9FAFB', borderRadius: '24px', border: '2px dashed #EDE9FE' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏢</div>
                <h3 style={{ color: '#111827', fontWeight: 800, margin: 0 }}>Aucune instance active</h3>
                <p style={{ color: '#6B7280', marginTop: '0.5rem' }}>Commencez par déployer votre première association cliente.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
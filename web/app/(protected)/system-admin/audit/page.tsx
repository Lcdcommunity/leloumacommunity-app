// web/app/(protected)/system-admin/audit/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  associationName?: string | null;
  details: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: string;
}

export default function SystemAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true); // Initialisé à true pour éviter l'erreur ESLint
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    api.getSystemAuditLogs()
      .then(data => {
        if (mounted) setLogs(data as AuditLog[]);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.userName.toLowerCase().includes(filter.toLowerCase()) ||
    (log.associationName && log.associationName.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <AppShell title="Logs Système">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        .audit-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; animation: auditIn 0.4s ease-out; }
        .audit-header { margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .audit-title { font-size: 2rem; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin: 0; }
        .audit-title span { color: #7C3AED; }
        .audit-search { position: relative; width: 100%; max-width: 400px; }
        .audit-input { width: 100%; height: 44px; padding: 0 1rem 0 2.5rem; border-radius: 12px; border: 1.5px solid #EDE9FE; outline: none; font-weight: 500; transition: all 0.2s; }
        .audit-input:focus { border-color: #7C3AED; box-shadow: 0 0 0 4px rgba(124,58,237,0.1); }
        .search-ico { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; }
        .audit-card { background: white; border-radius: 24px; border: 1px solid #EDE9FE; overflow: hidden; box-shadow: 0 4px 20px rgba(124,58,237,0.05); }
        .audit-table { width: 100%; border-collapse: collapse; text-align: left; }
        .audit-table th { background: #FAF9FF; padding: 1.2rem 1rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #4C1D95; letter-spacing: 0.05em; border-bottom: 1px solid #EDE9FE; }
        .audit-table td { padding: 1.2rem 1rem; border-bottom: 1px solid #F9FAFB; font-size: 0.85rem; color: #374151; vertical-align: middle; }
        .audit-table tr:hover { background: #FDFDFF; }
        .badge-action { padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.7rem; font-weight: 800; background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; }
        .badge-user { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #111827; }
        .badge-user i { width: 28px; height: 28px; border-radius: 8px; background: #EDE9FE; color: #7C3AED; display: flex; align-items: center; justify-content: center; font-style: normal; font-size: 0.75rem; }
        .log-time { color: #6B7280; font-size: 0.8rem; font-weight: 500; }
        .log-ip { font-family: monospace; font-size: 0.75rem; color: #9CA3AF; background: #F3F4F6; padding: 0.2rem 0.4rem; border-radius: 4px; }
        @keyframes auditIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .audit-table thead { display: none; }
          .audit-table tr { display: block; padding: 1rem; border-bottom: 4px solid #F5F3FF; }
          .audit-table td { display: flex; justify-content: space-between; padding: 0.5rem 0; border: none; text-align: right; }
          .audit-table td::before { content: attr(data-label); font-weight: 800; color: #9CA3AF; text-transform: uppercase; font-size: 0.65rem; text-align: left; }
        }
      `}</style>

      <div className="audit-wrap">
        <header className="audit-header">
          <div>
            <h1 className="audit-title">Logs <span>Système</span></h1>
            <p style={{ color: '#6B7280', fontWeight: 500, marginTop: '0.4rem' }}>
              Surveillance de l&apos;activité globale de la plateforme.
            </p>
          </div>
          
          <div className="audit-search">
            <span className="search-ico">🔍</span>
            <input 
              className="audit-input" 
              placeholder="Rechercher une action, un utilisateur..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </header>

        <div className="audit-card">
          {loading ? (
            <div style={{ padding: '5rem', textAlign: 'center', color: '#7C3AED', fontWeight: 700 }}>Analyse des journaux système...</div>
          ) : (
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Date & Heure</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Cible / Instance</th>
                  <th>Adresse IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td data-label="Date & Heure" className="log-time">{formatDate(log.createdAt)}</td>
                    <td data-label="Utilisateur">
                      <div className="badge-user">
                        <i>{log.userName?.charAt(0) || 'U'}</i>
                        {log.userName}
                      </div>
                    </td>
                    <td data-label="Action">
                      <span className="badge-action">{log.action.replace(/_/g, ' ')}</span>
                    </td>
                    <td data-label="Cible / Instance">
                      <div style={{ fontWeight: 600 }}>{log.entity}</div>
                      <div style={{ fontSize: '0.75rem', color: '#7C3AED' }}>{log.associationName || 'Système'}</div>
                    </td>
                    <td data-label="Adresse IP">
                      <span className="log-ip">{log.ipAddress || 'Interne'}</span>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: '#9CA3AF' }}>
                      Aucun log correspondant à votre recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
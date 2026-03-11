// web/app/(protected)/admin/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { NotificationItem } from '../../../../types/notification';
import { formatDate } from '../../../../lib/format';

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.listNotifications();
        setItems(res?.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell title="Notifications">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .nt-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 900px; margin: 0 auto;
        }

        .nt-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: ntin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .nt-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .nt-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: ntpulse 2s ease-in-out infinite; }
        @keyframes ntpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .nt-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }

        .nt-panel {
          background: rgba(253,253,255,0.93);
          backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(10px);
          animation: ntin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }

        .nt-list { display: flex; flex-direction: column; }
        .nt-item {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(37,99,235,0.06);
          display: flex; gap: 1rem; align-items: flex-start;
          transition: background 0.2s;
        }
        .nt-item:last-child { border-bottom: none; }
        .nt-item:hover { background: rgba(37,99,235,0.02); }
        .nt-item.unread { background: rgba(239,246,255,0.4); }

        .nt-icon {
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .nt-icon.unread { background: #DBEAFE; color: #1D4ED8; box-shadow: 0 0 0 4px #EFF6FF; }
        .nt-icon.read { background: #F3F4F6; color: #6B7280; }

        .nt-content { flex: 1; min-width: 0; }
        .nt-message { font-size: 0.85rem; color: #111827; line-height: 1.5; margin-bottom: 0.3rem; font-weight: 500; }
        .nt-date { font-size: 0.72rem; color: #6B7280; }

        .nt-empty { padding: 4rem 1rem; text-align: center; color: #9CA3AF; }
        .nt-empty svg { margin: 0 auto 0.75rem; color: #D1D5DB; }

        @keyframes ntin { to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="nt-wrap">
        <div className="nt-header">
          <div className="nt-eyebrow"><div className="nt-eyebrow-dot" />Admin antenne</div>
          <h1 className="nt-title">Vos notifications</h1>
        </div>

        <div className="nt-panel">
          {error && <div style={{ padding: '1rem', color: '#B91C1C', background: '#FEF2F2' }}>{error}</div>}
          
          {loading ? (
             <div className="nt-empty">Chargement...</div>
          ) : items.length === 0 ? (
            <div className="nt-empty">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4B5563' }}>Vous êtes à jour</p>
              <p style={{ fontSize: '0.8rem' }}>Aucune notification pour le moment.</p>
            </div>
          ) : (
            <div className="nt-list">
              {items.map((n) => (
                <div key={n.id} className={`nt-item ${!n.isRead ? 'unread' : ''}`}>
                  <div className={`nt-icon ${!n.isRead ? 'unread' : 'read'}`}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                  </div>
                  <div className="nt-content">
                    <p className="nt-message" style={{ fontWeight: !n.isRead ? 600 : 400 }}>{n.message}</p>
                    <span className="nt-date">{formatDate(n.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
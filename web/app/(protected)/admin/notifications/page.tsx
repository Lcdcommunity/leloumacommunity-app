// web/app/(protected)/admin/notifications/page.tsx
// web/app/(protected)/admin/notifications/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { NotificationItem } from '../../../../types/notification';
import { formatDate } from '../../../../lib/format';

// --- Helper pour mapper les types aux couleurs/icônes ---
function getNotificationStyle(type?: string | null) {
  switch (type) {
    case 'SYSTEM_ALERT':
      return { bg: '#FEF2F2', color: '#DC2626', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' };
    case 'PROJECT_UPDATE':
      return { bg: '#ECFDF5', color: '#059669', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' };
    case 'CONTRIBUTION':
      return { bg: '#FFFBEB', color: '#D97706', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
    default:
      return { bg: '#EFF6FF', color: '#2563EB', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' };
  }
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 👇 CORRECTION API : Retour au bon endpoint (listNotifications tape sur /notifications)
      const res = await api.listNotifications();
      const data = Array.isArray(res) ? res : (res?.items || []);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkAsRead = async (id: string) => {
    try {
      // Optimistic UI update
      setItems(items.map(n => n.id === id ? { ...n, isRead: true } : n));
      await api.markNotificationRead(id);
    } catch (err) {
      // 👇 CORRECTION ESLINT : Utilisation de la variable err
      console.error("Erreur marquage notification :", err);
      // Rollback on fail
      void load();
      alert("Erreur lors de la mise à jour.");
    }
  };

  const markAllAsRead = async () => {
    const unread = items.filter(i => !i.isRead);
    if (unread.length === 0) return;
    
    for (const item of unread) {
      await handleMarkAsRead(item.id);
    }
  };

  const displayedItems = items.filter(i => filter === 'ALL' || !i.isRead);
  const unreadCount = items.filter(i => !i.isRead).length;

  return (
    <AppShell title="Notifications">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .nt-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1000px; margin: 0 auto;
        }

        /* En-tête */
        .nt-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 2rem;
          opacity: 0; transform: translateY(10px);
          animation: ntin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .nt-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .nt-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: ntpulse 2s ease-in-out infinite; }
        @keyframes ntpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        
        .nt-title-group { display: flex; align-items: center; gap: 1rem; }
        .nt-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.8rem, 4vw, 2.2rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1; margin: 0; }
        .nt-badge { background: #EF4444; color: white; font-size: 0.8rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 99px; }

        /* Actions et Filtres */
        .nt-toolbar {
          display: flex; gap: 1rem; align-items: center;
        }
        .nt-filter-btn {
          background: none; border: none; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 600; color: #6B7280; padding: 0.5rem 1rem; border-radius: 99px; cursor: pointer; transition: all 0.2s;
        }
        .nt-filter-btn:hover { color: #111827; background: #F3F4F6; }
        .nt-filter-btn.active { background: #111827; color: white; }
        
        .nt-mark-all {
          font-size: 0.75rem; font-weight: 600; color: #2563EB; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 0.5rem 1rem; border-radius: 99px; cursor: pointer; transition: all 0.2s;
        }
        .nt-mark-all:hover:not(:disabled) { background: #DBEAFE; }
        .nt-mark-all:disabled { opacity: 0.5; cursor: not-allowed; color: #9CA3AF; border-color: #E5E7EB; background: #F9FAFB; }

        /* Liste principale */
        .nt-panel {
          background: rgba(253,253,255,0.93);
          backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 4px 20px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(10px);
          animation: ntin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }

        .nt-list { display: flex; flex-direction: column; }
        
        .nt-item {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(37,99,235,0.06);
          display: flex; gap: 1.25rem; align-items: flex-start;
          transition: all 0.2s; position: relative;
        }
        .nt-item:last-child { border-bottom: none; }
        .nt-item:hover { background: rgba(37,99,235,0.015); }
        .nt-item.unread { background: #F8FAFC; }

        /* Point d'alerte non lu */
        .nt-unread-dot {
          position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #3B82F6;
        }

        /* Icône dynamique */
        .nt-icon {
          width: 46px; height: 46px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .nt-content { flex: 1; min-width: 0; padding-top: 0.2rem; }
        .nt-message { font-size: 0.95rem; color: #111827; line-height: 1.5; margin-bottom: 0.4rem; font-weight: 500; }
        .nt-message.unread { font-weight: 700; }
        
        .nt-meta { display: flex; align-items: center; gap: 1rem; font-size: 0.75rem; color: #6B7280; font-weight: 500; }
        .nt-type { text-transform: uppercase; letter-spacing: 0.05em; }

        .nt-action {
          opacity: 0; transition: opacity 0.2s;
        }
        .nt-item:hover .nt-action { opacity: 1; }
        
        .nt-read-btn {
          width: 36px; height: 36px; border-radius: 50%; border: 1px solid #E5E7EB; background: white; color: #6B7280; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
        }
        .nt-read-btn:hover { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }

        .nt-empty { padding: 5rem 1rem; text-align: center; color: #9CA3AF; }
        .nt-empty svg { margin: 0 auto 1rem; color: #D1D5DB; }

        @keyframes ntin { to { opacity:1; transform:translateY(0); } }
        
        /* Responsive */
        @media (max-width: 640px) {
          .nt-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
          .nt-toolbar { width: 100%; justify-content: space-between; }
          .nt-action { opacity: 1; }
        }
      `}</style>

      <div className="nt-wrap">
        <div className="nt-header">
          <div>
            <div className="nt-eyebrow"><div className="nt-eyebrow-dot" />Boîte de réception</div>
            <div className="nt-title-group">
              <h1 className="nt-title">Notifications</h1>
              {unreadCount > 0 && <span className="nt-badge">{unreadCount}</span>}
            </div>
          </div>

          <div className="nt-toolbar">
            <div style={{ background: '#F9FAFB', padding: '0.25rem', borderRadius: '99px', display: 'flex' }}>
              <button 
                className={`nt-filter-btn ${filter === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilter('ALL')}
              >
                Toutes
              </button>
              <button 
                className={`nt-filter-btn ${filter === 'UNREAD' ? 'active' : ''}`}
                onClick={() => setFilter('UNREAD')}
              >
                Non lues
              </button>
            </div>
            <button 
              className="nt-mark-all" 
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || loading}
            >
              Tout marquer comme lu
            </button>
          </div>
        </div>

        <div className="nt-panel">
          {error && (
            <div style={{ padding: '1.5rem', color: '#B91C1C', background: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          
          {loading ? (
             <div className="nt-empty">
               <svg width="40" height="40" className="animate-spin" style={{ color: '#2563EB' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Chargement de vos notifications...
             </div>
          ) : displayedItems.length === 0 ? (
            <div className="nt-empty">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
              </svg>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#374151', margin: '0.5rem 0' }}>
                {filter === 'UNREAD' ? "Vous avez tout lu !" : "Boîte de réception vide"}
              </p>
              <p style={{ fontSize: '0.85rem' }}>Aucune notification à afficher pour le moment.</p>
            </div>
          ) : (
            <div className="nt-list">
              {displayedItems.map((n) => {
                const style = getNotificationStyle(n.type);
                
                return (
                  <div key={n.id} className={`nt-item ${!n.isRead ? 'unread' : ''}`}>
                    {!n.isRead && <div className="nt-unread-dot" />}
                    
                    <div className="nt-icon" style={{ background: style.bg, color: style.color }}>
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d={style.icon} />
                      </svg>
                    </div>
                    
                    <div className="nt-content">
                      <p className={`nt-message ${!n.isRead ? 'unread' : ''}`}>{n.message}</p>
                      <div className="nt-meta">
                        <span className="nt-type" style={{ color: style.color }}>{n.type?.replace('_', ' ') || 'Notification'}</span>
                        <span>•</span>
                        <span>{formatDate(n.createdAt)}</span>
                      </div>
                    </div>
                    
                    {!n.isRead && (
                      <div className="nt-action">
                        <button 
                          className="nt-read-btn" 
                          onClick={() => handleMarkAsRead(n.id)}
                          title="Marquer comme lu"
                        >
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
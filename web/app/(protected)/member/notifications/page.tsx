// web/app/(protected)/member/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { NotificationItem } from '../../../../types/notification';
import { formatDate } from '../../../../lib/format';

export default function MemberNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  async function load() {
    setError(null);
    try {
      const res = await api.listMyNotifications();
      setItems(res?.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement notifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleMarkRead(id: string) {
    setBusyId(id);
    try {
      await api.markNotificationRead(id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    const unread = items.filter(n => !n.isRead);
    for (const n of unread) {
      await api.markNotificationRead(n.id);
    }
    await load();
  }

  const unreadCount = items.filter(n => !n.isRead).length;
  const filtered = items.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  return (
    <AppShell title="Notifications">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .mn-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 860px; margin: 0 auto;
        }

        /* Header */
        .mn-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          flex-wrap: wrap; gap: 1rem; margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: mnin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mn-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .mn-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: mnpulse 2s ease-in-out infinite; }
        @keyframes mnpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .mn-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .mn-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        .mn-unread-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 22px; height: 22px; padding: 0 0.45rem;
          background: #EF4444; color: white; border-radius: 99px;
          font-size: 0.65rem; font-weight: 800; margin-left: 0.5rem;
          animation: mnpop 0.4s cubic-bezier(.22,1,.36,1);
        }
        @keyframes mnpop { from{opacity:0;transform:scale(.4);} to{opacity:1;transform:scale(1);} }

        .mn-markall-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          height: 38px; padding: 0 1rem;
          background: #EFF6FF; color: #1D4ED8;
          border: 1.5px solid #BFDBFE; border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.76rem; font-weight: 700; cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
          white-space: nowrap;
        }
        .mn-markall-btn:hover:not(:disabled) { background: #DBEAFE; border-color: #2563EB; transform: translateY(-1px); }
        .mn-markall-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* Filter tabs */
        .mn-filters {
          display: flex; gap: 0.4rem; flex-wrap: wrap;
          margin-bottom: 1.1rem;
          opacity: 0; transform: translateY(10px);
          animation: mnin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mn-tab {
          height: 36px; padding: 0 0.95rem;
          border-radius: 99px; border: 1.5px solid rgba(37,99,235,0.13);
          background: rgba(255,255,255,0.85); cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem; font-weight: 600; color: #374151;
          transition: all 0.2s; white-space: nowrap;
          display: flex; align-items: center; gap: 0.35rem;
        }
        .mn-tab:hover { border-color: rgba(37,99,235,0.35); background: #EFF6FF; color: #1D4ED8; }
        .mn-tab.active { background: #EFF6FF; border-color: #2563EB; color: #1D4ED8; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .mn-tab-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; padding: 0 0.32rem;
          border-radius: 99px; font-size: 0.6rem; font-weight: 800;
        }

        /* Error */
        .mn-error { display: flex; align-items: center; gap: 0.6rem; padding: 1rem; color: #B91C1C; font-size: 0.8rem; background: #FEF2F2; border-radius: 12px; border: 1px solid #FECACA; margin-bottom: 1rem; }

        /* Loader */
        .mn-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; }
        .mn-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: mnspin 0.8s linear infinite; }
        @keyframes mnspin { to { transform: rotate(360deg); } }

        /* Empty */
        .mn-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3.5rem 1rem; gap: 0.8rem; color: #9CA3AF; }
        .mn-empty-ico { width: 54px; height: 54px; border-radius: 50%; background: #F9FAFB; border: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; }
        .mn-empty p { font-size: 0.82rem; font-weight: 500; }

        /* Panel */
        .mn-panel {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(10px);
          animation: mnin 0.5s 0.15s cubic-bezier(.22,1,.36,1) forwards;
        }

        /* Notification row */
        .mn-item {
          display: flex; align-items: flex-start; gap: 0.85rem;
          padding: clamp(0.85rem, 2.5%, 1.1rem) clamp(1rem, 3%, 1.3rem);
          border-bottom: 1px solid rgba(37,99,235,0.05);
          transition: background 0.15s;
          position: relative;
        }
        .mn-item:last-child { border-bottom: none; }
        .mn-item.unread { background: rgba(239,246,255,0.55); }
        .mn-item.unread:hover { background: rgba(219,234,254,0.5); }
        .mn-item.read:hover { background: rgba(37,99,235,0.018); }

        /* Unread dot */
        .mn-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #3B82F6; flex-shrink: 0; margin-top: 6px;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
        }
        .mn-dot-placeholder { width: 8px; flex-shrink: 0; }

        /* Icon */
        .mn-icon-wrap {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }

        /* Content */
        .mn-content { flex: 1; min-width: 0; }
        .mn-message {
          font-size: 0.84rem; color: #111827; line-height: 1.55;
          font-weight: 500; word-break: break-word;
        }
        .mn-item.read .mn-message { color: #6B7280; font-weight: 400; }
        .mn-meta {
          display: flex; align-items: center; gap: 0.6rem;
          margin-top: 0.35rem; flex-wrap: wrap;
        }
        .mn-date { font-size: 0.68rem; color: #9CA3AF; display: flex; align-items: center; gap: 0.25rem; }
        .mn-status-pill {
          display: inline-flex; align-items: center; gap: 0.22rem;
          font-size: 0.6rem; font-weight: 700; border-radius: 99px;
          padding: 0.15rem 0.5rem; border: 1px solid;
        }

        /* Action */
        .mn-action { flex-shrink: 0; }
        .mn-read-btn {
          height: 32px; padding: 0 0.8rem;
          background: none; border: 1.5px solid rgba(37,99,235,0.2);
          border-radius: 8px; cursor: pointer; color: #2563EB;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.7rem; font-weight: 700;
          display: flex; align-items: center; gap: 0.3rem;
          transition: all 0.2s; white-space: nowrap;
        }
        .mn-read-btn:hover:not(:disabled) { background: #EFF6FF; border-color: #2563EB; }
        .mn-read-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .mn-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(37,99,235,0.2);
          border-top-color: #2563EB; border-radius: 50%;
          animation: mnspin 0.7s linear infinite;
        }

        @keyframes mnin { to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 500px) {
          .mn-item { gap: 0.6rem; }
          .mn-icon-wrap { display: none; }
          .mn-read-btn span { display: none; }
          .mn-read-btn { padding: 0 0.6rem; }
        }
      `}</style>

      <div className="mn-wrap">

        {/* Header */}
        <div className="mn-header">
          <div>
            <div className="mn-eyebrow"><div className="mn-eyebrow-dot" />Espace membre</div>
            <h1 className="mn-title">
              Mes <span>notifications</span>
              {unreadCount > 0 && <span className="mn-unread-badge">{unreadCount}</span>}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button
              className="mn-markall-btn"
              onClick={() => void handleMarkAllRead()}
              disabled={loading}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="mn-filters">
          {([
            { key: 'all',    label: 'Toutes',   count: items.length },
            { key: 'unread', label: 'Non lues', count: items.filter(n => !n.isRead).length },
            { key: 'read',   label: 'Lues',     count: items.filter(n => n.isRead).length },
          ] as const).map(tab => (
            <button
              key={tab.key}
              className={`mn-tab${filter === tab.key ? ' active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span
                className="mn-tab-count"
                style={{
                  background: filter === tab.key ? '#BFDBFE' : '#F3F4F6',
                  color: filter === tab.key ? '#1D4ED8' : '#6B7280',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mn-error">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* Panel */}
        <div className="mn-panel">
          {loading ? (
            <div className="mn-loader"><div className="mn-ring" />Chargement&#8230;</div>
          ) : filtered.length === 0 ? (
            <div className="mn-empty">
              <div className="mn-empty-ico">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
              </div>
              <p>
                {filter === 'unread' ? 'Aucune notification non lue' :
                 filter === 'read'   ? 'Aucune notification lue' :
                 'Aucune notification'}
              </p>
            </div>
          ) : (
            filtered.map((n, i) => (
              <div
                key={n.id}
                className={`mn-item${n.isRead ? ' read' : ' unread'}`}
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                {/* Unread dot */}
                {n.isRead
                  ? <div className="mn-dot-placeholder" />
                  : <div className="mn-dot" />
                }

                {/* Icon */}
                <div
                  className="mn-icon-wrap"
                  style={{
                    background: n.isRead ? '#F3F4F6' : '#EFF6FF',
                    color: n.isRead ? '#9CA3AF' : '#2563EB',
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                </div>

                {/* Content */}
                <div className="mn-content">
                  <p className="mn-message">{n.message}</p>
                  <div className="mn-meta">
                    <span className="mn-date">
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
                      </svg>
                      {formatDate(n.createdAt)}
                    </span>
                    <span
                      className="mn-status-pill"
                      style={n.isRead
                        ? { color: '#6B7280', background: '#F3F4F6', borderColor: '#E5E7EB' }
                        : { color: '#1D4ED8', background: '#EFF6FF', borderColor: '#BFDBFE' }
                      }
                    >
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }} />
                      {n.isRead ? 'Lue' : 'Non lue'}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="mn-action">
                  {!n.isRead && (
                    <button
                      className="mn-read-btn"
                      disabled={busyId === n.id}
                      onClick={() => void handleMarkRead(n.id)}
                    >
                      {busyId === n.id
                        ? <div className="mn-spinner" />
                        : (
                          <>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                            <span>Marquer lue</span>
                          </>
                        )
                      }
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </AppShell>
  );
}
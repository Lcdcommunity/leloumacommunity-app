//web/components/layout/Topbar.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import { logout } from '../../lib/auth';
import type { UserRole } from '../../types/user';

// Résout les routes selon le rôle
function resolveRoutes(role: UserRole | null) {
  if (role === 'SUPER_ADMIN')   return { notifications: '/super-admin/notifications', profile: '/super-admin/settings' };
  if (role === 'ANTENNA_ADMIN') return { notifications: '/admin/notifications',       profile: '/admin/settings' };
  return                               { notifications: '/member/notifications',       profile: '/member/profile' };
}

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const me = await api.me();
        if (mounted) setRole(me.role);
      } catch { /* non connecté — le redirect sera géré par le middleware */ }
    })();
    return () => { mounted = false; };
  }, []);

  const routes = resolveRoutes(role);

  async function handleLogout() {
    await logout(false);
    router.replace('/login');
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .topbar {
          height: 58px;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(37,99,235,0.08);
          box-shadow: 0 1px 10px rgba(37,99,235,0.05);
          display: flex; align-items: center;
          padding: 0 clamp(1rem, 2.5vw, 1.5rem);
          gap: 0.75rem;
          position: sticky; top: 0; z-index: 40;
          font-family: 'DM Sans', sans-serif;
        }

        .topbar-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1rem, 2vw, 1.2rem);
          font-weight: 500; color: #111827;
          letter-spacing: -0.01em; flex: 1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin: 0;
        }

        .topbar-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }

        .tb-icon-btn {
          position: relative; width: 36px; height: 36px; border-radius: 9px;
          border: 1px solid rgba(37,99,235,0.12); background: rgba(249,250,251,0.8);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6B7280; transition: all 0.18s;
        }
        .tb-icon-btn:hover { background: #EFF6FF; border-color: rgba(37,99,235,0.3); color: #2563EB; transform: translateY(-1px); box-shadow: 0 3px 10px rgba(37,99,235,0.1); }

        .tb-notif-dot {
          position: absolute; top: 6px; right: 6px; width: 7px; height: 7px;
          border-radius: 50%; background: #EF4444; border: 1.5px solid white;
          animation: tbdot 2s ease-in-out infinite;
        }
        @keyframes tbdot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.6;transform:scale(.8);} }

        .tb-sep { width: 1px; height: 20px; background: rgba(37,99,235,0.09); }

        .tb-profile-btn {
          height: 36px; padding: 0 0.9rem; border-radius: 9px;
          border: 1px solid rgba(37,99,235,0.13); background: rgba(249,250,251,0.8);
          display: flex; align-items: center; gap: 0.4rem; cursor: pointer; color: #374151;
          font-family: 'DM Sans', sans-serif; font-size: 0.76rem; font-weight: 600;
          transition: all 0.18s; white-space: nowrap;
        }
        .tb-profile-btn:hover { background: #EFF6FF; border-color: rgba(37,99,235,0.3); color: #1D4ED8; transform: translateY(-1px); box-shadow: 0 3px 10px rgba(37,99,235,0.1); }

        .tb-logout-btn {
          height: 36px; padding: 0 0.9rem; border-radius: 9px;
          border: 1px solid rgba(220,38,38,0.15); background: rgba(254,242,242,0.6);
          display: flex; align-items: center; gap: 0.38rem; cursor: pointer; color: #DC2626;
          font-family: 'DM Sans', sans-serif; font-size: 0.76rem; font-weight: 700;
          transition: all 0.18s; white-space: nowrap;
        }
        .tb-logout-btn:hover { background: #FEE2E2; border-color: rgba(220,38,38,0.35); transform: translateY(-1px); box-shadow: 0 3px 12px rgba(220,38,38,0.14); }

        .tb-label { display: inline; }
        @media (max-width: 580px) {
          .tb-label { display: none; }
          .tb-profile-btn, .tb-logout-btn { padding: 0 0.6rem; }
        }
      `}</style>

      <header className="topbar">
        <h1 className="topbar-title">{title}</h1>
        <div className="topbar-actions">

          <button className="tb-icon-btn" title="Notifications" onClick={() => router.push(routes.notifications)}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <span className="tb-notif-dot" />
          </button>

          <div className="tb-sep" />

          <button className="tb-profile-btn" onClick={() => router.push(routes.profile)}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span className="tb-label">Mon profil</span>
          </button>

          <button className="tb-logout-btn" onClick={handleLogout}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span className="tb-label">D&eacute;connexion</span>
          </button>
        </div>
      </header>
    </>
  );
}
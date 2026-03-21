// web/components/layout/Topbar.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../../lib/api-client';
import { logout } from '../../lib/auth';
import type { UserRole } from '../../types/user';

function resolveRoutes(role: UserRole | null) {
  if (role === 'SUPER_ADMIN')   return { notifications: '/super-admin/notifications', profile: '/super-admin/settings' };
  if (role === 'ANTENNA_ADMIN') return { notifications: '/admin/notifications',       profile: '/admin/profile' }; // ← MODIFIÉ ICI
  return                               { notifications: '/member/notifications',       profile: '/member/profile' };
}

// Raccourcit le titre pour mobile (supprime la partie après "·" si trop long)
function mobileTitle(title: string): string {
  const parts = title.split('·');
  return parts[0].trim();
}

// Extrait les initiales du prénom/nom
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; gradient: string }> = {
  SUPER_ADMIN:   { label: 'Super Admin',   color: '#B91C1C', bg: '#FEF2F2', gradient: 'linear-gradient(135deg,#B91C1C,#EF4444)' },
  ANTENNA_ADMIN: { label: 'Administrateur',color: '#1D4ED8', bg: '#EFF6FF', gradient: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' },
  MEMBER:        { label: 'Membre',        color: '#065F46', bg: '#ECFDF5', gradient: 'linear-gradient(135deg,#065F46,#10B981)' },
};

export function Topbar({ title }: { title: string }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [role, setRole]       = useState<UserRole | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const me = await api.me();
        if (mounted) {
          setRole(me.role);
          setFirstName(me.firstName ?? '');
          setLastName(me.lastName ?? '');
        }
      } catch { /* non connecté */ }
    })();
    return () => { mounted = false; };
  }, []);

  const routes = resolveRoutes(role);
  const meta   = ROLE_META[role ?? 'MEMBER'] ?? ROLE_META['MEMBER'];
  const initials = getInitials(`${firstName} ${lastName}`) || '?';
  const shortTitle = mobileTitle(title);

  async function handleLogout() {
    await logout(false);
    router.replace('/login');
  }

  // Détermine si on est sur la page "racine" du rôle (dashboard)
  const isRoot = pathname === '/member' || pathname === '/admin' || pathname === '/super-admin';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* ═══════════════════════════════════════
           DESKTOP TOPBAR (inchangée)
        ═══════════════════════════════════════ */
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
        .topbar-actions {
          display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;
        }
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
        .tb-profile-btn:hover { background: #EFF6FF; border-color: rgba(37,99,235,0.3); color: #1D4ED8; transform: translateY(-1px); }
        .tb-logout-btn {
          height: 36px; padding: 0 0.9rem; border-radius: 9px;
          border: 1px solid rgba(220,38,38,0.15); background: rgba(254,242,242,0.6);
          display: flex; align-items: center; gap: 0.38rem; cursor: pointer; color: #DC2626;
          font-family: 'DM Sans', sans-serif; font-size: 0.76rem; font-weight: 700;
          transition: all 0.18s; white-space: nowrap;
        }
        .tb-logout-btn:hover { background: #FEE2E2; border-color: rgba(220,38,38,0.35); transform: translateY(-1px); }
        .tb-label { display: inline; }

        /* ═══════════════════════════════════════
           MOBILE : masque la topbar desktop
           et affiche la mobile bar
        ═══════════════════════════════════════ */
        .mobile-topbar { display: none; }

        @media (max-width: 768px) {
          /* Cache la topbar desktop */
          .topbar { display: none; }
          .topbar-actions { display: none; }

          /* Affiche la mobile topbar */
          .mobile-topbar {
            display: flex;
            flex-direction: column;
            position: sticky; top: 0; z-index: 40;
            font-family: 'DM Sans', sans-serif;
          }
        }

        /* ── Mobile topbar : bande principale ── */
        .mtb-main {
          height: 60px;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 1px 12px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          padding: 0 1rem;
          gap: 0.75rem;
        }

        /* Avatar cliquable */
        .mtb-avatar {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 800; color: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transition: transform 0.15s, box-shadow 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .mtb-avatar:active { transform: scale(0.92); }

        /* Titre + breadcrumb */
        .mtb-title-block { flex: 1; min-width: 0; }
        .mtb-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem; font-weight: 600; color: #111827;
          letter-spacing: -0.01em; line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin: 0;
        }
        .mtb-role-pill {
          display: inline-flex; align-items: center; gap: 0.28rem;
          font-size: 0.56rem; font-weight: 800;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 0.1rem 0.45rem; border-radius: 99px;
          margin-top: 1px;
        }
        .mtb-role-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: currentColor; flex-shrink: 0;
        }

        /* Actions droite */
        .mtb-actions { display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0; }

        .mtb-icon-btn {
          position: relative;
          width: 38px; height: 38px; border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(249,250,251,0.9);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6B7280;
          transition: background 0.15s, transform 0.12s;
          -webkit-tap-highlight-color: transparent;
        }
        .mtb-icon-btn:active { transform: scale(0.9); background: #F3F4F6; }

        .mtb-notif-badge {
          position: absolute; top: 5px; right: 5px;
          width: 8px; height: 8px; border-radius: 50%;
          background: #EF4444; border: 1.5px solid white;
          animation: mtbdot 2.5s ease-in-out infinite;
        }
        @keyframes mtbdot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.75)} }

        /* ── Bande contextuelle (sous la main) ──
           Affichée seulement sur le dashboard (page racine)
        ── */
        .mtb-context {
          background: linear-gradient(135deg, var(--mtb-g1), var(--mtb-g2));
          padding: 0.55rem 1rem;
          display: flex; align-items: center; justify-content: space-between;
          gap: 0.5rem;
        }
        .mtb-greeting {
          font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.92);
          line-height: 1.3;
        }
        .mtb-greeting strong { color: white; font-weight: 800; }
        .mtb-date-chip {
          font-size: 0.62rem; font-weight: 600;
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 99px; padding: 0.22rem 0.6rem;
          white-space: nowrap; flex-shrink: 0;
        }
      `}</style>

      {/* ── Desktop topbar (cachée sur mobile) ── */}
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
            <span className="tb-label">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* ── Mobile topbar ── */}
      <div
        className="mobile-topbar"
        style={{
          '--mtb-g1': meta.gradient.includes('#B91C1C') ? '#B91C1C' : meta.gradient.includes('#065F46') ? '#065F46' : '#1D4ED8',
          '--mtb-g2': meta.gradient.includes('#EF4444') ? '#EF4444' : meta.gradient.includes('#10B981') ? '#10B981' : '#3B82F6',
        } as React.CSSProperties}
      >
        {/* Bande principale */}
        <div className="mtb-main">
          {/* Avatar → profil */}
          <div
            className="mtb-avatar"
            style={{ background: meta.gradient }}
            onClick={() => router.push(routes.profile)}
            role="button"
            tabIndex={0}
            aria-label="Mon profil"
          >
            {initials}
          </div>

          {/* Titre + rôle */}
          <div className="mtb-title-block">
            <h1 className="mtb-title">{shortTitle}</h1>
            <div
              className="mtb-role-pill"
              style={{ background: meta.bg, color: meta.color }}
            >
              <span className="mtb-role-dot" />
              {meta.label}
            </div>
          </div>

          {/* Actions */}
          <div className="mtb-actions">
            {/* Notifications */}
            <button
              className="mtb-icon-btn"
              onClick={() => router.push(routes.notifications)}
              aria-label="Notifications"
            >
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span className="mtb-notif-badge" />
            </button>
          </div>
        </div>

        {/* Bande contextuelle — seulement sur le dashboard */}
        {isRoot && firstName && (
          <div className="mtb-context">
            <div className="mtb-greeting">
              Bonjour, <strong>{firstName}</strong> 👋
            </div>
            <div className="mtb-date-chip">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
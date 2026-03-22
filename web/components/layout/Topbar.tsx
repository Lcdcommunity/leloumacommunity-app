'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../../lib/api-client';
import type { UserRole } from '../../types/user';

function resolveRoutes(role: UserRole | null) {
  if (role === 'SUPER_ADMIN')   return { notifications: '/super-admin/notifications', profile: '/super-admin/settings' };
  if (role === 'ANTENNA_ADMIN') return { notifications: '/admin/notifications',       profile: '/admin/profile' };
  return                               { notifications: '/member/notifications',       profile: '/member/profile' };
}

function mobileTitle(title: string): string {
  return title.split('·')[0].trim();
}

function getInitials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?';
}

/**
 * Couleurs par rôle :
 *  SUPER_ADMIN   → rouge doux (non agressif)
 *  ANTENNA_ADMIN → bleu ciel
 *  MEMBER        → vert
 */
const ROLE_META = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    accent: '#C0392B',
    onlineColor: '#E74C3C',
    gradient: 'linear-gradient(135deg,#C0392B,#E74C3C)',
    topbarBg: 'rgba(255,249,248,0.96)',
    borderColor: 'rgba(192,57,43,0.10)',
    shadow: 'rgba(192,57,43,0.06)',
    pillBg: '#FDF3F2',
    pillText: '#C0392B',
  },
  ANTENNA_ADMIN: {
    label: 'Administrateur',
    accent: '#2980B9',
    onlineColor: '#3498DB',
    gradient: 'linear-gradient(135deg,#2980B9,#5DADE2)',
    topbarBg: 'rgba(240,249,255,0.96)',
    borderColor: 'rgba(41,128,185,0.10)',
    shadow: 'rgba(41,128,185,0.06)',
    pillBg: '#E8F6FD',
    pillText: '#2980B9',
  },
  MEMBER: {
    label: 'Membre',
    accent: '#27AE60',
    onlineColor: '#2ECC71',
    gradient: 'linear-gradient(135deg,#27AE60,#52D48A)',
    topbarBg: 'rgba(240,253,246,0.96)',
    borderColor: 'rgba(39,174,96,0.10)',
    shadow: 'rgba(39,174,96,0.06)',
    pillBg: '#E8F8EF',
    pillText: '#27AE60',
  },
} as const;

type RoleKey = keyof typeof ROLE_META;

export function Topbar({ title }: { title: string }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [role,      setRole]      = useState<UserRole | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  /** Photo de profil — remplie depuis api.me() dès que le backend retourne avatarUrl */
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const me = await api.me();
        if (mounted) {
          setRole(me.role);
          setFirstName(me.firstName ?? '');
          setLastName(me.lastName ?? '');
          setAvatarUrl(me.avatarUrl ?? null);
        }
      } catch { /* non connecté */ }
    })();
    return () => { mounted = false; };
  }, []);

  const routes   = resolveRoutes(role);
  const meta     = ROLE_META[(role as RoleKey) ?? 'ANTENNA_ADMIN'] ?? ROLE_META.ANTENNA_ADMIN;
  const initials = getInitials(firstName, lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || '…';
  const shortTitle = mobileTitle(title);
  const isRoot = pathname === '/member' || pathname === '/admin' || pathname === '/super-admin';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* ══════════════════════════════════
           DESKTOP TOPBAR
        ══════════════════════════════════ */
        .topbar {
          height: 58px;
          background: ${meta.topbarBg};
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid ${meta.borderColor};
          box-shadow: 0 1px 12px ${meta.shadow};
          display: flex;
          align-items: center;
          padding: 0 clamp(1rem, 2.5vw, 1.5rem);
          gap: 0.75rem;
          position: sticky;
          top: 0;
          z-index: 40;
          font-family: 'DM Sans', sans-serif;
        }

        .topbar-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1rem, 2vw, 1.2rem);
          font-weight: 500;
          color: #111827;
          letter-spacing: -0.01em;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }


        /* Logo LCD */
        .tb-logo-wrap {
          width: 34px; height: 34px; border-radius: 8px;
          overflow: hidden; flex-shrink: 0; cursor: pointer;
          box-shadow: 0 1px 6px rgba(0,0,0,0.10);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .tb-logo-wrap:hover { transform: scale(1.06); box-shadow: 0 3px 10px rgba(0,0,0,0.15); }
        .tb-logo-img { width: 34px !important; height: 34px !important; object-fit: cover; border-radius: 8px; display: block !important; }
        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        /* ── Bouton notifications ── */
        .tb-notif-btn {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid ${meta.borderColor};
          background: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6B7280;
          transition: all 0.18s;
        }
        .tb-notif-btn:hover {
          background: white;
          border-color: ${meta.accent}55;
          color: ${meta.accent};
          transform: translateY(-1px);
          box-shadow: 0 4px 12px ${meta.shadow};
        }
        .tb-notif-dot {
          position: absolute;
          top: 7px; right: 7px;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #EF4444;
          border: 1.5px solid white;
          animation: tbdot 2s ease-in-out infinite;
        }
        @keyframes tbdot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.5; transform:scale(.75); }
        }

        .tb-sep {
          width: 1px; height: 22px;
          background: ${meta.borderColor};
        }

        /* ── Bouton profil (avatar + nom + rôle) ── */
        .tb-profile-btn {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.2rem 0.7rem 0.2rem 0.28rem;
          border-radius: 99px;
          border: 1px solid ${meta.borderColor};
          background: rgba(255,255,255,0.7);
          cursor: pointer;
          transition: all 0.18s;
          -webkit-tap-highlight-color: transparent;
        }
        .tb-profile-btn:hover {
          background: white;
          border-color: ${meta.accent}55;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px ${meta.shadow};
        }

        /* Avatar */
        .tb-avatar {
          width: 30px; height: 30px;
          border-radius: 50%;
          background: ${meta.gradient};
          display: flex; align-items: center; justify-content: center;
          font-size: 0.64rem; font-weight: 800; color: white;
          flex-shrink: 0; overflow: hidden; position: relative;
        }

        /* Voyant "en ligne" */
        .tb-online-dot {
          position: absolute;
          bottom: 0; right: 0;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: ${meta.onlineColor};
          border: 1.5px solid white;
          animation: online-pulse 2.5s ease-in-out infinite;
        }
        @keyframes online-pulse {
          0%   { box-shadow: 0 0 0 0 ${meta.onlineColor}77; }
          60%  { box-shadow: 0 0 0 5px ${meta.onlineColor}00; }
          100% { box-shadow: 0 0 0 0 ${meta.onlineColor}00; }
        }

        .tb-name-block {
          display: flex; flex-direction: column; line-height: 1.2;
        }
        .tb-name {
          font-size: 0.75rem; font-weight: 700; color: #111827;
          white-space: nowrap; font-family: 'DM Sans', sans-serif;
        }
        .tb-role-pill {
          font-size: 0.57rem; font-weight: 800;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: ${meta.pillText}; background: ${meta.pillBg};
          border-radius: 99px; padding: 0.05rem 0.42rem;
          display: inline-block; margin-top: 1px;
        }

        /* ══════════════════════════════════
           MOBILE
        ══════════════════════════════════ */
        .mobile-topbar { display: none; }

        @media (max-width: 768px) {
          .topbar { display: none; }
          .mobile-topbar {
            display: flex; flex-direction: column;
            position: sticky; top: 0; z-index: 40;
            font-family: 'DM Sans', sans-serif;
          }
        }

        .mtb-main {
          height: 60px;
          background: ${meta.topbarBg};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid ${meta.borderColor};
          box-shadow: 0 1px 14px ${meta.shadow};
          display: flex; align-items: center;
          padding: 0 1rem; gap: 0.75rem;
        }

        /* Avatar mobile */
        .mtb-avatar-wrap {
          position: relative; flex-shrink: 0;
          cursor: pointer; -webkit-tap-highlight-color: transparent;
        }
        .mtb-avatar {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: ${meta.gradient};
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 800; color: white;
          overflow: hidden;
          box-shadow: 0 2px 8px ${meta.shadow};
          transition: transform 0.15s;
        }

        .mtb-avatar-wrap:active .mtb-avatar { transform: scale(0.92); }
        .mtb-online-dot {
          position: absolute; bottom: 1px; right: 1px;
          width: 10px; height: 10px; border-radius: 50%;
          background: ${meta.onlineColor};
          border: 2px solid white;
          animation: online-pulse 2.5s ease-in-out infinite;
        }

        /* Infos texte mobile */
        .mtb-info { flex: 1; min-width: 0; }
        .mtb-name {
          font-size: 0.83rem; font-weight: 700; color: #111827;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .mtb-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.68rem; font-weight: 500; color: #6B7280;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin: 0;
        }

        /* Actions droite mobile */
        .mtb-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }

        .mtb-notif-btn {
          position: relative;
          width: 40px; height: 40px;
          border-radius: 11px;
          border: 1px solid ${meta.borderColor};
          background: rgba(255,255,255,0.65);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6B7280;
          transition: background 0.15s, transform 0.12s;
          -webkit-tap-highlight-color: transparent;
        }
        .mtb-notif-btn:active { transform: scale(0.9); background: white; }
        .mtb-notif-badge {
          position: absolute; top: 6px; right: 6px;
          width: 8px; height: 8px; border-radius: 50%;
          background: #EF4444; border: 1.5px solid white;
          animation: tbdot 2.5s ease-in-out infinite;
        }

        /* Bande contextuelle dashboard */
        .mtb-context {
          background: ${meta.gradient};
          padding: 0.5rem 1rem;
          display: flex; align-items: center;
          justify-content: space-between; gap: 0.5rem;
        }
        .mtb-greeting {
          font-size: 0.72rem; font-weight: 600;
          color: rgba(255,255,255,0.9); line-height: 1.3;
        }
        .mtb-greeting strong { color: white; font-weight: 800; }
        .mtb-date-chip {
          font-size: 0.61rem; font-weight: 600;
          color: rgba(255,255,255,0.88);
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 99px; padding: 0.2rem 0.6rem;
          white-space: nowrap; flex-shrink: 0;
        }
      `}</style>

      {/* ── Desktop ── */}
      <header className="topbar">
        {/* Logo LCD */}
        <div className="tb-logo-wrap" title="Lélouma CD">
          <Image
            src="/assets/images/logolcd.jpg"
            alt="Lélouma CD"
            width={34}
            height={34}
            className="tb-logo-img"
          />
        </div>
        <h1 className="topbar-title">{title}</h1>

        <div className="topbar-actions">
          {/* Cloche notifications */}
          <button
            className="tb-notif-btn"
            title="Notifications"
            onClick={() => router.push(routes.notifications)}
          >
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <span className="tb-notif-dot" />
          </button>

          <div className="tb-sep" />

          {/* Avatar + nom + rôle → profil */}
          <button
            className="tb-profile-btn"
            onClick={() => router.push(routes.profile)}
            title="Mon profil"
          >
            <div className="tb-avatar">
              {avatarUrl
                ? <Image src={avatarUrl} alt={fullName} width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                : <span>{initials}</span>
              }
              <span className="tb-online-dot" />
            </div>
            <div className="tb-name-block">
              <span className="tb-name">{fullName}</span>
              <span className="tb-role-pill">{meta.label}</span>
            </div>
          </button>
        </div>
      </header>

      {/* ── Mobile ── */}
      <div className="mobile-topbar">
        <div className="mtb-main">
          {/* Avatar → profil */}
          <div
            className="mtb-avatar-wrap"
            onClick={() => router.push(routes.profile)}
            role="button"
            tabIndex={0}
            aria-label="Mon profil"
          >
            <div className="mtb-avatar">
              {avatarUrl
                ? <Image src={avatarUrl} alt={fullName} width={38} height={38} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            <span className="mtb-online-dot" />
          </div>

          {/* Nom + titre de page */}
          <div className="mtb-info">
            <div className="mtb-name">{fullName}</div>
            <h1 className="mtb-subtitle">{shortTitle}</h1>
          </div>

          {/* Notifications */}
          <div className="mtb-actions">
            <button
              className="mtb-notif-btn"
              onClick={() => router.push(routes.notifications)}
              aria-label="Notifications"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span className="mtb-notif-badge" />
            </button>
          </div>
        </div>

        {/* Bande contextuelle — seulement sur le dashboard */}
        {isRoot && firstName && (
          <div className="mtb-context">
            <div className="mtb-greeting">Bonjour, <strong>{firstName}</strong> 👋</div>
            <div className="mtb-date-chip">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
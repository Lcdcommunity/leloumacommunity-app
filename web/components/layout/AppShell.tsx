//web/components/layout/AppShell.tsx
import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        /* ── Reset & base ───────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; }

        .app-shell {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(150deg, #EEF2F8 0%, #F0F4FC 50%, #E4ECF7 100%);
        }

        /* ── Desktop layout ─────────────────────────────────── */
        /* Sidebar is always in the DOM but hides itself on mobile via its own CSS */

        .app-main {
          flex: 1;
          min-width: 0; /* prevent flex overflow */
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* Topbar sticks to the top of app-main */
        /* (Topbar renders its own <header> with position: sticky top: 0) */

        .page-content {
          flex: 1;
          overflow-y: auto;
          /* On mobile, leave room for the fixed bottom nav */
          padding-bottom: 0;
        }

        /* ── Mobile adjustments ─────────────────────────────── */
        @media (max-width: 768px) {
          .app-shell {
            /* On mobile there's no sidebar, so full width */
            flex-direction: column;
          }

          .page-content {
            /* Reserve space for the fixed 64px MobileNav + iOS safe area */
            padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
          }
        }

        /* ── Desktop: hide MobileNav placeholder space ──────── */
        @media (min-width: 769px) {
          /* MobileNav hides itself via display:none in its own CSS,
             so no extra rule needed here — just ensure no ghost space */
          .app-mobile-nav {
            display: none;
          }
        }
      `}</style>

      <div className="app-shell">
        {/* Desktop only — Sidebar hides itself on mobile */}
        <Sidebar />

        <div className="app-main">
          {/* Sticky top bar */}
          <Topbar title={title} />

          {/* Page body */}
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>

      {/*
        MobileNav is portaled outside app-shell so it can be
        position:fixed to the viewport bottom without being
        clipped by any overflow:hidden ancestor.
        On desktop it renders display:none via its own CSS.
      */}
      <MobileNav />
    </>
  );
}
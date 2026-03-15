//web/components/layout/AppShell.tsx
// web/components/layout/AppShell.tsx
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
        *, *::before, *::after { box-sizing: border-box; }

        .app-shell {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(150deg, #EEF2F8 0%, #F0F4FC 50%, #E4ECF7 100%);
        }

        .app-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .page-content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 0;
        }

        @media (max-width: 768px) {
          .app-shell { flex-direction: column; }
          .page-content {
            /* 64px bottom bar + safe area */
            padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
          }
        }

        @media (min-width: 769px) {
          .app-mobile-nav { display: none; }
        }
      `}</style>

      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Topbar title={title} />
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>

      <MobileNav />
    </>
  );
}
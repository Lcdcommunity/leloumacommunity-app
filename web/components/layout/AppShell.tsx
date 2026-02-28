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
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title={title} />
        <main className="page-content">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
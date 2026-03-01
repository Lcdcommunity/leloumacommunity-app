import React from 'react';
export function Badge({ children, tone }: { children: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  return <span className={`badge badge-${tone || 'neutral'}`}>{children}</span>;
}

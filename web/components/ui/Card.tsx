//web/components/ui/Card.tsx
import React from 'react';

export function Card({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      {(title || actions) && (
        <div className="card-header">
          <h3>{title}</h3>
          <div>{actions}</div>
        </div>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}
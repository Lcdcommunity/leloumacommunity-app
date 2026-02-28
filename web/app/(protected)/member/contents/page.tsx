//web/app/(protected)/member/contents/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { api } from '../../../../lib/api-client';
import type { ContentPost } from '../../../../types/content';
import { formatDate } from '../../../../lib/format';

export default function MemberContentsPage() {
  const [items, setItems] = useState<ContentPost[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listContentsForMembers({ page: 1, pageSize: 100, q: q || undefined });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement contenus');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Informations & annonces">
      <Card title="Contenus publiés">
        <div className="toolbar">
          <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={() => void load()}>Rechercher</Button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="stack-md">
          {items.map((c) => (
            <article key={c.id} className="card">
              <div className="card-body stack-sm">
                <div className="row-between">
                  <h3 style={{ margin: 0 }}>{c.title}</h3>
                  <Badge tone="success">{c.status}</Badge>
                </div>
                {c.body ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.body}</p> : null}
                <small>Publié / mis à jour : {formatDate(c.updatedAt)}</small>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
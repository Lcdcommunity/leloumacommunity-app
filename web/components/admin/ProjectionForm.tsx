//web/components/admin/ProjectionForm.tsx
'use client';

import { FormEvent, useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { ProjectionResult } from '../../types/stats';
import { api } from '../../lib/api-client';
import { formatCurrency } from '../../lib/format';

export function ProjectionForm() {
  const [periodLabel, setPeriodLabel] = useState('Mois prochain');
  const [expectedMembersPaying, setExpectedMembersPaying] = useState('50');
  const [averageContribution, setAverageContribution] = useState('20');
  const [currency, setCurrency] = useState('EUR');
  const [result, setResult] = useState<ProjectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.runContributionProjection({
        periodLabel,
        expectedMembersPaying: Number(expectedMembersPaying),
        averageContribution: Number(averageContribution),
        currency,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de projection');
      // fallback local si endpoint pas encore branché
      const fallbackTotal = Number(expectedMembersPaying) * Number(averageContribution);
      setResult({
        periodLabel,
        expectedMembersPaying: Number(expectedMembersPaying),
        averageContribution: Number(averageContribution),
        projectedTotal: fallbackTotal,
        currency,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack-md">
      <form onSubmit={onSubmit} className="stack-md">
        <Input label="Période" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
        <div className="grid grid-2">
          <Input
            label="Membres payeurs attendus"
            type="number"
            min="0"
            value={expectedMembersPaying}
            onChange={(e) => setExpectedMembersPaying(e.target.value)}
            required
          />
          <Input
            label="Cotisation moyenne"
            type="number"
            min="0"
            step="0.01"
            value={averageContribution}
            onChange={(e) => setAverageContribution(e.target.value)}
            required
          />
        </div>
        <Input label="Devise" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
        <Button type="submit" disabled={loading}>
          {loading ? 'Calcul...' : 'Calculer la projection'}
        </Button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}

      {result ? (
        <div className="card">
          <div className="card-body">
            <p><strong>Période :</strong> {result.periodLabel}</p>
            <p><strong>Membres payeurs attendus :</strong> {result.expectedMembersPaying}</p>
            <p><strong>Cotisation moyenne :</strong> {formatCurrency(result.averageContribution, result.currency)}</p>
            <p><strong>Total projeté :</strong> {formatCurrency(result.projectedTotal, result.currency)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
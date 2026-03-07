// web/components/member/ContributionCreateForm.tsx
'use client';

import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

// On retire 'reference' des valeurs attendues
interface ContributionValues {
  amount: number;
  depositedAt: string;
  method: string;
  note: string;
}

interface Props {
  onSubmit: (values: ContributionValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function ContributionCreateForm({ onSubmit, isSubmitting }: Props) {
  const [values, setValues] = useState({
    amount: '',
    depositedAt: new Date().toISOString().split('T')[0],
    method: 'CASH',
    note: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...values,
      amount: Number(values.amount),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Montant"
        type="number"
        required
        value={values.amount}
        onChange={(e) => setValues({ ...values, amount: e.target.value })}
      />
      
      <Input
        label="Date du versement"
        type="date"
        required
        value={values.depositedAt}
        onChange={(e) => setValues({ ...values, depositedAt: e.target.value })}
      />
      
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Mode de paiement</label>
        <select
          className="border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-blue focus:border-brand-blue"
          value={values.method}
          onChange={(e) => setValues({ ...values, method: e.target.value })}
        >
          <option value="CASH">Espèces</option>
          <option value="BANK_TRANSFER">Virement Bancaire</option>
          <option value="MOBILE_MONEY">Mobile Money</option>
        </select>
      </div>

      <Input
        label="Commentaire (optionnel)"
        value={values.note}
        onChange={(e) => setValues({ ...values, note: e.target.value })}
        placeholder="Ex: Cotisation du mois de Mars"
      />
      
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Envoi en cours...' : 'Déclarer la cotisation'}
      </Button>
    </form>
  );
}
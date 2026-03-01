//web/components/member/ContributionCreateForm.tsx
'use client';

import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Props {
  onSubmit: (values: any) => Promise<void>;
  isSubmitting?: boolean;
}

export function ContributionCreateForm({ onSubmit, isSubmitting }: Props) {
  const [values, setValues] = useState({
    amount: '',
    contributionDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    memberComment: '',
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
        value={values.contributionDate}
        onChange={(e) => setValues({ ...values, contributionDate: e.target.value })}
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Mode de paiement</label>
        <select
          className="border rounded-md p-2"
          value={values.paymentMethod}
          onChange={(e) => setValues({ ...values, paymentMethod: e.target.value })}
        >
          <option value="CASH">Espèces</option>
          <option value="BANK_TRANSFER">Virement Bancaire</option>
          <option value="MOBILE_MONEY">Mobile Money</option>
        </select>
      </div>
      <Input
        label="Commentaire (optionnel)"
        value={values.memberComment}
        onChange={(e) => setValues({ ...values, memberComment: e.target.value })}
      />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Envoi en cours...' : 'Déclarer la cotisation'}
      </Button>
    </form>
  );
}
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
  purpose: string; // 👈 NOUVEAU : Ajout du motif
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
    purpose: 'REGULAR_QUOTA', // 👈 NOUVEAU : Valeur par défaut
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
      {/* 👇 NOUVEAU : Sélecteur du motif du versement */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Motif du versement</label>
        <select
          className="border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-blue focus:border-brand-blue outline-none"
          value={values.purpose}
          onChange={(e) => setValues({ ...values, purpose: e.target.value })}
          required
        >
          <option value="REGULAR_QUOTA">Cotisation (Mensuelle, Trimestrielle...)</option>
          <option value="MEMBERSHIP_CARD">Règlement Carte Membre Annuelle</option>
          <option value="DONATION">Don libre</option>
        </select>
      </div>

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
          className="border border-gray-300 rounded-md p-2 text-sm focus:ring-brand-blue focus:border-brand-blue outline-none"
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
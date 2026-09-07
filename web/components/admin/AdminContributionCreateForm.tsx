'use client';
// Formulaire isolé pour qu'un admin d'antenne enregistre une cotisation
// (carte membre, régulière, don, retard) au nom d'un membre — sans passer
// par ContributionCreateForm.tsx (member-only : dashboard/search membre
// scopés au membre connecté, inutilisables tels quels pour un admin).

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api-client';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const PURPOSES = [
  { value: 'REGULAR_QUOTA', label: 'Cotisation régulière', icon: '📅' },
  { value: 'LATE_QUOTA', label: 'Paiement retards', icon: '⏳' },
  { value: 'MEMBERSHIP_CARD', label: 'Carte membre annuelle', icon: '💳' },
  { value: 'DONATION', label: 'Don libre', icon: '🤝' },
];

const METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK_TRANSFER', label: 'Virement' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARD', label: 'Carte Bancaire' },
];

interface TargetMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  antennaId?: string | null;
  antennaName?: string | null;
  currency?: string | null;
  monthlyQuota?: number | null;
  membershipCardPrice?: number | null;
  lateMonths?: number;
  earliestUnpaidMonth?: number | null;
  earliestUnpaidYear?: number | null;
}

export interface AdminContributionValues {
  memberId: string;
  amount: number;
  currency: string;
  method: string;
  depositedAt: string;
  note: string;
  purpose: string;
  monthReference?: number;
  yearReference?: number;
}

interface Props {
  onSubmit: (values: AdminContributionValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function AdminContributionCreateForm({ onSubmit, isSubmitting }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<TargetMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<TargetMember | null>(null);

  const [purpose, setPurpose] = useState('REGULAR_QUOTA');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [depositedAt, setDepositedAt] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const now = new Date();
  const [refMonth, setRefMonth] = useState(now.getMonth() + 1);
  const [refYear, setRefYear] = useState(now.getFullYear());

  useEffect(() => {
    if (!searchQuery || member) { setResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      api.searchTargetMembersAdmin(searchQuery)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, member]);

  const selectMember = (m: TargetMember) => {
    setMember(m);
    setResults([]);
    setSearchQuery('');
    if (m.earliestUnpaidMonth && m.earliestUnpaidYear) {
      setRefMonth(m.earliestUnpaidMonth);
      setRefYear(m.earliestUnpaidYear);
    }
    if (purpose === 'MEMBERSHIP_CARD' && m.membershipCardPrice) {
      setAmount(String(m.membershipCardPrice));
    }
  };

  const handlePurposeSelect = (p: string) => {
    setPurpose(p);
    if (p === 'MEMBERSHIP_CARD' && member?.membershipCardPrice) {
      setAmount(String(member.membershipCardPrice));
    }
  };

  const isQuota = purpose === 'REGULAR_QUOTA' || purpose === 'LATE_QUOTA';
  const currency = member?.currency || '';
  const amountNum = Number(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !amountNum || amountNum <= 0) return;
    await onSubmit({
      memberId: member.id,
      amount: amountNum,
      currency,
      method,
      depositedAt,
      note,
      purpose,
      monthReference: isQuota ? refMonth : undefined,
      yearReference: isQuota ? refYear : undefined,
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Membre bénéficiaire ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#059669' }}>
          Membre bénéficiaire
        </span>
        {member ? (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065F46' }}>{member.firstName} {member.lastName}</div>
              <div style={{ fontSize: '0.7rem', color: '#047857' }}>{member.email || member.phone}</div>
              <div style={{ fontSize: '0.68rem', color: '#059669', marginTop: '0.15rem' }}>
                {member.antennaName ? `Antenne ${member.antennaName}` : ''}{member.currency ? ` · devise ${member.currency}` : ''}
                {typeof member.lateMonths === 'number' && member.lateMonths > 0 ? ` · ${member.lateMonths} mois de retard` : ''}
              </div>
            </div>
            <button type="button" onClick={() => setMember(null)} style={{ background: 'white', border: '1px solid #A7F3D0', padding: '0.4rem 0.7rem', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700, color: '#059669', cursor: 'pointer' }}>
              Changer
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Chercher par nom, prénom, email ou téléphone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', height: 48, borderRadius: 12, border: '1px solid rgba(5,150,105,0.25)', padding: '0 1rem', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
            />
            {results.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, background: 'white', zIndex: 20, borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto', padding: '0.5rem' }}>
                {results.map((m) => (
                  <div key={m.id} onClick={() => selectMember(m)} style={{ padding: '0.6rem 0.8rem', borderRadius: 8, cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{m.firstName} {m.lastName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>{[m.antennaName, m.email, m.phone].filter(Boolean).join(' • ')}</div>
                  </div>
                ))}
              </div>
            )}
            {searchQuery && !searching && results.length === 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '1rem', textAlign: 'center', color: '#6B7280', fontSize: '0.8rem' }}>
                Aucun membre actif trouvé dans votre périmètre.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Motif ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#059669' }}>Motif</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.55rem' }}>
          {PURPOSES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePurposeSelect(p.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                padding: '0.75rem 0.5rem', borderRadius: 12,
                border: purpose === p.value ? '1.5px solid #059669' : '1.5px solid rgba(5,150,105,0.15)',
                background: purpose === p.value ? '#ECFDF5' : 'white',
                cursor: 'pointer', textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E293B' }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Mois de référence ── */}
      {isQuota && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#059669' }}>Mois de référence</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <select value={refMonth} onChange={(e) => setRefMonth(Number(e.target.value))} style={{ height: 46, borderRadius: 10, border: '1px solid #CBD5E1', padding: '0 0.8rem' }}>
              {MONTHS_FR.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={refYear} onChange={(e) => setRefYear(Number(e.target.value))} style={{ height: 46, borderRadius: 10, border: '1px solid #CBD5E1', padding: '0 0.8rem' }}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {member?.earliestUnpaidMonth && refMonth === member.earliestUnpaidMonth && refYear === member.earliestUnpaidYear && (
            <p style={{ fontSize: '0.7rem', color: '#D97706', fontWeight: 700 }}>
              💡 Plus ancien mois impayé de ce membre — pré-rempli pour rattraper le retard en premier.
            </p>
          )}
        </div>
      )}

      {/* ── Montant + devise ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#059669' }}>Montant</span>
          <input
            type="number" min={0} step="any" required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ height: 48, borderRadius: 12, border: '1px solid rgba(5,150,105,0.25)', padding: '0 1rem', fontSize: '1rem', fontWeight: 700 }}
          />
          {purpose === 'MEMBERSHIP_CARD' && member?.membershipCardPrice ? (
            <span style={{ fontSize: '0.68rem', color: '#059669' }}>Prix fixé : {member.membershipCardPrice} {currency}</span>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#059669' }}>Devise</span>
          <div style={{ height: 48, borderRadius: 12, border: '1px solid rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', padding: '0 1rem', fontWeight: 700, color: currency ? '#065F46' : '#9CA3AF', background: currency ? '#ECFDF5' : 'white' }}>
            {currency || 'Sélectionnez un membre'}
          </div>
        </div>
      </div>

      {/* ── Date ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#059669' }}>Date du paiement</span>
        <input type="date" value={depositedAt} onChange={(e) => setDepositedAt(e.target.value)} style={{ height: 48, borderRadius: 12, border: '1px solid rgba(5,150,105,0.25)', padding: '0 1rem' }} />
      </div>

      {/* ── Méthode ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#059669' }}>Mode de paiement</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          {METHODS.map((m) => (
            <button key={m.value} type="button" onClick={() => setMethod(m.value)}
              style={{ height: 44, borderRadius: 10, border: method === m.value ? '1.5px solid #059669' : '1.5px solid #E2E8F0', background: method === m.value ? '#ECFDF5' : 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Note ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#059669' }}>Note <span style={{ fontWeight: 500, textTransform: 'none', color: '#94A3B8' }}>(optionnel)</span></span>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: reçu en espèces le 12/09 lors de la réunion d'antenne" style={{ height: 46, borderRadius: 10, border: '1px solid #CBD5E1', padding: '0 0.9rem' }} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !member || !amountNum || amountNum <= 0}
        style={{
          height: 52, borderRadius: 13, border: 'none', color: 'white', fontWeight: 800,
          background: 'linear-gradient(135deg, #047857, #059669, #10B981)',
          cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: (!member || !amountNum) ? 0.6 : 1,
        }}
      >
        {isSubmitting ? 'Enregistrement…' : 'Enregistrer et valider la cotisation'}
      </button>
    </form>
  );
}
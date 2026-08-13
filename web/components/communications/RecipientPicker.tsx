// web/components/communications/RecipientPicker.tsx
//
// v1.0 — Fichier neuf, isolé. Composant de sélection de destinataires
//   construit à neuf pour ce module (même esprit que les recherches de
//   membres déjà présentes ailleurs dans l'app, mais sans rien importer de
//   ces fichiers, pour rester indépendant).
//
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  communicationsApi,
  type CommunicationAntennaOption,
  type CommunicationAudienceType,
  type CommunicationMemberOption,
  type CommunicationLateMemberOption,
} from '../../lib/communications-api-client';

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

type PoolEntry = CommunicationMemberOption & { lateMonths?: number };

interface RecipientPickerProps {
  scope: 'admin' | 'super-admin';
  accent: string;
  audienceType: CommunicationAudienceType;
  antennaId: string | undefined;
  onAntennaChange: (id: string | undefined) => void;
  selectionMode: 'BULK' | 'INDIVIDUAL';
  onSelectionModeChange: (mode: 'BULK' | 'INDIVIDUAL') => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onPoolCountChange?: (count: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function RecipientPicker({
  scope,
  accent,
  audienceType,
  antennaId,
  onAntennaChange,
  selectionMode,
  onSelectionModeChange,
  selectedIds,
  onSelectedIdsChange,
  onPoolCountChange,
  onLoadingChange,
}: RecipientPickerProps) {
  const [antennas, setAntennas] = useState<CommunicationAntennaOption[]>([]);
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const dim = hexToRgba(accent, 0.08);
  const dimBorder = hexToRgba(accent, 0.18);

  // Antennes : uniquement utile pour super admin (filtre "toutes / une
  // antenne"), mais sans danger de le charger aussi côté admin.
  useEffect(() => {
    if (scope !== 'super-admin') return;
    let mounted = true;
    void (async () => {
      try {
        const list = await communicationsApi.getAntennas();
        if (mounted) setAntennas(list);
      } catch {
        /* silencieux : le filtre reste juste vide si l'appel échoue */
      }
    })();
    return () => { mounted = false; };
  }, [scope]);

  // Pool de destinataires : dépend de l'audience choisie + de l'antenne
  // filtrée. Re-fetché à chaque changement, réutilisé pour le mode "tout le
  // monde" (juste le compteur) et le mode "sélection individuelle" (liste
  // filtrable côté client — recherche nom/prénom/téléphone/email).
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    onLoadingChange?.(true);
    setError(null);
    void (async () => {
      try {
        const data =
          audienceType === 'LATE_PAYERS'
            ? await communicationsApi.getLateMembers(antennaId)
            : await communicationsApi.getAllMembers({ antennaId });
        if (mounted) {
          setPool(data);
          onPoolCountChange?.(data.length);
        }
      } catch {
        if (mounted) setError("Impossible de charger la liste des membres.");
      } finally {
        if (mounted) {
          setLoading(false);
          onLoadingChange?.(false);
        }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceType, antennaId]);

  // Changer d'audience ou d'antenne invalide une sélection individuelle
  // précédente (les IDs cochés peuvent ne plus faire partie du nouveau pool).
  useEffect(() => {
    onSelectedIdsChange([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceType, antennaId]);

  const filteredPool = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((m) =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.phone ?? '').toLowerCase().includes(q),
    );
  }, [pool, search]);

  const toggle = (id: string) => {
    onSelectedIdsChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  };

  const selectAllFiltered = () => {
    const ids = new Set(selectedIds);
    filteredPool.forEach((m) => ids.add(m.id));
    onSelectedIdsChange(Array.from(ids));
  };

  const clearSelection = () => onSelectedIdsChange([]);

  return (
    <div className="rp-wrap">
      <style>{`
        .rp-wrap { display: flex; flex-direction: column; gap: 0.9rem; }
        .rp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
        .rp-select {
          padding: 0.55rem 0.8rem; border-radius: 10px; border: 1px solid ${dimBorder};
          background: #fff; font-size: 0.82rem; font-weight: 600; color: #374151;
          font-family: 'DM Sans', sans-serif; cursor: pointer; min-width: 180px;
        }
        .rp-toggle { display: inline-flex; border-radius: 99px; background: #F1F5F9; padding: 3px; gap: 2px; }
        .rp-toggle-btn {
          padding: 0.5rem 1rem; border-radius: 99px; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 700;
          color: #64748B; background: transparent; transition: all 0.18s;
        }
        .rp-toggle-btn.active { background: ${accent}; color: #fff; box-shadow: 0 2px 8px ${dim}; }
        .rp-count-chip {
          font-size: 0.72rem; font-weight: 800; color: ${accent}; background: ${dim};
          border: 1px solid ${dimBorder}; border-radius: 99px; padding: 0.3rem 0.75rem;
        }
        .rp-search {
          width: 100%; padding: 0.65rem 0.9rem; border-radius: 10px; border: 1px solid #E5E7EB;
          font-size: 0.85rem; font-family: 'DM Sans', sans-serif; box-sizing: border-box;
        }
        .rp-search:focus { outline: none; border-color: ${accent}; }
        .rp-list { max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 4px; }
        .rp-list-actions { display: flex; gap: 0.75rem; font-size: 0.72rem; font-weight: 700; }
        .rp-list-actions button { background: none; border: none; cursor: pointer; color: ${accent}; padding: 0; font-family: 'DM Sans', sans-serif; }
        .rp-row-item {
          display: flex; align-items: center; gap: 0.65rem; padding: 0.55rem 0.7rem;
          border-radius: 10px; cursor: pointer; transition: background 0.15s;
        }
        .rp-row-item:hover { background: #F8FAFC; }
        .rp-row-item.checked { background: ${dim}; }
        .rp-avatar {
          width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.62rem; font-weight: 800; color: #fff;
          background: linear-gradient(135deg, ${accent}, ${accent}99);
        }
        .rp-meta { min-width: 0; flex: 1; }
        .rp-name { font-size: 0.82rem; font-weight: 700; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rp-sub { font-size: 0.7rem; color: #9CA3AF; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rp-late-badge { font-size: 0.65rem; font-weight: 800; color: #DC2626; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 99px; padding: 0.15rem 0.5rem; flex-shrink: 0; }
        .rp-empty { text-align: center; padding: 1.5rem; color: #9CA3AF; font-size: 0.8rem; }
        .rp-preview { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .rp-preview-pill { font-size: 0.72rem; font-weight: 600; color: #374151; background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 99px; padding: 0.25rem 0.65rem; }
      `}</style>

      {scope === 'super-admin' && (
        <div className="rp-row">
          <select
            className="rp-select"
            value={antennaId ?? ''}
            onChange={(e) => onAntennaChange(e.target.value || undefined)}
          >
            <option value="">Toutes les antennes</option>
            {antennas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rp-row" style={{ justifyContent: 'space-between' }}>
        <div className="rp-toggle">
          <button
            type="button"
            className={`rp-toggle-btn ${selectionMode === 'BULK' ? 'active' : ''}`}
            onClick={() => onSelectionModeChange('BULK')}
          >
            Tout le monde
          </button>
          <button
            type="button"
            className={`rp-toggle-btn ${selectionMode === 'INDIVIDUAL' ? 'active' : ''}`}
            onClick={() => onSelectionModeChange('INDIVIDUAL')}
          >
            Sélection individuelle
          </button>
        </div>
        <span className="rp-count-chip">
          {loading ? '…' : selectionMode === 'BULK' ? `${pool.length} destinataire${pool.length > 1 ? 's' : ''}` : `${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {error && <div className="rp-empty">{error}</div>}

      {!error && selectionMode === 'INDIVIDUAL' && (
        <>
          <input
            className="rp-search"
            type="text"
            placeholder="Rechercher par nom, prénom, téléphone ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="rp-list-actions">
            <button type="button" onClick={selectAllFiltered}>Tout sélectionner{search ? ' (filtré)' : ''}</button>
            <button type="button" onClick={clearSelection}>Tout désélectionner</button>
          </div>
          <div className="rp-list">
            {loading ? (
              <div className="rp-empty">Chargement…</div>
            ) : filteredPool.length === 0 ? (
              <div className="rp-empty">Aucun membre ne correspond.</div>
            ) : (
              filteredPool.map((m) => {
                const checked = selectedIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`rp-row-item ${checked ? 'checked' : ''}`}
                    onClick={() => toggle(m.id)}
                    role="checkbox"
                    aria-checked={checked}
                    tabIndex={0}
                  >
                    <input type="checkbox" checked={checked} readOnly style={{ accentColor: accent, flexShrink: 0 }} />
                    <div className="rp-avatar">{getInitials(m.firstName, m.lastName)}</div>
                    <div className="rp-meta">
                      <div className="rp-name">{m.firstName} {m.lastName}</div>
                      <div className="rp-sub">
                        {m.email}{m.phone ? ` · ${m.phone}` : ''}{scope === 'super-admin' && m.antennaName ? ` · ${m.antennaName}` : ''}
                      </div>
                    </div>
                    {typeof (m as CommunicationLateMemberOption).lateMonths === 'number' && (
                      <span className="rp-late-badge">{(m as CommunicationLateMemberOption).lateMonths} mois</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {!error && selectionMode === 'BULK' && !loading && (
        <div className="rp-preview">
          {pool.slice(0, 8).map((m) => (
            <span key={m.id} className="rp-preview-pill">{m.firstName} {m.lastName}</span>
          ))}
          {pool.length > 8 && <span className="rp-preview-pill">+{pool.length - 8} autres</span>}
          {pool.length === 0 && <div className="rp-empty">Aucun membre dans cette audience.</div>}
        </div>
      )}
    </div>
  );
}
// web/components/communications/CommunicationsConsole.tsx
//
// v1.0 — Fichier neuf, isolé. Page de communication email/SMS partagée entre
//   admin et super admin (différence portée par la prop `scope` : le filtre
//   par antenne ne s'affiche que pour le super admin, via RecipientPicker).
//   N'importe rien de l'existant à part `communicationsApi` (fichier neuf
//   lui aussi) — reste hors des fichiers déjà en place, comme demandé.
//
'use client';

import { useMemo, useState } from 'react';
import { RecipientPicker } from './RecipientPicker';
import {
  communicationsApi,
  type CommunicationAudienceType,
  type SendCommunicationResult,
} from '../../lib/communications-api-client';

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const SCOPE_PALETTE: Record<'admin' | 'super-admin', { accent: string; label: string }> = {
  admin: { accent: '#2563EB', label: 'Espace administrateur' },
  'super-admin': { accent: '#DC2626', label: 'Super Administration' },
};

const SMS_SEGMENT_LENGTH = 160;

export function CommunicationsConsole({ scope }: { scope: 'admin' | 'super-admin' }) {
  const { accent, label } = SCOPE_PALETTE[scope];
  const dim = hexToRgba(accent, 0.08);
  const dimBorder = hexToRgba(accent, 0.14);

  const [audienceType, setAudienceType] = useState<CommunicationAudienceType>('LATE_PAYERS');
  const [selectionMode, setSelectionMode] = useState<'BULK' | 'INDIVIDUAL'>('BULK');
  const [antennaId, setAntennaId] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [poolCount, setPoolCount] = useState(0);
  const [poolLoading, setPoolLoading] = useState(false);

  const [channels, setChannels] = useState({ email: true, sms: false });
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendCommunicationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recipientCount = selectionMode === 'BULK' ? poolCount : selectedIds.length;

  const smsSegments = useMemo(() => {
    if (!channels.sms || body.length === 0) return 0;
    return Math.ceil(body.length / SMS_SEGMENT_LENGTH);
  }, [channels.sms, body]);

  const canSend =
    !sending &&
    !poolLoading &&
    recipientCount > 0 &&
    (channels.email || channels.sms) &&
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (!channels.email || subject.trim().length > 0);

  const handleAudienceChange = (type: CommunicationAudienceType) => {
    setAudienceType(type);
    setSelectionMode('BULK');
    setSelectedIds([]);
    setResult(null);
    setErrorMsg(null);
  };

  const resetAfterSend = () => {
    setTitle('');
    setSubject('');
    setBody('');
    setSelectedIds([]);
    setConfirming(false);
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setErrorMsg(null);
    try {
      const res = await communicationsApi.send({
        audienceType,
        selectionMode,
        antennaId: scope === 'super-admin' ? antennaId : undefined,
        recipientUserIds: selectionMode === 'INDIVIDUAL' ? selectedIds : undefined,
        channels,
        title: title.trim(),
        subject: channels.email ? subject.trim() : undefined,
        body: body.trim(),
      });
      setResult(res);
      resetAfterSend();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "L'envoi a échoué.");
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="cc-wrap" style={{ '--cc-accent': accent, '--cc-dim': dim, '--cc-dim-border': dimBorder } as React.CSSProperties}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        .cc-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 900px; margin: 0 auto; }

        .cc-header { margin-bottom: 1.75rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--cc-dim-border); opacity: 0; transform: translateY(10px); animation: ccIn 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .cc-eyebrow { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--cc-accent); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .cc-eyebrow-dot { width: 6px; height: 6px; background: var(--cc-accent); border-radius: 50%; }
        .cc-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 700; color: #111827; letter-spacing: -0.02em; }

        .cc-panel { background: rgba(253,253,255,0.9); backdrop-filter: blur(12px); border-radius: 18px; border: 1px solid var(--cc-dim-border); box-shadow: 0 2px 10px rgba(0,0,0,0.04); padding: 1.4rem; margin-bottom: 1.1rem; opacity: 0; transform: translateY(12px); animation: ccIn 0.5s cubic-bezier(.22,1,.36,1) forwards; }
        .cc-panel-title { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: #6B7280; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .cc-panel-title::after { content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.06); }

        .cc-audience-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.1rem; }
        @media (max-width: 560px) { .cc-audience-grid { grid-template-columns: 1fr; } }
        .cc-audience-card { text-align: left; border-radius: 14px; border: 1.5px solid #E5E7EB; background: #fff; padding: 1rem 1.1rem; cursor: pointer; transition: all 0.18s; font-family: 'DM Sans', sans-serif; }
        .cc-audience-card:hover { border-color: var(--cc-dim-border); }
        .cc-audience-card.active { border-color: var(--cc-accent); background: var(--cc-dim); }
        .cc-audience-card-title { font-size: 0.88rem; font-weight: 800; color: #111827; margin-bottom: 0.25rem; }
        .cc-audience-card-sub { font-size: 0.73rem; color: #6B7280; line-height: 1.4; }

        .cc-channel-row { display: flex; gap: 0.6rem; }
        .cc-channel-chip { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 12px; border: 1.5px solid #E5E7EB; background: #fff; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #6B7280; transition: all 0.18s; }
        .cc-channel-chip.active { border-color: var(--cc-accent); background: var(--cc-dim); color: var(--cc-accent); }
        .cc-channel-chip input { accent-color: var(--cc-accent); }

        .cc-field { margin-bottom: 1rem; }
        .cc-field:last-child { margin-bottom: 0; }
        .cc-label { display: block; font-size: 0.72rem; font-weight: 700; color: #6B7280; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .cc-input, .cc-textarea { width: 100%; box-sizing: border-box; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1.5px solid #E5E7EB; font-size: 0.88rem; font-family: 'DM Sans', sans-serif; color: #111827; }
        .cc-input:focus, .cc-textarea:focus { outline: none; border-color: var(--cc-accent); }
        .cc-textarea { min-height: 160px; resize: vertical; line-height: 1.6; }
        .cc-hint { font-size: 0.7rem; color: #9CA3AF; margin-top: 0.35rem; }
        .cc-hint.warn { color: #D97706; font-weight: 700; }

        .cc-send-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; padding: 1.1rem 1.4rem; border-radius: 16px; background: var(--cc-dim); border: 1px solid var(--cc-dim-border); }
        .cc-send-count { font-size: 0.82rem; font-weight: 700; color: #374151; }
        .cc-send-count strong { color: var(--cc-accent); font-size: 1rem; }
        .cc-send-btn { padding: 0.75rem 1.5rem; border-radius: 12px; border: none; background: var(--cc-accent); color: #fff; font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: opacity 0.15s; font-family: 'DM Sans', sans-serif; }
        .cc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .cc-cancel-btn { padding: 0.75rem 1.2rem; border-radius: 12px; border: 1.5px solid #E5E7EB; background: #fff; color: #6B7280; font-weight: 700; font-size: 0.85rem; cursor: pointer; font-family: 'DM Sans', sans-serif; }

        .cc-banner { border-radius: 14px; padding: 1rem 1.2rem; margin-bottom: 1.1rem; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.6rem; }
        .cc-banner.success { background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; }
        .cc-banner.error { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; }

        @keyframes ccIn { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="cc-header">
        <div className="cc-eyebrow"><div className="cc-eyebrow-dot" />{label}</div>
        <h1 className="cc-title">Communications</h1>
      </div>

      {result && (
        <div className="cc-banner success">
          ✅ Envoyé à {result.recipientsCount} destinataire{result.recipientsCount > 1 ? 's' : ''} — {result.successCount} réussi{result.successCount > 1 ? 's' : ''}{result.failedCount > 0 ? `, ${result.failedCount} échec${result.failedCount > 1 ? 's' : ''}` : ''}.
        </div>
      )}
      {errorMsg && <div className="cc-banner error">⚠️ {errorMsg}</div>}

      <div className="cc-panel" style={{ animationDelay: '0.08s' }}>
        <div className="cc-panel-title">Audience</div>
        <div className="cc-audience-grid">
          <button
            type="button"
            className={`cc-audience-card ${audienceType === 'LATE_PAYERS' ? 'active' : ''}`}
            onClick={() => handleAudienceChange('LATE_PAYERS')}
          >
            <div className="cc-audience-card-title">⏰ Retardataires</div>
            <div className="cc-audience-card-sub">Relance des membres en retard de cotisation</div>
          </button>
          <button
            type="button"
            className={`cc-audience-card ${audienceType === 'ALL_MEMBERS' ? 'active' : ''}`}
            onClick={() => handleAudienceChange('ALL_MEMBERS')}
          >
            <div className="cc-audience-card-title">📢 Information générale</div>
            <div className="cc-audience-card-sub">Message aux membres, indépendant des retards</div>
          </button>
        </div>

        <RecipientPicker
          scope={scope}
          accent={accent}
          audienceType={audienceType}
          antennaId={antennaId}
          onAntennaChange={setAntennaId}
          selectionMode={selectionMode}
          onSelectionModeChange={setSelectionMode}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onPoolCountChange={setPoolCount}
          onLoadingChange={setPoolLoading}
        />
      </div>

      <div className="cc-panel" style={{ animationDelay: '0.14s' }}>
        <div className="cc-panel-title">Canaux</div>
        <div className="cc-channel-row">
          <label className={`cc-channel-chip ${channels.email ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={channels.email}
              onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))}
            />
            ✉️ Email
          </label>
          <label className={`cc-channel-chip ${channels.sms ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={channels.sms}
              onChange={(e) => setChannels((c) => ({ ...c, sms: e.target.checked }))}
            />
            💬 SMS
          </label>
        </div>
      </div>

      <div className="cc-panel" style={{ animationDelay: '0.2s' }}>
        <div className="cc-panel-title">Message</div>

        <div className="cc-field">
          <label className="cc-label" htmlFor="cc-title">Titre</label>
          <input
            id="cc-title"
            className="cc-input"
            type="text"
            placeholder="Ex. Rappel de cotisation"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <div className="cc-hint">Affiché en en-tête de l'email et conservé dans l'historique des envois.</div>
        </div>

        {channels.email && (
          <div className="cc-field">
            <label className="cc-label" htmlFor="cc-subject">Objet de l'email</label>
            <input
              id="cc-subject"
              className="cc-input"
              type="text"
              placeholder="Ex. Votre cotisation est en attente"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
            />
          </div>
        )}

        <div className="cc-field">
          <label className="cc-label" htmlFor="cc-body">Corps du message</label>
          <textarea
            id="cc-body"
            className="cc-textarea"
            placeholder="Rédige le message ici — il sera utilisé pour l'email et/ou le SMS selon les canaux choisis."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {channels.sms && (
            <div className={`cc-hint ${smsSegments > 1 ? 'warn' : ''}`}>
              {body.length} caractère{body.length > 1 ? 's' : ''} · {smsSegments || 1} SMS estimé{(smsSegments || 1) > 1 ? 's' : ''} par destinataire
            </div>
          )}
        </div>
      </div>

      <div className="cc-send-bar">
        <div className="cc-send-count">
          {poolLoading ? 'Chargement des destinataires…' : (
            <>Prêt à envoyer à <strong>{recipientCount}</strong> destinataire{recipientCount > 1 ? 's' : ''}</>
          )}
        </div>
        {!confirming ? (
          <button className="cc-send-btn" disabled={!canSend} onClick={() => setConfirming(true)}>
            Envoyer
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="cc-cancel-btn" onClick={() => setConfirming(false)} disabled={sending}>
              Annuler
            </button>
            <button className="cc-send-btn" onClick={handleSend} disabled={sending}>
              {sending ? 'Envoi…' : `Confirmer l'envoi à ${recipientCount}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
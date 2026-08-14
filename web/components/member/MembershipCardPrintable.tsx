// web/components/member/MembershipCardPrintable.tsx
'use client';

import { RefObject } from 'react';
import QRCode from 'react-qr-code';
import type { VirtualCardData } from '../../lib/api-client';

const CARD_WIDTH = 640;
const CARD_HEIGHT = 404; // ratio ID-1 (85.6 x 54mm)

interface MembershipCardPrintableProps {
  card: VirtualCardData;
  frontRef: RefObject<HTMLDivElement | null>;
  backRef: RefObject<HTMLDivElement | null>;
}

export function MembershipCardPrintable({ card, frontRef, backRef }: MembershipCardPrintableProps) {
  const isExpired = card.expiresAt ? new Date(card.expiresAt) < new Date() : false;

  const verificationUrl = card.qrToken
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://lelouma.com'}/verify-card/${card.qrToken}`
    : 'https://lelouma.com/verify-card/pending';

  const expiryFormatted = card.expiresAt
    ? new Date(card.expiresAt).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' })
    : 'N/A';

  const birthYear = card.user.birthDate
    ? new Date(card.user.birthDate).getFullYear().toString()
    : 'N/A';

  const cardNum = card.cardNumber ? card.cardNumber.replace(/[\s-]/g, '') : 'EN ATTENTE';
  const residence = [card.user.city, card.user.country].filter(Boolean).join(', ') || 'Non renseignée';
  const origin = card.user.originVillage || card.user.originCommune || card.user.originSubPrefecture || 'Non renseignée';
  const antenna = card.antennaName || 'Non assignée';
  const memberProfession = card.user.function || card.user.professionalStatus || 'Non renseignée';

  const safeFirstName = card.user.firstName || '';
  const safeLastName = card.user.lastName || '';
  const displayName = safeFirstName || safeLastName ? `${safeLastName} ${safeFirstName}`.trim() : 'Membre';

  const avatarUrl =
    card.user.profilePhotoUrl ||
    `https://ui-avatars.com/api/?name=${safeFirstName || 'L'}+${safeLastName || 'C'}&background=E8D2AB&color=6B4A2B`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');

        .mcp-face, .mcp-face * { box-sizing: border-box; }

        .mcp-face {
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
          background-color: #ffffff;
        }

        .mcp-front { display: flex; flex-direction: column; justify-content: space-between; padding: 1.25rem; }
        .mcp-front::before {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 38%;
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="%23eaddcd" fill-opacity="1" d="M0,128L48,138.7C96,149,192,171,288,165.3C384,160,480,128,576,133.3C672,139,768,181,864,192C960,203,1056,181,1152,154.7C1248,128,1344,96,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path><path fill="%232b6b4f" fill-opacity="1" d="M0,192L48,181.3C96,171,192,149,288,149.3C384,149,480,171,576,181.3C672,192,768,192,864,181.3C960,171,1056,149,1152,144C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path><path fill="%2311402e" fill-opacity="1" d="M0,256L48,245.3C96,235,192,213,288,208C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
          background-size: cover; z-index: 0; pointer-events: none;
        }

        .mcp-back { display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .mcp-back::before {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 15%;
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="%230f3d2e" fill-opacity="1" d="M0,288L48,277.3C96,267,192,245,288,250.7C384,256,480,288,576,277.3C672,267,768,213,864,202.7C960,192,1056,224,1152,250.7C1248,277,1344,299,1392,309.3L1440,320L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
          background-size: cover; z-index: 0; pointer-events: none;
        }

        .mcp-top, .mcp-mid, .mcp-bottom, .mcp-back-inner { position: relative; z-index: 1; }

        .mcp-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
        .mcp-logo-row { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
        .mcp-logo-ring, .mcp-back-logo-ring {
          border-radius: 50%; overflow: hidden; background: #fff; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0;
          width: 38px; height: 38px; border: 2px solid rgba(15, 61, 46, 0.15);
        }
        .mcp-org, .mcp-back-org {
          font-size: 0.78rem; font-weight: 800; line-height: 1.12; letter-spacing: 0.13em;
          text-transform: uppercase; color: #0f3d2e;
        }

        .mcp-top-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
        .mcp-status {
          display: inline-flex; align-items: center; gap: 0.38rem; padding: 0.34rem 0.72rem;
          border-radius: 999px; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; white-space: nowrap; flex-shrink: 0;
        }
        .mcp-status.valid { background: rgba(27, 94, 66, 0.08); border: 1px solid rgba(27, 94, 66, 0.2); color: #1b5e42; }
        .mcp-status.invalid { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; }
        .mcp-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

        .mcp-guinea-flag, .mcp-guinea-flag-recto {
          width: 34px; height: 24px; display: flex; border-radius: 2px; overflow: hidden;
        }
        .mcp-guinea-flag::before, .mcp-guinea-flag-recto::before { content: ''; flex: 1; background-color: #CE1126; }
        .mcp-guinea-flag-mid { flex: 1; background-color: #FCD116; }
        .mcp-guinea-flag::after, .mcp-guinea-flag-recto::after { content: ''; flex: 1; background-color: #009460; }

        .mcp-mid { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 1rem; align-items: center; }
        .mcp-photo-wrap {
          width: 92px; aspect-ratio: 3 / 4; border-radius: 12px; border: 2px solid #fff;
          overflow: hidden; background: #f1f5f9; flex-shrink: 0;
        }
        .mcp-photo-wrap img { width: 100%; height: 100%; object-fit: cover; }

        .mcp-info { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
        .mcp-role-tag { margin-bottom: 0.22rem; font-size: 0.68rem; font-weight: 800; color: #1b5e42; letter-spacing: 0.14em; text-transform: uppercase; }
        .mcp-name { margin-bottom: 0.45rem; font-family: 'Cormorant Garamond', serif; font-size: 1.9rem; font-weight: 700; line-height: 0.98; color: #0f172a; word-break: break-word; }

        .mcp-detail-grid { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 0.7rem; row-gap: 0.34rem; }
        .mcp-detail-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; white-space: nowrap; }
        .mcp-detail-val { min-width: 0; font-size: 0.86rem; font-weight: 700; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .mcp-bottom { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.8rem; align-items: end; padding-top: 0.65rem; }
        .mcp-card-id-label, .mcp-exp-label {
          display: block; margin-bottom: 2px; font-size: 0.56rem; font-weight: 800; letter-spacing: 0.15em;
          text-transform: uppercase; color: #0f172a; text-shadow: 0 1px 2px rgba(255,255,255,0.85);
        }
        .mcp-exp-block { text-align: right; }
        .mcp-card-num, .mcp-exp-val {
          font-family: 'DM Mono', monospace; color: #ffffff; text-shadow: 0 1px 4px rgba(0,0,0,0.65); white-space: nowrap;
        }
        .mcp-card-num { font-size: 1rem; letter-spacing: 0.14em; }
        .mcp-exp-val { font-size: 0.92rem; font-weight: 700; letter-spacing: 0.08em; }

        .mcp-back-inner {
          width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center;
          justify-content: space-evenly; gap: 0.3rem; text-align: center;
        }
        .mcp-back-header { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 0.5rem; }
        .mcp-back-logo-group { display: flex; align-items: center; gap: 0.62rem; }
        .mcp-back-org { font-size: 0.85rem; letter-spacing: 0.14em; }
        .mcp-back-sep { width: 100%; height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); }
        .mcp-back-title { font-size: 0.66rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #1b5e42; }
        .mcp-qr-card { width: fit-content; background: #fff; border-radius: 12px; padding: 8px; }
        .mcp-back-footer { max-width: 310px; font-size: 0.62rem; font-weight: 500; line-height: 1.4; color: #475569; }
      `}</style>

      {/* RECTO */}
      <div ref={frontRef} className="mcp-face mcp-front" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
        <div className="mcp-top">
          <div className="mcp-logo-row">
            <div className="mcp-logo-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/images/logolcd.jpg" alt="Logo" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span className="mcp-org">
              Lélouma<br />Communauté<br />
              <span style={{ textTransform: 'none', fontWeight: 600, fontSize: '0.88em' }}>pour le </span>Développement
            </span>
          </div>
          <div className="mcp-top-actions">
            <span className={`mcp-status ${!isExpired ? 'valid' : 'invalid'}`}>
              <span className="mcp-status-dot" />
              {!isExpired ? 'Actif' : 'Expiré'}
            </span>
            <div className="mcp-guinea-flag-recto">
              <div className="mcp-guinea-flag-mid" />
            </div>
          </div>
        </div>

        <div className="mcp-mid">
          <div className="mcp-photo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt="Photo membre" crossOrigin="anonymous" />
          </div>
          <div className="mcp-info">
            <div className="mcp-role-tag">Membre adhérent</div>
            <div className="mcp-name">{displayName}</div>
            <div className="mcp-detail-grid">
              <span className="mcp-detail-label">Né(e) en</span>
              <span className="mcp-detail-val">{birthYear}</span>
              <span className="mcp-detail-label">Origine</span>
              <span className="mcp-detail-val">{origin}</span>
              <span className="mcp-detail-label">Résidence</span>
              <span className="mcp-detail-val">{residence}</span>
              <span className="mcp-detail-label">Antenne</span>
              <span className="mcp-detail-val">{antenna}</span>
              <span className="mcp-detail-label">Poste occupé</span>
              <span className="mcp-detail-val">{memberProfession}</span>
            </div>
          </div>
        </div>

        <div className="mcp-bottom">
          <div>
            <span className="mcp-card-id-label">N° identifiant unique</span>
            <span className="mcp-card-num">{cardNum}</span>
          </div>
          <div className="mcp-exp-block">
            <span className="mcp-exp-label">Expire fin</span>
            <span className="mcp-exp-val">{expiryFormatted}</span>
          </div>
        </div>
      </div>

      {/* VERSO */}
      <div ref={backRef} className="mcp-face mcp-back" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
        <div className="mcp-back-inner">
          <div className="mcp-back-header">
            <div className="mcp-back-logo-group">
              <div className="mcp-back-logo-ring">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/images/logolcd.jpg" alt="Logo" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="mcp-back-org">
                LÉLOUMA<br />COMMUNAUTÉ<br />
                <span style={{ textTransform: 'none', fontWeight: 600, fontSize: '0.88em' }}>pour le </span>DÉVELOPPEMENT
              </div>
            </div>
            <div className="mcp-guinea-flag">
              <div className="mcp-guinea-flag-mid" />
            </div>
          </div>

          <div className="mcp-back-sep" />
          <div className="mcp-back-title">Scan d&apos;authenticité</div>

          <div className="mcp-qr-card">
            <QRCode value={verificationUrl} size={130} level="H" bgColor="#FFFFFF" fgColor="#111827" />
          </div>

          <p className="mcp-back-footer">
            Présentez ce QR Code lors des assemblées générales ou réunions d&apos;antenne
            pour certifier votre statut de membre actif.
          </p>
        </div>
      </div>
    </>
  );
}
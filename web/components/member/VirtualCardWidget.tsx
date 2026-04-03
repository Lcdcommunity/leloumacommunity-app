// web/components/member/VirtualCardWidget.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';
import Image from 'next/image';

export interface VirtualCardData {
  cardNumber: string;
  isLocked: boolean;
  expiresAt: string | null;
  qrToken: string;
  user: {
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    placeOfBirth?: string | null;
    birthCountry?: string | null;
    originVillage?: string | null;
    originCommune?: string | null;
    country?: string | null;
    city?: string | null;
    postalCode?: string | null;
    profilePhotoUrl?: string | null;
    function?: string | null;
    professionalStatus?: string | null;
  };
  antennaName: string;
}

export function VirtualCardWidget({ card }: { card: VirtualCardData | null }) {
  const [flipped, setFlipped] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  const calcTilt = useCallback((clientX: number, clientY: number) => {
    const el = sceneRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (clientX - cx) / (rect.width / 2);
    const dy = (clientY - cy) / (rect.height / 2);

    setTilt({
      x: dy * -10,
      y: dx * 12,
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      calcTilt(e.clientX, e.clientY);
    },
    [calcTilt],
  );

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('.vcw-minimize-btn')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { ...offset };

    if (e.pointerType === 'touch') {
      setIsHovering(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      hasMoved.current = true;
    }

    setOffset({
      x: initialOffset.current.x + dx,
      y: initialOffset.current.y + dy,
    });

    if (e.pointerType === 'mouse') {
      calcTilt(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // no-op
      }
    }

    if (e.pointerType === 'touch') {
      setIsHovering(false);
      setTilt({ x: 0, y: 0 });
    }

    if (!hasMoved.current && !isMinimized) {
      if (!(e.target as HTMLElement).closest('.vcw-controls')) {
        setFlipped((f) => !f);
      }
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setOffset({ x: 0, y: 0 });
  };

  const cardTransform = (() => {
    if (!isHovering) {
      return flipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    }

    return `rotateX(${tilt.x}deg) rotateY(${flipped ? 180 + tilt.y : tilt.y}deg)`;
  })();

  const transitionStyle = isHovering
    ? 'transform 0.08s linear'
    : 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)';

  const isExpired = card?.expiresAt ? new Date(card.expiresAt) < new Date() : false;
  const isLocked = !card || card.isLocked || isExpired;

  const verificationUrl = card?.qrToken
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://lelouma.com'}/verify-card/${card.qrToken}`
    : 'https://lelouma.com/verify-card/pending';

  const expiryFormatted = card?.expiresAt
    ? new Date(card.expiresAt).toLocaleDateString('fr-FR', {
        month: '2-digit',
        year: '2-digit',
      })
    : 'N/A';

  const birthYear = card?.user?.birthDate
    ? new Date(card.user.birthDate).getFullYear().toString()
    : 'N/A';

  const cardNum = card?.cardNumber ? card.cardNumber.replace(/[\s-]/g, '') : 'EN ATTENTE';
  const residence = [card?.user?.city, card?.user?.country].filter(Boolean).join(', ') || 'Non renseignée';
  const origin = card?.user?.originVillage || 'Non renseignée';
  const antenna = card?.antennaName || 'Non assignée';
  
  // Prise en compte chirurgicale du poste occupé (function) puis du statut pro (professionalStatus)
  const memberProfession = card?.user?.function || card?.user?.professionalStatus || 'Non renseignée';

  const safeFirstName = card?.user?.firstName || '';
  const safeLastName = card?.user?.lastName || '';
  const displayName = safeFirstName || safeLastName ? `${safeLastName} ${safeFirstName}`.trim() : 'Membre';

  const avatarUrl =
    card?.user?.profilePhotoUrl ||
    `https://ui-avatars.com/api/?name=${safeFirstName || 'L'}+${safeLastName || 'C'}&background=E8D2AB&color=6B4A2B`;

  if (isMinimized) {
    return (
      <>
        <style>{`
          .vcw-fab {
            position: fixed;
            right: 18px;
            bottom: 86px;
            z-index: 9999;
            display: inline-flex;
            align-items: center;
            gap: 0.55rem;
            padding: 0.8rem 1.05rem;
            border-radius: 999px;
            border: 1px solid rgba(215, 184, 108, 0.35);
            background:
              linear-gradient(135deg, #0f3d2e 0%, #1b5e42 32%, #c89f3d 100%);
            color: #fffdf6;
            font-family: 'DM Sans', sans-serif;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow:
              0 12px 30px rgba(17, 60, 46, 0.30),
              0 0 18px rgba(220, 188, 92, 0.18);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            animation: vcw-popin 0.28s ease-out forwards;
          }

          .vcw-fab:hover {
            transform: translateY(-2px);
            box-shadow:
              0 16px 34px rgba(17, 60, 46, 0.36),
              0 0 24px rgba(220, 188, 92, 0.26);
          }

          @keyframes vcw-popin {
            from { opacity: 0; transform: scale(0.88); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        <button className="vcw-fab" onClick={() => setIsMinimized(false)} type="button">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Afficher ma carte
        </button>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');

        .vcw-draggable-container,
        .vcw-draggable-container * {
          box-sizing: border-box;
        }

        .vcw-draggable-container {
          position: relative;
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
          font-family: 'DM Sans', sans-serif;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          will-change: transform;
        }

        .vcw-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 0.5rem 0.6rem 0.5rem;
        }

        .vcw-drag-handle {
          display: flex;
          align-items: center;
          gap: 0.42rem;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #94A3B8;
          pointer-events: none;
        }

        .vcw-minimize-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: rgba(255,255,255,0.55);
          color: #244434;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          pointer-events: auto;
          transition: all 0.2s ease;
        }

        .vcw-minimize-btn:hover {
          background: rgba(255,255,255,0.82);
          color: #0F172A;
        }

        .vcw-scene {
          width: 100%;
          aspect-ratio: 1.586;
          perspective: 1600px;
          cursor: grab;
        }

        .vcw-draggable-container:active .vcw-scene {
          cursor: grabbing;
        }

        .vcw-inner {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 24px;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          will-change: transform;
        }

        .vcw-face {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          overflow: hidden;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .vcw-front,
        .vcw-back {
          box-shadow:
            0 0 0 1px rgba(15, 61, 46, 0.08) inset,
            0 18px 30px rgba(12, 38, 29, 0.12),
            0 0 25px rgba(225, 191, 94, 0.05);
          transition: box-shadow 0.35s ease;
        }

        .vcw-scene.elevated .vcw-front,
        .vcw-scene.elevated .vcw-back {
          box-shadow:
            0 0 0 1px rgba(15, 61, 46, 0.12) inset,
            0 28px 44px rgba(12, 38, 29, 0.18),
            0 0 34px rgba(225, 191, 94, 0.1);
        }

        .vcw-front {
          background-color: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.25rem;
          z-index: 2;
          transform: rotateY(0deg);
          position: relative;
        }

        /* Vagues au fond du recto (beige, vert clair, vert foncé) */
        .vcw-front::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 38%;
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="%23eaddcd" fill-opacity="1" d="M0,128L48,138.7C96,149,192,171,288,165.3C384,160,480,128,576,133.3C672,139,768,181,864,192C960,203,1056,181,1152,154.7C1248,128,1344,96,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path><path fill="%232b6b4f" fill-opacity="1" d="M0,192L48,181.3C96,171,192,149,288,149.3C384,149,480,171,576,181.3C672,192,768,192,864,181.3C960,171,1056,149,1152,144C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path><path fill="%2311402e" fill-opacity="1" d="M0,256L48,245.3C96,235,192,213,288,208C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
          background-size: cover;
          z-index: 0;
          pointer-events: none;
        }

        .vcw-back {
          transform: rotateY(180deg);
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1;
        }

        /* Vague verte au fond du verso */
        .vcw-back::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 15%;
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="%230f3d2e" fill-opacity="1" d="M0,288L48,277.3C96,267,192,245,288,250.7C384,256,480,288,576,277.3C672,267,768,213,864,202.7C960,192,1056,224,1152,250.7C1248,277,1344,299,1392,309.3L1440,320L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
          background-size: cover;
          z-index: 0;
          pointer-events: none;
        }

        .vcw-shimmer {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          border-radius: 24px;
          background:
            radial-gradient(
              ellipse at var(--mx, 50%) var(--my, 50%),
              rgba(255, 255, 255, 0.6) 0%,
              rgba(255, 255, 255, 0.2) 30%,
              transparent 62%
            );
          mix-blend-mode: overlay;
          transition: opacity 0.25s ease;
        }

        .vcw-top, .vcw-mid, .vcw-bottom {
          position: relative;
          z-index: 3;
        }

        .vcw-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .vcw-logo-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
        }

        .vcw-logo-ring,
        .vcw-back-logo-ring {
          border-radius: 50%;
          overflow: hidden;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .vcw-logo-ring {
          width: 38px;
          height: 38px;
          border: 2px solid rgba(15, 61, 46, 0.15);
          box-shadow: 0 4px 12px rgba(10, 47, 36, 0.08);
        }

        .vcw-org {
          font-size: 0.78rem;
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #0f3d2e;
        }
        
        .vcw-top-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .vcw-status {
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
          padding: 0.34rem 0.72rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .vcw-status.valid {
          background: rgba(27, 94, 66, 0.08);
          border: 1px solid rgba(27, 94, 66, 0.2);
          color: #1b5e42;
        }

        .vcw-status.invalid {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .vcw-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          background: currentColor;
          animation: vcwblink 2s ease-in-out infinite;
        }

        @keyframes vcwblink {
          0%,100% { opacity: 1; box-shadow: 0 0 8px currentColor; }
          50% { opacity: 0.35; box-shadow: none; }
        }

        /* Drapeau de la Guinée */
        .vcw-guinea-flag, .vcw-guinea-flag-recto {
          width: 34px;
          height: 24px;
          display: flex;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .vcw-guinea-flag::before, .vcw-guinea-flag-recto::before {
          content: ''; flex: 1; background-color: #CE1126; /* Rouge */
        }
        .vcw-guinea-flag-mid {
          flex: 1; background-color: #FCD116; /* Jaune */
        }
        .vcw-guinea-flag::after, .vcw-guinea-flag-recto::after {
          content: ''; flex: 1; background-color: #009460; /* Vert */
        }

        .vcw-mid {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 1rem;
          align-items: center;
        }

        .vcw-photo-wrap {
          width: 92px;
          aspect-ratio: 3 / 4;
          border-radius: 12px;
          border: 2px solid #ffffff;
          box-shadow: 0 6px 16px rgba(10, 47, 36, 0.12);
          overflow: hidden;
          background: #f1f5f9;
          position: relative;
          flex-shrink: 0;
        }

        .vcw-photo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vcw-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .vcw-role-tag {
          margin-bottom: 0.22rem;
          font-size: 0.68rem;
          font-weight: 800;
          color: #1b5e42;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .vcw-name {
          margin-bottom: 0.45rem;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.9rem;
          font-weight: 700;
          line-height: 0.98;
          letter-spacing: 0.01em;
          color: #0f172a;
          word-break: break-word;
        }

        .vcw-detail-grid {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          column-gap: 0.7rem;
          row-gap: 0.34rem;
          margin-top: 0.08rem;
        }

        .vcw-detail-label {
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #64748b;
          align-self: start;
          white-space: nowrap;
        }

        .vcw-detail-val {
          min-width: 0;
          font-size: 0.86rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcw-bottom {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.8rem;
          align-items: end;
          padding-top: 0.65rem;
        }

        .vcw-card-id-block {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .vcw-exp-block {
          text-align: right;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .vcw-card-id-label,
        .vcw-exp-label {
          display: block;
          margin-bottom: 2px;
          font-size: 0.56rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #0f172a; /* Texte sombre pour visibilité parfaite */
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.85); /* Ombre claire pour contraster avec la vague */
        }

        .vcw-card-num {
          font-family: 'DM Mono', monospace;
          font-size: 1rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          color: #ffffff; /* Valeur en blanc */
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.65); /* Ombre foncée pour bien ressortir */
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcw-exp-val {
          font-family: 'DM Mono', monospace;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #ffffff;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.65);
          white-space: nowrap;
        }

        .vcw-back-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-evenly;
          gap: 0.3rem;
          padding: 0;
          text-align: center;
        }

        .vcw-back-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0 0.5rem;
        }

        .vcw-back-logo-group {
          display: flex;
          align-items: center;
          gap: 0.62rem;
        }
        .vcw-back-logo-ring {
          width: 36px;
          height: 36px;
          border: 2px solid rgba(15, 61, 46, 0.15);
          box-shadow: 0 2px 8px rgba(10, 47, 36, 0.08);
        }

        .vcw-back-org {
          font-size: 0.85rem;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #0f3d2e;
        }

        .vcw-back-sep {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
        }

        .vcw-back-title {
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #1b5e42;
        }

        .vcw-qr-card {
          width: fit-content;
          background: #ffffff;
          border-radius: 12px;
          padding: 6px;
          box-shadow: 0 8px 24px rgba(10, 47, 36, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vcw-back-footer {
          max-width: 310px;
          font-size: 0.62rem;
          font-weight: 500;
          line-height: 1.4;
          color: #475569;
        }

        .vcw-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 0.82rem;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: #94A3B8;
          animation: vcwfade 0.45s 0.2s both;
        }

        @keyframes vcwfade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .vcw-locked-scene {
          width: 100%;
          aspect-ratio: 1.586;
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 48px rgba(15,23,42,0.15);
        }

        .vcw-locked-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
        }

        .vcw-locked-overlay {
          position: absolute;
          inset: 0;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          text-align: center;
          background: rgba(255,255,255,0.62);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.8) inset;
        }

        .vcw-lock-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          box-shadow: 0 8px 20px rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vcw-lock-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.35rem;
          font-weight: 600;
          line-height: 1.2;
          color: #0F172A;
        }

        .vcw-lock-sub {
          max-width: 260px;
          font-size: 0.76rem;
          line-height: 1.55;
          color: #475569;
        }

        .vcw-lock-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.72rem 1.35rem;
          border-radius: 12px;
          border: none;
          background: #0F172A;
          color: #FFFFFF;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-decoration: none;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(15,23,42,0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .vcw-lock-btn:hover {
          transform: translateY(-2px);
          background: #1E293B;
          box-shadow: 0 8px 24px rgba(15,23,42,0.45);
        }

        @media (max-width: 560px) {
          .vcw-draggable-container {
            max-width: 100%;
          }

          .vcw-controls {
            padding: 0 0.25rem 0.45rem 0.25rem;
          }

          .vcw-drag-handle {
            font-size: 0.64rem;
            letter-spacing: 0.11em;
          }

          .vcw-minimize-btn {
            width: 32px;
            height: 32px;
          }

          .vcw-inner,
          .vcw-face,
          .vcw-front,
          .vcw-back,
          .vcw-locked-scene {
            border-radius: 20px;
          }

          .vcw-front {
            padding: 0.9rem;
          }

          .vcw-top {
            gap: 0.45rem;
          }

          .vcw-logo-ring {
            width: 30px;
            height: 30px;
          }

          .vcw-org {
            font-size: 0.58rem;
            line-height: 1.08;
            letter-spacing: 0.12em;
          }

          .vcw-top-actions {
            gap: 0.35rem;
          }

          .vcw-status {
            padding: 0.26rem 0.58rem;
            font-size: 0.54rem;
          }
          
          .vcw-guinea-flag, .vcw-guinea-flag-recto {
            width: 26px;
            height: 18px;
          }

          .vcw-mid {
            grid-template-columns: 74px minmax(0, 1fr);
            gap: 0.72rem;
          }

          .vcw-photo-wrap {
            width: 74px;
            border-radius: 10px;
          }

          .vcw-role-tag {
            font-size: 0.52rem;
            margin-bottom: 0.14rem;
          }

          .vcw-name {
            font-size: 1.08rem;
            line-height: 0.98;
            margin-bottom: 0.28rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .vcw-detail-grid {
            column-gap: 0.48rem;
            row-gap: 0.22rem;
          }

          .vcw-detail-label {
            font-size: 0.44rem;
          }

          .vcw-detail-val {
            font-size: 0.52rem;
          }

          .vcw-bottom {
            gap: 0.55rem;
            padding-top: 0.42rem;
          }

          .vcw-card-id-label,
          .vcw-exp-label {
            font-size: 0.42rem;
            margin-bottom: 1px;
          }

          .vcw-card-num {
            font-size: 0.64rem;
            letter-spacing: 0.1em;
          }

          .vcw-exp-val {
            font-size: 0.58rem;
          }

          .vcw-back {
            padding: 0.5rem 0.8rem;
          }

          .vcw-back-inner {
            gap: 0.25rem;
          }

          .vcw-back-header {
            padding: 0 0.2rem;
          }

          .vcw-back-logo-ring {
            width: 26px;
            height: 26px;
          }

          .vcw-back-org {
            font-size: 0.6rem;
            letter-spacing: 0.12em;
          }

          .vcw-back-title {
            font-size: 0.5rem;
          }

          .vcw-qr-card {
            padding: 4px;
            border-radius: 10px;
          }

          .vcw-back-footer {
            max-width: 95%;
            font-size: 0.46rem;
            line-height: 1.25;
            margin-top: 0.1rem;
          }

          .vcw-hint {
            margin-top: 0.6rem;
            font-size: 0.72rem;
          }
        }
      `}</style>

      <div
        className="vcw-draggable-container"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          zIndex: offset.x !== 0 || offset.y !== 0 ? 100 : 10,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="vcw-controls">
          <div className="vcw-drag-handle">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 15h8" />
            </svg>
            Glisser pour déplacer
          </div>

          <button
            className="vcw-minimize-btn"
            onClick={handleMinimize}
            title="Masquer la carte"
            type="button"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5" />
            </svg>
          </button>
        </div>

        {isLocked ? (
          <>
            <div className="vcw-locked-scene">
              <div className="vcw-locked-bg" />
              <div className="vcw-locked-overlay">
                <div className="vcw-lock-icon-wrap">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#0F172A" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                <div className="vcw-lock-title">Carte verrouillée</div>

                <p className="vcw-lock-sub">
                  {isExpired
                    ? "Votre carte a expiré. Veuillez la renouveler pour continuer à l'utiliser."
                    : "Réglez votre adhésion annuelle pour débloquer votre carte membre."}
                </p>

                <a
                  href="/member/contributions/new"
                  className="vcw-lock-btn"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Régler ma carte
                </a>
              </div>
            </div>

            <div className="vcw-hint">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              Votre QR code sera disponible après activation
            </div>
          </>
        ) : (
          <>
            <div
              ref={sceneRef}
              className={`vcw-scene ${isHovering || isDragging ? 'elevated' : ''}`}
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              role="button"
              aria-label={flipped ? "Voir l'avant de la carte" : 'Voir le QR code'}
            >
              <div
                className="vcw-inner"
                style={{
                  transform: cardTransform,
                  transition: transitionStyle,
                }}
              >
                <div className="vcw-face vcw-front">
                  <div
                    className="vcw-shimmer"
                    style={{
                      '--mx': `${50 + (tilt.y / 12) * 50}%`,
                      '--my': `${50 - (tilt.x / 10) * 50}%`,
                      opacity: isHovering ? 1 : 0,
                    } as React.CSSProperties}
                  />

                  <div className="vcw-top">
                    <div className="vcw-logo-row">
                      <div className="vcw-logo-ring">
                        <Image
                          src="/assets/images/logolcd.jpg"
                          alt="Logo"
                          width={38}
                          height={38}
                          style={{ objectFit: 'cover', borderRadius: '50%' }}
                        />
                      </div>

                      <span className="vcw-org">
                        Lélouma
                        <br />
                        Communauté
                      </span>
                    </div>

                    <div className="vcw-top-actions">
                      <span className={`vcw-status ${!isExpired ? 'valid' : 'invalid'}`}>
                        <span className="vcw-status-dot" />
                        {!isExpired ? 'Actif' : 'Expiré'}
                      </span>
                      <div className="vcw-guinea-flag-recto">
                        <div className="vcw-guinea-flag-mid" />
                      </div>
                    </div>
                  </div>

                  <div className="vcw-mid">
                    <div className="vcw-photo-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl} alt="Photo membre" />
                    </div>

                    <div className="vcw-info">
                      <div className="vcw-role-tag">Membre adhérent</div>

                      <div className="vcw-name">{displayName}</div>

                      <div className="vcw-detail-grid">
                        <span className="vcw-detail-label">Né(e) en</span>
                        <span className="vcw-detail-val">{birthYear}</span>

                        <span className="vcw-detail-label">Origine</span>
                        <span className="vcw-detail-val">{origin}</span>

                        <span className="vcw-detail-label">Résidence</span>
                        <span className="vcw-detail-val">{residence}</span>

                        <span className="vcw-detail-label">Antenne</span>
                        <span className="vcw-detail-val">{antenna}</span>

                        <span className="vcw-detail-label">Poste occupé</span>
                        <span className="vcw-detail-val">{memberProfession}</span>
                      </div>
                    </div>
                  </div>

                  <div className="vcw-bottom">
                    <div className="vcw-card-id-block">
                      <span className="vcw-card-id-label">N° identifiant unique</span>
                      <span className="vcw-card-num">{cardNum}</span>
                    </div>

                    <div className="vcw-exp-block">
                      <span className="vcw-exp-label">Expire fin</span>
                      <span className="vcw-exp-val">{expiryFormatted}</span>
                    </div>
                  </div>
                </div>

                <div className="vcw-face vcw-back">
                  <div className="vcw-back-inner">
                    <div className="vcw-back-header">
                      <div className="vcw-back-logo-group">
                        <div className="vcw-back-logo-ring">
                          <Image
                            src="/assets/images/logolcd.jpg"
                            alt="Logo"
                            width={38}
                            height={38}
                            style={{ objectFit: 'cover', borderRadius: '50%' }}
                          />
                        </div>
                        <div className="vcw-back-org">LELOUMA COMMUNAUTE</div>
                      </div>
                      
                      <div className="vcw-guinea-flag">
                        <div className="vcw-guinea-flag-mid" />
                      </div>
                    </div>

                    <div className="vcw-back-sep" />

                    <div className="vcw-back-title">Scan d&apos;authenticité</div>

                    <div className="vcw-qr-card">
                      {verificationUrl ? (
                        <QRCode
                          value={verificationUrl}
                          size={typeof window !== 'undefined' && window.innerWidth <= 560 ? 80 : 100}
                          level="H"
                          bgColor="#FFFFFF"
                          fgColor="#111827"
                        />
                      ) : (
                        <div
                          style={{
                            width: typeof window !== 'undefined' && window.innerWidth <= 560 ? 80 : 100,
                            height: typeof window !== 'undefined' && window.innerWidth <= 560 ? 80 : 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9CA3AF',
                            fontSize: '.78rem',
                            fontWeight: 700,
                          }}
                        >
                          Indisp.
                        </div>
                      )}
                    </div>

                    <p className="vcw-back-footer">
                      Présentez ce QR Code lors des assemblées générales ou réunions d&apos;antenne
                      pour certifier votre statut de membre actif.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="vcw-hint">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {flipped ? "Cliquer pour voir l'avant de la carte" : 'Cliquer pour afficher le QR code'}
            </div>
          </>
        )}
      </div>
    </>
  );
}
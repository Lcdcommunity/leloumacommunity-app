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
  const memberProfession = card?.user?.function || 'Non renseignée';

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
            0 0 0 1px rgba(255, 229, 168, 0.22) inset,
            0 18px 30px rgba(12, 38, 29, 0.24),
            0 0 25px rgba(225, 191, 94, 0.12);
          transition: box-shadow 0.35s ease;
        }

        .vcw-scene.elevated .vcw-front,
        .vcw-scene.elevated .vcw-back {
          box-shadow:
            0 0 0 1px rgba(255, 233, 170, 0.32) inset,
            0 28px 44px rgba(12, 38, 29, 0.30),
            0 0 34px rgba(225, 191, 94, 0.22);
        }

        .vcw-front {
          background-color: #0f3d2e;
          background-image:
            radial-gradient(circle at 12% 18%, rgba(255,255,255,0.34) 0%, transparent 18%),
            radial-gradient(circle at 84% 16%, rgba(255,233,170,0.34) 0%, transparent 18%),
            radial-gradient(circle at 72% 66%, rgba(255,213,79,0.18) 0%, transparent 22%),
            radial-gradient(circle at 22% 78%, rgba(255,255,255,0.12) 0%, transparent 18%),
            linear-gradient(120deg, rgba(255,255,255,0) 16%, rgba(255,255,255,0.18) 24%, rgba(255,255,255,0.04) 32%, rgba(255,255,255,0) 42%),
            linear-gradient(135deg, #0a2f24 0%, #14543d 24%, #1f7a53 48%, #c6a03b 78%, #f2d77c 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.25rem;
          z-index: 2;
          transform: rotateY(0deg);
        }

        .vcw-front::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background:
            radial-gradient(ellipse at 14% 16%, rgba(255,255,255,0.30) 0%, transparent 26%),
            radial-gradient(ellipse at 88% 24%, rgba(255,230,150,0.26) 0%, transparent 28%),
            radial-gradient(ellipse at 62% 72%, rgba(255,255,255,0.10) 0%, transparent 24%),
            linear-gradient(125deg, rgba(255,255,255,0) 22%, rgba(255,255,255,0.20) 31%, rgba(255,255,255,0.04) 39%, rgba(255,255,255,0) 47%),
            repeating-linear-gradient(
              135deg,
              rgba(255,255,255,0.02) 0px,
              rgba(255,255,255,0.02) 2px,
              rgba(255,255,255,0) 2px,
              rgba(255,255,255,0) 10px
            );
          pointer-events: none;
          mix-blend-mode: screen;
          opacity: 0.98;
        }

        .vcw-front::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 24%, rgba(255,255,255,0) 76%, rgba(255,215,110,0.08) 100%);
          pointer-events: none;
        }

        .vcw-back {
          transform: rotateY(180deg);
          background-color: #0d382a;
          background-image:
            radial-gradient(circle at 14% 16%, rgba(255,255,255,0.26) 0%, transparent 18%),
            radial-gradient(circle at 84% 22%, rgba(255,227,142,0.28) 0%, transparent 20%),
            radial-gradient(circle at 60% 72%, rgba(255,213,79,0.12) 0%, transparent 22%),
            linear-gradient(135deg, #08261d 0%, #114734 30%, #1b6a4a 58%, #b88f2a 84%, #efd47a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1;
        }

        .vcw-back::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background:
            linear-gradient(125deg, rgba(255,255,255,0) 18%, rgba(255,255,255,0.16) 27%, rgba(255,255,255,0.03) 36%, rgba(255,255,255,0) 45%),
            radial-gradient(ellipse at 18% 18%, rgba(255,255,255,0.18) 0%, transparent 24%);
          pointer-events: none;
          mix-blend-mode: screen;
          opacity: 0.96;
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
              rgba(255, 255, 255, 0.42) 0%,
              rgba(255, 240, 188, 0.24) 18%,
              rgba(255, 228, 141, 0.12) 30%,
              transparent 62%
            );
          mix-blend-mode: screen;
          transition: opacity 0.25s ease;
        }

        .vcw-top {
          position: relative;
          z-index: 3;
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
          background: rgba(255,255,255,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .vcw-logo-ring {
          width: 38px;
          height: 38px;
          border: 2px solid rgba(245, 214, 120, 0.92);
          box-shadow:
            0 4px 12px rgba(10, 47, 36, 0.22),
            0 0 16px rgba(244, 214, 120, 0.20);
        }

        .vcw-org {
          font-size: 0.78rem;
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #f7efcf;
          text-shadow: 0 1px 1px rgba(0,0,0,0.12);
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
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .vcw-status.valid {
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(154, 255, 195, 0.42);
          color: #d8ffe7;
          box-shadow:
            0 0 10px rgba(111, 255, 167, 0.18),
            0 0 16px rgba(111, 255, 167, 0.08) inset;
        }

        .vcw-status.invalid {
          background: rgba(239, 68, 68, 0.14);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ffe5e5;
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

        .vcw-mid {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 1rem;
          align-items: center;
        }

        .vcw-photo-wrap {
          width: 92px;
          aspect-ratio: 3 / 4;
          border-radius: 12px;
          border: 2px solid rgba(248, 223, 143, 0.88);
          box-shadow:
            0 8px 20px rgba(10, 47, 36, 0.22),
            0 0 18px rgba(248, 223, 143, 0.20);
          overflow: hidden;
          background: rgba(255,255,255,0.22);
          position: relative;
          flex-shrink: 0;
        }

        .vcw-photo-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.10) 100%);
          pointer-events: none;
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
          color: #ffe7a1;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-shadow: 0 1px 1px rgba(0,0,0,0.18);
        }

        .vcw-name {
          margin-bottom: 0.45rem;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.9rem;
          font-weight: 700;
          line-height: 0.98;
          letter-spacing: 0.01em;
          color: #ffffff;
          text-shadow: 0 2px 10px rgba(0,0,0,0.18);
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
          color: rgba(255, 247, 220, 0.82);
          align-self: start;
          white-space: nowrap;
        }

        .vcw-detail-val {
          min-width: 0;
          font-size: 0.86rem;
          font-weight: 700;
          color: #fff6d7;
          line-height: 1.15;
          text-shadow: 0 1px 6px rgba(0,0,0,0.10);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcw-bottom {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.8rem;
          align-items: end;
          border-top: 1px solid rgba(255, 225, 135, 0.26);
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
        }

        .vcw-card-id-label {
          color: rgba(255, 244, 205, 0.82);
        }

        .vcw-exp-label {
          color: rgba(255, 244, 205, 0.82);
        }

        .vcw-card-num {
          font-family: 'DM Mono', monospace;
          font-size: 1rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          color: #ffffff;
          text-shadow: 0 1px 8px rgba(0,0,0,0.20);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcw-exp-val {
          font-family: 'DM Mono', monospace;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #fff1b8;
          text-shadow: 0 1px 8px rgba(0,0,0,0.18);
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
          justify-content: center;
          gap: 0.62rem;
          width: 100%;
        }

        .vcw-back-logo-ring {
          width: 36px;
          height: 36px;
          border: 2px solid rgba(248, 223, 143, 0.92);
          box-shadow:
            0 4px 12px rgba(10, 47, 36, 0.18),
            0 0 16px rgba(248, 223, 143, 0.18);
        }

        .vcw-back-org {
          font-size: 0.85rem;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #fff3ca;
          text-shadow: 0 1px 8px rgba(0,0,0,0.16);
        }

        .vcw-back-sep {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 224, 133, 0.74), transparent);
        }

        .vcw-back-title {
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fff8df;
        }

        .vcw-qr-card {
          width: fit-content;
          background: rgba(255,255,255,0.96);
          border-radius: 12px;
          padding: 6px;
          box-shadow:
            0 10px 24px rgba(10, 47, 36, 0.20),
            0 0 16px rgba(255, 248, 235, 0.22),
            0 0 22px rgba(248, 223, 143, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vcw-back-footer {
          max-width: 310px;
          font-size: 0.62rem;
          font-weight: 500;
          line-height: 1.4;
          color: #fff7de;
          text-shadow: 0 1px 6px rgba(0,0,0,0.10);
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

          .vcw-status {
            padding: 0.26rem 0.58rem;
            font-size: 0.54rem;
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

                    <span className={`vcw-status ${!isExpired ? 'valid' : 'invalid'}`}>
                      <span className="vcw-status-dot" />
                      {!isExpired ? 'Actif' : 'Expiré'}
                    </span>
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

                        <span className="vcw-detail-label">Profession</span>
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
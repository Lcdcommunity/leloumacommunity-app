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
    country?: string | null;
    city?: string | null;
    profilePhotoUrl?: string;
  };
  antennaName: string;
}

export function VirtualCardWidget({ card }: { card: VirtualCardData | null }) {
  const [flipped, setFlipped] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // ── Logique Gyroscope (Tilt & Shimmer) ──
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  const calcTilt = useCallback((clientX: number, clientY: number) => {
    const el = sceneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (clientX - cx) / (rect.width / 2);   // -1 → 1
    const dy = (clientY - cy) / (rect.height / 2);  // -1 → 1
    setTilt({ x: dy * -12, y: dx * 14 });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    calcTilt(e.clientX, e.clientY);
  }, [calcTilt]);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  // ── Logique de Drag & Drop (Déplacement Libre) ──
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // CORRECTION ICI : Utilisation de useState au lieu de useRef pour isDragging
  const [isDragging, setIsDragging] = useState(false); 
  const dragStart = useRef({ x: 0, y: 0 });
  const initialOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore clic droit et boutons de contrôle
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('.vcw-minimize-btn')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true); // MAJ de l'état
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { ...offset };
    
    // Si tactile, on active aussi le hover pour le reflet
    if (e.pointerType === 'touch') setIsHovering(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return; // Lecture de l'état

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMoved.current = true;
    }

    setOffset({
      x: initialOffset.current.x + dx,
      y: initialOffset.current.y + dy,
    });

    // Effet tilt pendant le drag
    calcTilt(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false); // MAJ de l'état
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (e.pointerType === 'touch') {
      setIsHovering(false);
      setTilt({ x: 0, y: 0 });
    }
  };

  // Clic pour retourner (uniquement s'il n'y a pas eu de glissement)
  const handleCardClick = () => {
    if (!hasMoved.current) {
      setFlipped(f => !f);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setOffset({ x: 0, y: 0 });
  };

  // ── Transform & Transitions ──
  const cardTransform = (() => {
    if (!isHovering) return flipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    return `rotateX(${tilt.x}deg) rotateY(${flipped ? 180 + tilt.y : tilt.y}deg)`;
  })();

  const transitionStyle = isHovering
    ? 'transform 0.08s linear, filter 0.2s'
    : 'transform 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.4s';


  // ── Données de la carte ──
  const isExpired = card?.expiresAt ? new Date(card.expiresAt) < new Date() : false;
  const isLocked = !card || card.isLocked || isExpired;

  const verificationUrl =
    card && !isLocked
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/verify-card/${card.qrToken}`
      : '';

  const expiryFormatted = card?.expiresAt
    ? new Date(card.expiresAt).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' })
    : 'N/A';

  const cardNum = card?.cardNumber
    ? card.cardNumber.match(/.{1,4}/g)?.join(' ') ?? card.cardNumber
    : '•••• •••• •••• ••••';

  // ── Rendu (Bouton flottant) ──
  if (isMinimized) {
    return (
      <>
        <style>{`
          .vcw-fab {
            position: fixed; bottom: 24px; right: 24px; z-index: 9999;
            background: linear-gradient(135deg, #00C6FF 0%, #0072FF 100%);
            color: #FFFFFF; border: 1px solid rgba(255,255,255,0.4);
            padding: 0.8rem 1.2rem; border-radius: 99px;
            font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700;
            display: flex; align-items: center; gap: 0.5rem; cursor: pointer;
            box-shadow: 0 10px 25px rgba(0, 114, 255, 0.4);
            animation: vcw-popin 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .vcw-fab:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(0, 114, 255, 0.5); }
          @keyframes vcw-popin { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        `}</style>
        <button className="vcw-fab" onClick={() => setIsMinimized(false)}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Afficher ma carte
        </button>
      </>
    );
  }

  // ── Rendu (Widget Principal) ──
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        /* Wrapper principal libre & draggable */
        .vcw-draggable-container {
          position: relative; 
          width: 100%; max-width: 400px; margin: 0 auto;
          font-family: 'DM Sans', sans-serif;
          touch-action: none;
          user-select: none; -webkit-user-select: none;
          will-change: transform;
        }

        /* ── BARRE DE CONTRÔLE ── */
        .vcw-controls {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 0.5rem 0.5rem 0.5rem;
        }
        .vcw-drag-handle {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
          color: #94A3B8; pointer-events: none;
        }
        .vcw-minimize-btn {
          background: rgba(15, 23, 42, 0.05); border: 1px solid rgba(15, 23, 42, 0.1);
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #475569; transition: all 0.2s;
          pointer-events: auto;
        }
        .vcw-minimize-btn:hover { background: rgba(15, 23, 42, 0.1); color: #0F172A; }

        /* ── LA CARTE ── */
        .vcw-scene {
          width: 100%; aspect-ratio: 1.586; perspective: 1200px;
          cursor: grab;
        }
        .vcw-draggable-container:active .vcw-scene { cursor: grabbing; }

        .vcw-inner {
          width: 100%; height: 100%; position: relative;
          transform-style: preserve-3d;
          border-radius: 20px;
          will-change: transform;
        }
        
        .vcw-face {
          position: absolute; inset: 0; border-radius: 20px;
          overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden;
        }

        /* ══ FRONT - ONDES MÉTALLIQUES BLEUES + SHIMMER ══════════════════════════════════════════ */
        .vcw-front {
          background-color: #030B1E;
          background-image: 
            radial-gradient(ellipse at 100% 0%, #00E1FF 0%, transparent 50%),
            radial-gradient(ellipse at 0% 100%, #0044FF 0%, transparent 60%),
            radial-gradient(ellipse at 50% 50%, #001144 0%, transparent 80%),
            conic-gradient(from 180deg at 40% 60%, rgba(0,225,255,0.1) 0deg, rgba(0,68,255,0.4) 120deg, rgba(0,225,255,0.1) 240deg, transparent 360deg);
          display: flex; flex-direction: column;
          padding: clamp(1rem, 4.5%, 1.4rem);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 1px 2px rgba(255, 255, 255, 0.4) inset;
        }

        .vcw-front::before {
          content: ''; position: absolute; inset: 0; border-radius: 20px;
          background-image: 
            linear-gradient(30deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%, rgba(255,255,255,0.03)),
            linear-gradient(150deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%, rgba(255,255,255,0.03)),
            linear-gradient(30deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%, rgba(255,255,255,0.03)),
            linear-gradient(150deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%, rgba(255,255,255,0.03)),
            linear-gradient(60deg, rgba(255,255,255,0.03) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,0.03) 75%, rgba(255,255,255,0.03)),
            linear-gradient(60deg, rgba(255,255,255,0.03) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,0.03) 75%, rgba(255,255,255,0.03));
          background-size: 20px 35px;
          background-position: 0 0, 0 0, 10px 18px, 10px 18px, 0 0, 10px 18px;
          pointer-events: none; mix-blend-mode: overlay; opacity: 0.3;
        }

        /* Dynamic shimmer spot that tracks cursor */
        .vcw-shimmer {
          position: absolute; pointer-events: none;
          inset: 0; border-radius: 20px;
          background: radial-gradient(ellipse at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.25) 0%, transparent 65%);
          z-index: 2; mix-blend-mode: overlay;
          transition: opacity 0.25s;
        }

        .vcw-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          position: relative; z-index: 3; margin-bottom: auto;
        }

        .vcw-logo-row { display: flex; align-items: center; gap: 10px; }
        .vcw-logo-ring {
          width: 36px; height: 36px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.8);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 15px rgba(0,225,255,0.5);
          overflow: hidden; background: #fff;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .vcw-org {
          font-size: clamp(0.65rem, 2vw, 0.75rem);
          font-weight: 700; color: #FFFFFF; text-shadow: 0 2px 4px rgba(0,0,0,0.8);
          letter-spacing: 0.15em; text-transform: uppercase;
          line-height: 1.2; max-width: 120px;
        }

        .vcw-status {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.3rem 0.8rem; border-radius: 99px;
          font-size: 0.6rem; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase;
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .vcw-status.valid {
          background: rgba(0, 225, 255, 0.15);
          border: 1px solid rgba(0, 225, 255, 0.5);
          color: #E0FFFF;
          box-shadow: 0 0 15px rgba(0, 225, 255, 0.3) inset;
        }
        .vcw-status.invalid {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #FECACA;
        }
        .vcw-status-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
          background: currentColor;
          animation: vcwblink 2s ease-in-out infinite;
        }
        @keyframes vcwblink { 0%,100%{opacity:1; box-shadow: 0 0 8px currentColor;} 50%{opacity:0.3; box-shadow: none;} }

        .vcw-mid {
          display: flex; align-items: center;
          gap: clamp(0.85rem, 3.5%, 1.25rem);
          position: relative; z-index: 3;
          padding: clamp(0.7rem, 3%, 1.2rem) 0; margin: auto 0;
        }

        .vcw-qr-box {
          width: clamp(92px, 26%, 115px); height: clamp(92px, 26%, 115px);
          background: rgba(255,255,255,0.95); border-radius: 12px;
          display: flex; align-items: center; justify-content: center; padding: 6px; flex-shrink: 0;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.3) inset;
          pointer-events: none;
        }

        .vcw-info { flex: 1; min-width: 0; }
        .vcw-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.2rem, 4vw, 1.5rem);
          font-weight: 600; color: #FFFFFF;
          letter-spacing: 0.02em; line-height: 1.1; margin-bottom: 0.3rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        }
        .vcw-antenna {
          font-size: clamp(0.58rem, 1.6vw, 0.68rem);
          color: rgba(255,255,255,0.8); font-weight: 600;
          letter-spacing: 0.08em; margin-bottom: 0.6rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-transform: uppercase; text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        }
        .vcw-detail-row { display: flex; flex-direction: column; gap: 0.3rem; }
        .vcw-detail { display: flex; flex-direction: column; }
        .vcw-detail-label {
          font-size: 0.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.5); margin-bottom: 2px;
        }
        .vcw-detail-val {
          font-size: clamp(0.6rem, 1.6vw, 0.75rem);
          color: #FFFFFF; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        }

        .vcw-bottom {
          display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 3;
        }
        .vcw-card-num {
          font-family: 'DM Mono', monospace;
          font-size: clamp(0.65rem, 1.8vw, 0.8rem); font-weight: 500; letter-spacing: 0.2em;
          color: #FFFFFF; text-shadow: 0 2px 4px rgba(0,0,0,0.6);
        }
        .vcw-exp-block { text-align: right; }
        .vcw-exp-label {
          font-size: 0.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.5); display: block; margin-bottom: 2px;
        }
        .vcw-exp-val {
          font-family: 'DM Mono', monospace; font-size: clamp(0.65rem, 1.8vw, 0.75rem);
          color: #FFFFFF; font-weight: 600; letter-spacing: 0.08em; text-shadow: 0 2px 4px rgba(0,0,0,0.6);
        }

        /* ══ BACK - ONDES SIMILAIRES ════════════════════════════════════════════ */
        .vcw-back {
          transform: rotateY(180deg);
          background-color: #030B1E;
          background-image: 
            radial-gradient(ellipse at 0% 0%, #0044FF 0%, transparent 60%),
            radial-gradient(ellipse at 100% 100%, #00E1FF 0%, transparent 70%);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: clamp(0.8rem, 2.5%, 1rem); padding: clamp(1rem, 4.5%, 1.4rem);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
        }
        .vcw-back::before {
          content: ''; position: absolute; inset: 0; border-radius: 20px;
          background-image: 
            linear-gradient(30deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%, rgba(255,255,255,0.02));
          background-size: 20px 35px; pointer-events: none; mix-blend-mode: overlay;
        }
        .vcw-back-title {
          font-size: clamp(0.65rem, 2vw, 0.75rem); font-weight: 800; letter-spacing: 0.15em;
          text-transform: uppercase; color: #FFFFFF; text-align: center; position: relative; z-index: 1;
        }
        .vcw-qr-card {
          background: rgba(255,255,255,0.95); border-radius: 12px; padding: clamp(10px, 3%, 14px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.6), 0 0 15px rgba(0,225,255,0.3);
          display: flex; align-items: center; justify-content: center; position: relative; z-index: 1;
          pointer-events: none;
        }
        .vcw-back-footer {
          font-size: clamp(0.55rem, 1.5vw, 0.65rem); font-weight: 500;
          color: rgba(255,255,255,0.7); text-align: center; line-height: 1.6; max-width: 280px; position: relative; z-index: 1;
        }

        /* ══ HINT ════════════════════════════════════════════ */
        .vcw-hint {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; margin-top: 0.8rem;
          font-size: 0.72rem; color: #94A3B8; font-weight: 500; letter-spacing: 0.03em;
          animation: vcwfade 0.5s 0.3s both;
        }
        @keyframes vcwfade { from{opacity:0;transform:translateY(4px);} to{opacity:1;transform:translateY(0);} }

        @media (max-width: 420px) {
          .vcw-draggable-container { max-width: 100%; }
          .vcw-qr-box { width: 85px; height: 85px; }
        }

        /* Styles spécifiques de la carte verrouillée */
        .vcw-locked-scene {
          width: 100%; aspect-ratio: 1.586; position: relative;
          border-radius: 20px; overflow: hidden; box-shadow: 0 20px 48px rgba(15,23,42,0.15);
        }
        .vcw-locked-bg {
          position: absolute; inset: 0; background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
        }
        .vcw-locked-overlay {
          position: absolute; inset: 0; background: rgba(255,255,255,0.6);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: clamp(0.6rem, 2.5%, 0.9rem); padding: 1.5rem; text-align: center;
          border: 1px solid rgba(255,255,255,0.8) inset;
        }
        .vcw-lock-icon-wrap {
          width: 56px; height: 56px; background: #FFFFFF; border: 1px solid #E2E8F0;
          box-shadow: 0 8px 20px rgba(0,0,0,0.06); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .vcw-lock-title {
          font-family: 'Cormorant Garamond', serif; font-size: clamp(1.1rem, 3.5vw, 1.4rem);
          font-weight: 600; color: #0F172A; line-height: 1.2;
        }
        .vcw-lock-sub { font-size: clamp(0.72rem, 2.2vw, 0.82rem); color: #475569; line-height: 1.55; max-width: 260px; }
        .vcw-lock-btn {
          display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.4rem;
          background: #0F172A; color: white; border: none; border-radius: 12px;
          font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 700;
          letter-spacing: 0.05em; cursor: pointer; box-shadow: 0 4px 14px rgba(15,23,42,0.4);
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s; text-decoration: none;
        }
        .vcw-lock-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,23,42,0.5); background: #1E293B; }
      `}</style>

      <div 
        className="vcw-draggable-container"
        style={{ 
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          zIndex: offset.x !== 0 || offset.y !== 0 ? 100 : 10
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <div className="vcw-lock-title">Carte verrouillée</div>
                <p className="vcw-lock-sub">
                  {isExpired
                    ? "Votre carte a expiré. Veuillez la renouveler pour continuer à l'utiliser."
                    : "Réglez votre adhésion annuelle pour débloquer votre carte membre."}
                </p>
                <a href="/member/contributions/new" className="vcw-lock-btn" onPointerDown={e => e.stopPropagation()}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                  </svg>
                  Régler ma carte
                </a>
              </div>
            </div>
            <div className="vcw-hint">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
              </svg>
              Votre QR code sera disponible après activation
            </div>
          </>
        ) : (
        <>
          <div 
            ref={sceneRef}
            className="vcw-scene" 
            onClick={handleCardClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="button" 
            aria-label={flipped ? 'Voir le recto de la carte' : 'Voir le QR code'}
          >
            <div 
              className="vcw-inner"
              style={{
                transform: cardTransform,
                transition: transitionStyle,
                // CORRECTION DE L'ERREUR ESLINT ICI (isDragging au lieu de isDragging.current)
                filter: isHovering || isDragging
                  ? 'drop-shadow(0 32px 40px rgba(0, 114, 255, 0.4))'
                  : 'drop-shadow(0 20px 30px rgba(0, 114, 255, 0.2))',
              }}
            >
              {/* FRONT */}
              <div className="vcw-face vcw-front">
                <div
                  className="vcw-shimmer"
                  style={{
                    '--mx': `${50 + (tilt.y / 14) * 50}%`,
                    '--my': `${50 - (tilt.x / 12) * 50}%`,
                    opacity: isHovering ? 1 : 0,
                  } as React.CSSProperties}
                />
                <div className="vcw-top">
                  <div className="vcw-logo-row">
                    <div className="vcw-logo-ring">
                      <Image src="/assets/images/logolcd.jpg" alt="Logo" width={36} height={36} style={{ objectFit: 'cover', borderRadius: '50%' }} />
                    </div>
                    <span className="vcw-org">Lélouma<br/>Communauté</span>
                  </div>
                  <span className={`vcw-status ${!isExpired ? 'valid' : 'invalid'}`}>
                    <span className="vcw-status-dot" />
                    {!isExpired ? 'Actif' : 'Expiré'}
                  </span>
                </div>
                <div className="vcw-mid">
                  <div className="vcw-qr-box">
                    <QRCode value={verificationUrl} size={100} level="H" style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div className="vcw-info">
                    <div className="vcw-name">{card!.user.lastName} {card!.user.firstName}</div>
                    <div className="vcw-antenna">Antenne · {card!.antennaName}</div>
                    <div className="vcw-detail-row">
                      {card!.user.birthDate && (
                        <div className="vcw-detail">
                          <span className="vcw-detail-label">Né(e) le</span>
                          <span className="vcw-detail-val">{new Date(card!.user.birthDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      {(card!.user.city || card!.user.country) && (
                        <div className="vcw-detail">
                          <span className="vcw-detail-label">Résidence</span>
                          <span className="vcw-detail-val">{[card!.user.city, card!.user.country].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="vcw-bottom">
                  <span className="vcw-card-num">{cardNum}</span>
                  <div className="vcw-exp-block">
                    <span className="vcw-exp-label">Expire</span>
                    <span className="vcw-exp-val">{expiryFormatted}</span>
                  </div>
                </div>
              </div>

              {/* BACK */}
              <div className="vcw-face vcw-back">
                <span className="vcw-back-title">Scannez pour vérifier</span>
                <div className="vcw-qr-card">
                  <QRCode value={verificationUrl} size={140} level="H" />
                </div>
                <p className="vcw-back-footer">
                  Carte strictement personnelle et incessible.<br/>
                  En cas de perte, contactez l&apos;administrateur de votre antenne.
                </p>
              </div>
            </div>
          </div>
          <div className="vcw-hint">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {flipped ? "Cliquer pour voir l'avant" : "Survoler ou cliquer pour retourner la carte"}
          </div>
        </>
        )}
      </div>
    </>
  );
}
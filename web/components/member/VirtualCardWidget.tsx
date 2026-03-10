// web/components/member/VirtualCardWidget.tsx
'use client';

import { useState, useRef } from 'react';
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

  // ── Logique de Drag & Drop (limitée à la barre supérieure) ──
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Le drag ne commence QUE si on attrape la poignée (classe vcw-drag-handle)
    const target = e.target as HTMLElement;
    if (!target.closest('.vcw-drag-handle')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartOffset.current = { ...offset };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    setOffset({
      x: dragStartOffset.current.x + dx,
      y: dragStartOffset.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

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

  // ── Rendu quand la carte est masquée ──
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        /* Wrapper principal */
        .vcw-draggable-container {
          position: relative; 
          width: 100%; max-width: 400px; margin: 0 auto;
          font-family: 'DM Sans', sans-serif;
          touch-action: none;
          will-change: transform;
        }

        /* ── BARRE DE CONTRÔLE (Drag & Hide) ── */
        .vcw-controls {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 0.5rem 0.5rem 0.5rem;
        }
        .vcw-drag-handle {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
          color: #94A3B8; cursor: grab; padding: 0.4rem; border-radius: 8px;
          transition: background 0.2s, color 0.2s;
        }
        .vcw-drag-handle:hover { background: rgba(15,23,42,0.05); color: #475569; }
        .vcw-drag-handle:active { cursor: grabbing; background: rgba(15,23,42,0.08); }
        
        .vcw-minimize-btn {
          background: rgba(15, 23, 42, 0.05); border: 1px solid rgba(15, 23, 42, 0.1);
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #475569; transition: all 0.2s;
        }
        .vcw-minimize-btn:hover { background: rgba(15, 23, 42, 0.1); color: #0F172A; }

        /* ── LA CARTE ── */
        .vcw-scene {
          width: 100%; aspect-ratio: 1.586; perspective: 1200px;
          cursor: pointer; /* Indique que la carte entière est cliquable */
        }

        .vcw-inner {
          width: 100%; height: 100%; position: relative;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border-radius: 20px;
          box-shadow: 0 24px 48px rgba(0, 114, 255, 0.25);
        }
        .vcw-inner.flipped { transform: rotateY(180deg); }
        .vcw-draggable-container:active .vcw-inner { box-shadow: 0 30px 60px rgba(0, 114, 255, 0.35); }

        .vcw-face {
          position: absolute; inset: 0; border-radius: 20px;
          overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden;
        }

        /* ══ FRONT - ONDES MÉTALLIQUES BLEUES ══════════════════════════════════════════ */
        .vcw-front {
          /* La base bleue nuit */
          background-color: #030B1E;
          /* Les vagues bleues électriques et cyan */
          background-image: 
            radial-gradient(ellipse at 100% 0%, #00E1FF 0%, transparent 50%),
            radial-gradient(ellipse at 0% 100%, #0044FF 0%, transparent 60%),
            radial-gradient(ellipse at 50% 50%, #001144 0%, transparent 80%),
            conic-gradient(from 180deg at 40% 60%, rgba(0,225,255,0.1) 0deg, rgba(0,68,255,0.4) 120deg, rgba(0,225,255,0.1) 240deg, transparent 360deg);
          display: flex; flex-direction: column;
          padding: clamp(1rem, 4.5%, 1.4rem);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 1px 2px rgba(255, 255, 255, 0.4) inset;
        }

        /* Effet "Holographique / Honeycomb" très léger */
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

        /* Faisceau lumineux oblique (Shine) */
        .vcw-front::after {
          content: ''; position: absolute;
          top: -150%; left: -50%; width: 100%; height: 300%;
          background: linear-gradient(
            to right, 
            transparent 0%, 
            rgba(255,255,255,0.05) 45%, 
            rgba(255,255,255,0.3) 50%, 
            rgba(255,255,255,0.05) 55%, 
            transparent 100%
          );
          transform: rotate(35deg); pointer-events: none;
        }

        .vcw-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          position: relative; z-index: 1; margin-bottom: auto;
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

        /* Pillule statut "Néon" */
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

        /* Centre */
        .vcw-mid {
          display: flex; align-items: center;
          gap: clamp(0.85rem, 3.5%, 1.25rem);
          position: relative; z-index: 1;
          padding: clamp(0.7rem, 3%, 1.2rem) 0; margin: auto 0;
        }

        .vcw-qr-box {
          width: clamp(92px, 26%, 115px); height: clamp(92px, 26%, 115px);
          background: rgba(255,255,255,0.95); border-radius: 12px;
          display: flex; align-items: center; justify-content: center; padding: 6px; flex-shrink: 0;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.3) inset;
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

        /* Bas */
        .vcw-bottom {
          display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 1;
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
      `}</style>

      {/* Le conteneur principal gère le drag & drop */}
      <div 
        className="vcw-draggable-container"
        style={{ 
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          zIndex: isDragging ? 100 : 10
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        
        {/* Panneau de contrôle : La poignée permet de glisser, le bouton permet de masquer */}
        <div className="vcw-controls">
          <div className="vcw-drag-handle">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 15h8" />
            </svg>
            Déplacer la carte
          </div>
          <button 
            className="vcw-minimize-btn" 
            onClick={() => setIsMinimized(true)}
            title="Masquer la carte"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5" />
            </svg>
          </button>
        </div>

        {/* ── LA CARTE (Cliquable sur toute sa surface pour se retourner) ── */}
        <div className="vcw-scene" onClick={() => setFlipped(f => !f)} role="button" aria-label="Retourner la carte">
          <div className={`vcw-inner${flipped ? ' flipped' : ''}`}>

            {/* ── FRONT ── */}
            <div className="vcw-face vcw-front">
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

            {/* ── BACK ── */}
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
          {flipped ? "Cliquez sur la carte pour voir l'avant" : "Cliquez sur la carte pour voir le QR code"}
        </div>
      </div>
    </>
  );
}
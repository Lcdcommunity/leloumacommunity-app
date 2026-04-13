// web/app/logout/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const FOLDS_TOTAL = 14;

export default function LogoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [farewellVisible, setFarewellVisible] = useState(false);
  
  const timerRef1 = useRef<number | null>(null);
  const timerRef2 = useRef<number | null>(null);
  const timerRef3 = useRef<number | null>(null);
  const timerRef4 = useRef<number | null>(null);

  // Marquer le montage côté client
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Logique d'animation PUIS de déconnexion
  useEffect(() => {
    if (!mounted) return;
    let alive = true;

    // 1. On affiche le message "Au revoir" doucement
    timerRef1.current = window.setTimeout(() => {
      if (alive) setFarewellVisible(true);
    }, 100) as unknown as number;

    // 2. L'animation CSS du rideau se lance automatiquement grâce au montage du composant (dure ~2.2s)

    // 3. Afficher l'emblème doré une fois le rideau totalement fermé
    timerRef2.current = window.setTimeout(() => {
      if (alive) setTitleVisible(true);
    }, 2400) as unknown as number;

    // 4. 🔥 CORRECTION : On détruit la session MAINTENANT (à 3.5s), quand le rideau cache déjà l'écran !
    // Cela évite que les protections globales de l'app ne coupent l'animation prématurément.
    timerRef3.current = window.setTimeout(async () => {
      if (!alive) return;
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        console.warn('Erreur déconnexion réseau:', err);
      }
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }, 3500) as unknown as number;

    // 5. Redirection finale vers la page de Login
    timerRef4.current = window.setTimeout(() => {
      if (alive) router.replace('/login');
    }, 4800) as unknown as number;

    return () => {
      alive = false;
      if (timerRef1.current) clearTimeout(timerRef1.current);
      if (timerRef2.current) clearTimeout(timerRef2.current);
      if (timerRef3.current) clearTimeout(timerRef3.current);
      if (timerRef4.current) clearTimeout(timerRef4.current);
    };
  }, [mounted, router]);

  if (!mounted) return <main className="min-h-screen" />;

  // Calcul des délais pour la fermeture (les bords se ferment d'abord, puis le centre)
  const curtainFolds = Array.from({ length: FOLDS_TOTAL }, (_, i) => {
    const fromLeft = i < FOLDS_TOTAL / 2;
    const distEdge = fromLeft ? i : (FOLDS_TOTAL - 1 - i);
    const closeDelay = distEdge * 0.12;
    return { id: i, fromLeft, closeDelay };
  });

  return (
    <main className="page-logout min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap');

        :root {
          --primary: #059669;
          --secondary: #064E3B;
          --gold-accent: #D4AF37;
        }

        .page-logout {
          background: #F8FAFC;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        /* ── Message d'au revoir ── */
        .logout-farewell {
          position: fixed;
          inset: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          pointer-events: none;
        }

        .farewell-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 700;
          color: var(--secondary);
          text-align: center;
          text-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }

        .farewell-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          color: var(--primary);
          font-weight: 500;
          text-align: center;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* ════════════════════════════════════════════════
           RIDEAU DE THÉÂTRE (FERMETURE)
        ════════════════════════════════════════════════ */
        .tc-container {
          position: fixed; inset: 0; z-index: 9999;
          pointer-events: none; overflow: hidden;
        }

        /* ── Emblème central sur le rideau fermé ── */
        .tc-emblem {
          position: fixed; inset: 0; z-index: 10000;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;
        }
        
        .tc-logo-wrap {
          width: 140px; height: 140px; background: white; border-radius: 50%; padding: 12px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.1);
          border: 4px solid var(--gold-accent); position: relative;
        }
        
        .tc-text {
          font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 700;
          color: var(--gold-accent); letter-spacing: 0.15em; text-transform: uppercase;
          text-shadow: 0 4px 15px rgba(0,0,0,0.6);
        }

        /* ── Plis du velours ── */
        .tc-fold {
          position: absolute; top: -10px; bottom: 0;
          transform-origin: top center; box-shadow: 4px 0 20px rgba(0,0,0,0.4);
          will-change: transform, opacity;
        }
        
        .tc-fabric {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, 
            var(--secondary) 0%, 
            var(--primary) 30%, 
            var(--primary) 65%, 
            var(--secondary) 100%
          );
          box-shadow: inset 5px 0 15px rgba(0,0,0,0.4), inset -5px 0 15px rgba(0,0,0,0.4);
          border-bottom: 15px solid var(--gold-accent);
        }
        
        .tc-fabric::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
        }

        /* Animations de fermeture */
        .tc-fold--closing[data-from="left"] {
          transform: scaleX(0.04) translateX(-120vw) skewX(15deg);
          opacity: 0;
          animation: tc-close-left 2.2s cubic-bezier(0.25, 1, 0.5, 1) both;
        }
        @keyframes tc-close-left {
          0% { transform: scaleX(0.04) translateX(-120vw) skewX(15deg); opacity: 0; }
          50% { transform: scaleX(0.6) translateX(-10vw) skewX(5deg); opacity: 1; }
          100% { transform: scaleX(1) translateX(0) skewX(0); opacity: 1; }
        }

        .tc-fold--closing[data-from="right"] {
          transform: scaleX(0.04) translateX(120vw) skewX(-15deg);
          opacity: 0;
          animation: tc-close-right 2.2s cubic-bezier(0.25, 1, 0.5, 1) both;
        }
        @keyframes tc-close-right {
          0% { transform: scaleX(0.04) translateX(120vw) skewX(-15deg); opacity: 0; }
          50% { transform: scaleX(0.6) translateX(10vw) skewX(-5deg); opacity: 1; }
          100% { transform: scaleX(1) translateX(0) skewX(0); opacity: 1; }
        }

        @media (max-width: 480px) {
          .tc-logo-wrap { width: 110px; height: 110px; }
          .tc-text { font-size: 1.6rem; }
        }
      `}</style>

      {/* TEXTE D'AU REVOIR (S'affiche en premier) */}
      <div 
        className="logout-farewell"
        style={{ opacity: farewellVisible ? 1 : 0, transition: 'opacity 0.8s ease' }}
        aria-live="polite"
      >
        <p className="farewell-title">Au revoir 👋</p>
        <p className="farewell-sub">À très bientôt sur Lélouma Communauté</p>
      </div>

      {/* RIDEAU QUI SE FERME */}
      <div className="tc-container" aria-hidden>
        <div 
          className="tc-emblem"
          style={{ opacity: titleVisible ? 1 : 0, transform: titleVisible ? 'scale(1)' : 'scale(0.8)', transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <div className="tc-logo-wrap">
            <Image src="/assets/images/logolcd.jpg" alt="Emblème" fill style={{ objectFit: 'contain', padding: '8px' }} unoptimized />
          </div>
          <div className="tc-text">À BIENTÔT</div>
        </div>

        {curtainFolds.map((fold) => (
          <div
            key={fold.id}
            className="tc-fold tc-fold--closing"
            data-from={fold.fromLeft ? 'left' : 'right'}
            style={{
              left: `${(fold.id / FOLDS_TOTAL) * 100}%`,
              width: `${100 / FOLDS_TOTAL + 0.5}%`,
              animationDelay: `${fold.closeDelay}s`,
            }}
          >
            <div className="tc-fabric" />
          </div>
        ))}
      </div>
      
      <p className="sr-only">Déconnexion en cours…</p>
    </main>
  );
}
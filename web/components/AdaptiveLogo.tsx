// web/components/AdaptiveLogo.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface AdaptiveLogoProps {
  src: string | null;
  alt: string;
  size?: number;
  fallbackText?: string;
}

interface DetectedStyle {
  ringColor: string;
  needsBackground: boolean;
}

const DEFAULT_STYLE: DetectedStyle = {
  ringColor: '#1A56DB',
  needsBackground: false,
};

/**
 * Cadre de logo qui s'adapte automatiquement à l'image chargée :
 * - détecte si les bords de l'image sont transparents (pas besoin d'un fond
 *   blanc plaqué derrière) ou opaques (fond blanc ajouté pour éviter un
 *   carré moche visible autour d'un logo sans transparence)
 * - extrait une couleur moyenne des bords pour teinter l'anneau autour du
 *   logo, au lieu d'une couleur fixe qui jure parfois selon le logo
 */
export function AdaptiveLogo({ src, alt, size = 88, fallbackText }: AdaptiveLogoProps) {
  const [style, setStyle] = useState<DetectedStyle>(DEFAULT_STYLE);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!src) {
      queueMicrotask(() => setStyle(DEFAULT_STYLE));
      return;
    }

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = canvasRef.current ?? document.createElement('canvas');
        canvasRef.current = canvas;
        const w = 40;
        const h = 40;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let transparentEdgePixels = 0;
        let edgeSamples = 0;
        let rSum = 0, gSum = 0, bSum = 0, colorSamples = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const isEdge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
            if (!isEdge) continue;
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            edgeSamples++;
            if (a < 20) {
              transparentEdgePixels++;
              continue;
            }
            rSum += data[i];
            gSum += data[i + 1];
            bSum += data[i + 2];
            colorSamples++;
          }
        }

        const transparentRatio = edgeSamples > 0 ? transparentEdgePixels / edgeSamples : 0;
        const needsBackground = transparentRatio > 0.3;

        let ringColor = DEFAULT_STYLE.ringColor;
        if (colorSamples > 0) {
          const r = Math.round(rSum / colorSamples);
          const g = Math.round(gSum / colorSamples);
          const b = Math.round(bSum / colorSamples);
          ringColor = `rgb(${r}, ${g}, ${b})`;
        }

        if (!cancelled) setStyle({ ringColor, needsBackground });
      } catch {
        if (!cancelled) setStyle(DEFAULT_STYLE);
      }
    };

    img.onerror = () => {
      if (!cancelled) setStyle(DEFAULT_STYLE);
    };

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        padding: 4,
        background: `linear-gradient(135deg, ${style.ringColor}, ${style.ringColor}CC)`,
        boxShadow: `0 8px 24px ${style.ringColor}55`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          position: 'relative',
          background: style.needsBackground ? 'white' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            style={{ objectFit: 'contain', padding: style.needsBackground ? '10%' : '4%' }}
            unoptimized
          />
        ) : (
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: size * 0.35,
              fontWeight: 700,
              color: style.ringColor,
            }}
          >
            {fallbackText || '?'}
          </span>
        )}
      </div>
    </div>
  );
}
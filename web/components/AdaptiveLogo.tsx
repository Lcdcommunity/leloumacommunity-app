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
}

const DEFAULT_STYLE: DetectedStyle = {
  ringColor: '#1A56DB',
};

/**
 * Cadre de logo, carré aux coins arrondis, sans contour coloré — juste une
 * ombre douce et neutre pour la définition. La couleur détectée à partir du
 * logo (bords de l'image) sert uniquement à teinter le "?" de repli quand
 * aucun logo n'est chargé, plus d'anneau autour de l'image.
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

        let rSum = 0, gSum = 0, bSum = 0, colorSamples = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const isEdge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
            if (!isEdge) continue;
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            if (a < 20) continue; // pixel transparent, ignoré pour la couleur
            rSum += data[i];
            gSum += data[i + 1];
            bSum += data[i + 2];
            colorSamples++;
          }
        }

        let ringColor = DEFAULT_STYLE.ringColor;
        if (colorSamples > 0) {
          const r = Math.round(rSum / colorSamples);
          const g = Math.round(gSum / colorSamples);
          const b = Math.round(bSum / colorSamples);
          ringColor = `rgb(${r}, ${g}, ${b})`;
        }

        if (!cancelled) setStyle({ ringColor });
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

  // 🔥 CORRECTION : cercle + anneau (padding coloré) remplacés par un carré
  // aux coins arrondis, sans contour — juste une ombre neutre et discrète.
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        overflow: 'hidden',
        position: 'relative',
        background: '#FFFFFF',
        boxShadow: '0 8px 20px rgba(15,23,42,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          style={{ objectFit: 'contain', padding: '8%' }}
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
  );
}
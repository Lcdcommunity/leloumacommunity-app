// web/components/member/DashboardCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '../../lib/format';

// ─── Définitions strictes (Zéro 'any' pour ESLint) ───
export type CarouselAttachment = { file?: { url?: string | null } | null };
export type CarouselPhoto = { url?: string | null };

export type CarouselProject = {
  id: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  startsAt?: string | Date | null;
  createdAt?: string | Date | null;
  status?: string;
  coverImageFile?: { url?: string | null } | null;
  coverImageFileId?: string | null;
  locationText?: string | null;
  attachments?: CarouselAttachment[] | null;
  photos?: CarouselPhoto[] | null;
};

export type CarouselNews = {
  id: string;
  title: string;
  content?: string | null;
  publishedAt?: string | Date | null;
  createdAt?: string | Date | null;
  coverImageFile?: { url?: string | null } | null;
  coverImageFileId?: string | null;
};

export type CarouselEvent = {
  id: string;
  title: string;
  description?: string | null;
  startsAt?: string | Date | null;
  locationText?: string | null;
  coverImage?: { url?: string | null } | null;
  coverImageId?: string | null;
};

type CarouselItem = {
  id: string;
  type: 'PROJECT' | 'NEWS' | 'EVENT';
  title: string;
  subtitle?: string | null;
  date?: string | Date | null;
  status?: string;
  imageUrls: string[];
  location?: string | null;
};

// Nombre de photos affichées simultanément, côte à côte, avant de devoir
// faire défiler pour voir les suivantes.
const VISIBLE_PHOTOS = 3;

// ─── Traduction des statuts ───────────────────────────────────────────────────
function translateStatus(status: string): string {
  const map: Record<string, string> = {
    PROPOSED:    'Proposé',
    IN_PROGRESS: 'En cours',
    APPROVED:    'Approuvé',
    COMPLETED:   'Terminé',
    SUSPENDED:   'Suspendu',
    CANCELLED:   'Annulé',
    DRAFT:       'Brouillon',
    PUBLISHED:   'Publié',
    ARCHIVED:    'Archivé',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function DashboardCarousel({
  projects = [],
  // 🔥 CORRIGÉ : les actualités (news) ne doivent plus apparaître dans ce
  // carrousel photo — elles défilent déjà dans la section "Informations
  // récentes" juste en dessous (doublon supprimé). Le prop reste accepté
  // (renommé en _news) pour ne pas casser les appels existants dans les
  // pages membre/admin/super-admin, mais n'est plus consommé ici.
  news: _news = [],
  events = [],
}: {
  projects?: CarouselProject[];
  news?: CarouselNews[];
  events?: CarouselEvent[];
}) {
  // 🔥 CORRIGÉ (ESLint) : _news n'est plus consommé dans le corps de la
  // fonction (cf. commentaire ci-dessus) — @typescript-eslint/no-unused-vars
  // ne reconnaît pas le préfixe "_" pour un paramètre déstructuré ici, d'où
  // le warning. "void _news;" le marque explicitement comme utilisé sans
  // aucun effet de bord.
  void _news;

  const items: CarouselItem[] = [
    ...projects.map(p => {
      const imgs = [
        p.coverImageFile?.url || p.coverImageFileId,
        ...(p.attachments || []).map(a => a.file?.url),
        ...(p.photos || []).map(ph => ph.url),
      ].filter(Boolean) as string[];

      return {
        id: `proj-${p.id}`,
        type: 'PROJECT' as const,
        title: p.title,
        subtitle: p.summary || (p.description ? p.description.substring(0, 80) + '...' : null),
        date: p.startsAt || p.createdAt,
        status: p.status,
        imageUrls: imgs,
        location: p.locationText,
      };
    }),
    ...events.map(e => ({
      id: `evt-${e.id}`,
      type: 'EVENT' as const,
      title: e.title,
      subtitle: e.description ? e.description.substring(0, 80) + '...' : null,
      date: e.startsAt,
      location: e.locationText,
      imageUrls: [e.coverImage?.url || e.coverImageId].filter(Boolean) as string[],
    })),
  ];

  const sortedItems = items
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 10);

  const [currentItemIdx, setCurrentItemIdx] = useState(0);

  // 🔥 CORRIGÉ : l'ancien système faisait défiler les photos d'un même
  // projet UNE À LA FOIS (currentImgIdx + setInterval), affichée seule avec
  // un fond flouté autour — trop d'espace vide. Désormais toutes les photos
  // (jusqu'à VISIBLE_PHOTOS) d'un même projet s'affichent d'un coup côte à
  // côte, remplissant tout le bandeau ; seul le passage d'un projet au
  // suivant reste minuté.
  useEffect(() => {
    if (sortedItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentItemIdx(prev => (prev + 1) % sortedItems.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [sortedItems.length]);

  if (sortedItems.length === 0) return null;

  const current = sortedItems[currentItemIdx];
  const imageUrls = current.imageUrls;

  // Au-delà de VISIBLE_PHOTOS, on duplique la liste et on anime une
  // translation de 0 à -50% : comme le doublon fait exactement deux fois la
  // largeur du jeu de photos d'origine, -50% correspond pile à un cycle
  // complet — la boucle est donc parfaitement continue, sans à-coup ni
  // retour brusque au début.
  const hasOverflow = imageUrls.length > VISIBLE_PHOTOS;
  const displayImages = hasOverflow ? [...imageUrls, ...imageUrls] : imageUrls;
  const trackWidthPercent = hasOverflow ? (displayImages.length / VISIBLE_PHOTOS) * 100 : 100;
  const itemBasisPercent = displayImages.length > 0 ? 100 / displayImages.length : 100;
  // 🔥 CORRIGÉ : encore un peu rapide — durée augmentée (10s/photo, min
  // 24s au lieu de 7s/photo, min 18s).
  const scrollDurationSec = Math.max(imageUrls.length * 10, 24);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'PROJECT': return { color: '#1D4ED8', bg: 'rgba(239,246,255,0.92)' };
      case 'EVENT':   return { color: '#059669', bg: 'rgba(236,253,245,0.92)' };
      default:        return { color: '#7C3AED', bg: 'rgba(245,243,255,0.92)' };
    }
  };

  const cfg = getTypeConfig(current.type);

  return (
    <div className="carousel-container">
      <style>{`
        .carousel-container {
          width: 100%;
          height: clamp(220px, 22vw, 380px);
          border-radius: 20px; overflow: hidden;
          position: relative; margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
          box-shadow: 0 10px 30px rgba(37,99,235,0.15);
        }

        /* 🔥 CORRIGÉ : remplace l'ancien fond "une photo + flou autour"
           (trop d'espace vide) par une bande de photos côte à côte qui
           remplit tout le bandeau. Au-delà de VISIBLE_PHOTOS, la bande
           défile en continu de la droite vers la gauche. */
        .carousel-photos-viewport {
          position: absolute; inset: 0; overflow: hidden;
        }
        .carousel-photos-track {
          display: flex; height: 100%;
        }
        .carousel-photos-track.scrolling {
          animation-name: carouselPhotosScroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes carouselPhotosScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .carousel-photo-item {
          flex: 0 0 auto;
          height: 100%;
          object-fit: cover;
          display: block;
          /* 🔥 CORRIGÉ : l'ombre interne (inset box-shadow) trop fine et
             trop transparente ne se voyait quasiment pas sur des photos
             chargées — remplacée par une vraie bordure blanche solide et
             bien visible. box-sizing: border-box garantit que la bordure
             est absorbée dans la largeur déjà calculée (pas de dépassement,
             pas de décalage de la mise en page). */
          box-sizing: border-box;
          border-right: 3px solid rgba(255,255,255,0.92);
        }

        /* Voile : léger en haut pour laisser respirer l'image, dense en bas pour lisibilité */
        .carousel-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(15,23,42,0.28) 0%,
            rgba(15,23,42,0.05) 30%,
            rgba(15,23,42,0.50) 68%,
            rgba(15,23,42,0.86) 100%
          );
        }

        /* ── Haut gauche : statut traduit ── */
        .carousel-status {
          position: absolute; top: 0.85rem; left: 0.9rem; z-index: 10;
          display: inline-flex; align-items: center; gap: 0.28rem;
          padding: 0.15rem 0.5rem; border-radius: 99px;
          font-size: 0.58rem; font-weight: 800; letter-spacing: 0.07em;
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        .carousel-status-dot {
          width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0;
        }

        /* ── Haut droit : titre ── */
        .carousel-title-wrap {
          position: absolute; top: 0.85rem; right: 0.9rem; z-index: 10;
          max-width: 62%;
          text-align: right;
        }
        .carousel-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.65rem; font-weight: 700;
          color: white; text-align: right;
          line-height: 1.35;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
          text-shadow: 0 2px 14px rgba(0,0,0,0.65), 0 1px 3px rgba(0,0,0,0.4);
          margin: 0;
        }

        /* ── Bas : date gauche / lieu droit (inchangé, comme à l'origine) ── */
        .carousel-footer {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.6rem 0.9rem 0.75rem;
        }
        .carousel-footer-item {
          display: flex; align-items: center; gap: 0.28rem;
          font-size: 0.65rem; font-weight: 600;
          color: rgba(255,255,255,0.85);
          text-shadow: 0 1px 4px rgba(0,0,0,0.55);
        }
        .carousel-footer-item svg { flex-shrink: 0; opacity: 0.80; }
        .carousel-footer-right {
          max-width: 50%; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
          text-align: right;
        }
      `}</style>

      {/* ── Bande de photos ── */}
      <div className="carousel-photos-viewport">
        {imageUrls.length > 0 && (
          <div
            key={current.id}
            className={`carousel-photos-track${hasOverflow ? ' scrolling' : ''}`}
            style={{
              width: `${trackWidthPercent}%`,
              animationDuration: hasOverflow ? `${scrollDurationSec}s` : undefined,
            }}
          >
            {displayImages.map((url, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${current.id}-${idx}`}
                src={url}
                alt={idx === 0 ? current.title : ''}
                className="carousel-photo-item"
                style={{ width: `${itemBasisPercent}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Voile ── */}
      <div className="carousel-overlay" />

      {/* ── Haut gauche : statut traduit ── */}
      {current.status && (
        <div className="carousel-status" style={{ background: cfg.bg, color: cfg.color }}>
          <span className="carousel-status-dot" style={{ background: cfg.color }} />
          {translateStatus(current.status)}
        </div>
      )}

      {/* ── Haut droit : titre ── */}
      <div className="carousel-title-wrap">
        <h3 className="carousel-title">{current.title}</h3>
      </div>

      {/* ── Bas : date gauche / lieu droit ── */}
      <div className="carousel-footer">
        {current.date ? (
          <div className="carousel-footer-item">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            {formatDate(current.date)}
          </div>
        ) : <div />}

        {current.location ? (
          <div className="carousel-footer-item carousel-footer-right">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            {current.location}
          </div>
        ) : <div />}
      </div>
    </div>
  );
}
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
  imageUrls: string[]; // Supporte un tableau d'images !
  location?: string | null;
};

export function DashboardCarousel({ 
  projects = [], 
  news = [], 
  events = [] 
}: { 
  projects?: CarouselProject[]; 
  news?: CarouselNews[]; 
  events?: CarouselEvent[]; 
}) {
  // 1. Fusionner et formater toutes les données
  const items: CarouselItem[] = [
    ...projects.map(p => {
      // Regrouper la photo de couverture et toutes les pièces jointes/photos
      const imgs = [
        p.coverImageFile?.url || p.coverImageFileId,
        ...(p.attachments || []).map(a => a.file?.url),
        ...(p.photos || []).map(ph => ph.url)
      ].filter(Boolean) as string[];

      return {
        id: `proj-${p.id}`,
        type: 'PROJECT' as const,
        title: p.title,
        subtitle: p.summary || p.description?.substring(0, 80) + '...',
        date: p.startsAt || p.createdAt,
        status: p.status,
        imageUrls: imgs,
        location: p.locationText
      };
    }),
    ...news.map(n => ({
      id: `news-${n.id}`,
      type: 'NEWS' as const,
      title: n.title,
      subtitle: n.content?.substring(0, 80) + '...',
      date: n.publishedAt || n.createdAt,
      imageUrls: [n.coverImageFile?.url || n.coverImageFileId].filter(Boolean) as string[],
    })),
    ...events.map(e => ({
      id: `evt-${e.id}`,
      type: 'EVENT' as const,
      title: e.title,
      subtitle: e.description?.substring(0, 80) + '...',
      date: e.startsAt,
      location: e.locationText,
      imageUrls: [e.coverImage?.url || e.coverImageId].filter(Boolean) as string[],
    }))
  ];

  // Trier par date
  const sortedItems = items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 10);

  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  // 2. Gestion multi-photos (3s par photo, puis passage à l'item suivant)
  useEffect(() => {
    if (sortedItems.length === 0) return;
    
    const currentItem = sortedItems[currentItemIdx];
    const imgCount = Math.max(1, currentItem.imageUrls.length); // Au moins 1 itération même si 0 image

    const timer = setInterval(() => {
      setCurrentImgIdx((prevImg) => {
        if (prevImg + 1 < imgCount) {
          return prevImg + 1; // Passe à la photo suivante du MÊME projet
        } else {
          // Fin des photos, on passe au projet/news suivant
          setCurrentItemIdx((prevItem) => (prevItem + 1) % sortedItems.length);
          return 0; // Réinitialise l'index de l'image
        }
      });
    }, 3000); // 3 secondes par image

    return () => clearInterval(timer);
  }, [currentItemIdx, sortedItems]);

  if (sortedItems.length === 0) return null;

  const current = sortedItems[currentItemIdx];
  const activeImageUrl = current.imageUrls[currentImgIdx] || null;

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'PROJECT': return { label: 'PROJET', color: '#1D4ED8', bg: '#EFF6FF' };
      case 'EVENT': return { label: 'ÉVÉNEMENT', color: '#059669', bg: '#ECFDF5' };
      default: return { label: 'INFO', color: '#7C3AED', bg: '#F5F3FF' };
    }
  };

  const cfg = getTypeConfig(current.type);

  return (
    <div className="carousel-container">
      <style>{`
        .carousel-container {
          width: 100%; height: 180px;
          border-radius: 20px; overflow: hidden;
          position: relative; margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
          box-shadow: 0 10px 30px rgba(37,99,235,0.15);
        }
        .carousel-slide {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 1.25rem 1.5rem;
          opacity: 0; transition: opacity 0.8s ease-in-out;
          z-index: 1;
        }
        .carousel-slide.active { opacity: 1; z-index: 2; }
        .carousel-bg {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; transition: transform 6s ease-out;
        }
        .carousel-slide.active .carousel-bg { transform: scale(1.05); }
        .carousel-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.4) 60%, rgba(37,99,235,0.1) 100%);
        }
        .carousel-content { position: relative; z-index: 3; color: white; }
        .carousel-badge {
          display: inline-flex; padding: 0.2rem 0.6rem; border-radius: 99px;
          font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 0.6rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .carousel-title { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; margin: 0 0 0.3rem 0; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .carousel-meta { display: flex; gap: 0.8rem; font-size: 0.75rem; color: #E2E8F0; font-weight: 500; }
        .carousel-meta-item { display: flex; align-items: center; gap: 0.3rem; }
        .carousel-indicators { position: absolute; top: 1rem; right: 1.5rem; display: flex; gap: 0.4rem; z-index: 10; }
        .carousel-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4); transition: all 0.3s; }
        .carousel-dot.active { background: white; width: 20px; border-radius: 99px; box-shadow: 0 0 8px rgba(255,255,255,0.8); }
      `}</style>

      {/* Rendu de l'item courant uniquement (l'image change via currentImgIdx) */}
      <div className="carousel-slide active">
        {activeImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeImageUrl} alt={current.title} className="carousel-bg" key={activeImageUrl} />
        ) : (
          <div className="carousel-bg" style={{ background: 'transparent' }} />
        )}
        
        {/* Le voile dégradé n'apparaît que s'il y a une image pour garder la lisibilité */}
        {activeImageUrl && <div className="carousel-overlay" />}
        
        <div className="carousel-content">
          <div className="carousel-badge" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
            {current.imageUrls.length > 1 && <span style={{ marginLeft: 6, opacity: 0.7 }}>({currentImgIdx + 1}/{current.imageUrls.length})</span>}
          </div>
          <h3 className="carousel-title">{current.title}</h3>
          <div className="carousel-meta">
            {current.date && (
              <div className="carousel-meta-item">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                {formatDate(current.date)}
              </div>
            )}
            {current.location && (
              <div className="carousel-meta-item">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                {current.location}
              </div>
            )}
            {current.status && (
              <div className="carousel-meta-item" style={{ color: '#FCD34D', fontWeight: 700 }}>
                • {current.status.replace('_', ' ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {sortedItems.length > 1 && (
        <div className="carousel-indicators">
          {sortedItems.map((_, idx) => (
            <div key={idx} className={`carousel-dot ${idx === currentItemIdx ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
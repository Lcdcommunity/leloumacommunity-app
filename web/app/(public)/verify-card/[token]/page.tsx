// web/app/(public)/verify-card/[token]/page.tsx
//
// v1.1 — 🔥 CORRIGÉ (style) : la page (cible du QR code imprimé sur la carte
//   membre) était écrite en classes utilitaires Tailwind (min-h-screen,
//   bg-gray-50, rounded-2xl, grid-cols-2, animate-spin…) alors que Tailwind
//   n'est PAS installé dans ce projet : aucune de ces classes n'avait d'effet,
//   la page s'affichait sans mise en forme (texte brut, SVG géants). Réécrite
//   en styles inline + une feuille <style> locale (même approche que les autres
//   écrans), carte ombrée, responsive mobile. Ajout de la photo du membre
//   (profilePhotoUrl, déjà renvoyée par GET /public/cards/:token) pour
//   permettre un contrôle visuel de l'identité. Aucune donnée supplémentaire
//   n'est demandée au backend.
//
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import { AdaptiveLogo } from '../../../../components/AdaptiveLogo';

type CardData = {
  cardNumber: string;
  isLocked: boolean;
  expiresAt: string | null;
  antennaName: string;
  user: {
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string | null;
  };
};

interface ThemeConfig {
  name: string;
  logoUrl: string | null;
  primary: string;
  secondary: string;
}

const F = {
  body: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const C = {
  bg: '#F3F4F6',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  soft: '#F9FAFB',
  okBg: '#ECFDF5',
  okBorder: '#A7F3D0',
  okText: '#047857',
  koBg: '#FEF2F2',
  koBorder: '#FECACA',
  koText: '#B91C1C',
};

const CSS = `
  .vc-page { min-height: 100vh; background: ${C.bg}; display: flex; align-items: center; justify-content: center; padding: 1rem; font-family: ${F.body}; box-sizing: border-box; }
  .vc-card { width: 100%; max-width: 24rem; background: ${C.card}; border-radius: 1.25rem; box-shadow: 0 20px 45px rgba(17,24,39,0.15), 0 4px 10px rgba(17,24,39,0.06); overflow: hidden; border: 1px solid ${C.border}; animation: vc-in .35s ease-out both; }
  .vc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; text-align: left; }
  .vc-spin { animation: vc-spin 1s linear infinite; }
  @keyframes vc-spin { to { transform: rotate(360deg); } }
  @keyframes vc-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes vc-pulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
  @media (max-width: 360px) { .vc-grid { grid-template-columns: 1fr; } }
`;

export default function VerifyCardPage() {
  const params = useParams();
  const token = Array.isArray(params?.token) ? params.token[0] : (params?.token as string | undefined);

  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemeConfig>({
    name: 'Console Grand Chef',
    logoUrl: null,
    primary: '#1A56DB',
    secondary: '#1E40AF',
  });

  useEffect(() => {
    if (!token) return;

    api.verifyPublicCard(token)
      .then((data) => {
        setCard(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Ce QR Code est invalide ou la carte n'existe pas.");
        setLoading(false);
      });
  }, [token]);

  // Charge l'identité (nom/logo/couleurs) de l'association résolue par le
  // domaine/code courant — même convention que login/signup/verify-email.
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code') || undefined;
        const domainParam = urlParams.get('domain') || undefined;
        const currentDomain = !codeParam && !domainParam ? window.location.hostname : undefined;

        if (currentDomain === 'localhost' || currentDomain === 'votre-domaine-principal.com') {
          return;
        }

        const data = await api.getPublicTheme(domainParam || currentDomain, codeParam);
        if (data) {
          setTheme({
            name: data.name,
            logoUrl: data.logoUrl || null,
            primary: data.themeColors?.primary || '#1A56DB',
            secondary: data.themeColors?.secondary || '#1E40AF',
          });
        }
      } catch (err) {
        console.warn('Thème personnalisé non trouvé.', err);
      }
    };
    fetchTheme();
  }, []);

  if (loading) {
    return (
      <main className="vc-page">
        <style>{CSS}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: theme.primary }}>
          <svg className="vc-spin" width="40" height="40" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.75" />
          </svg>
          <p style={{ margin: 0, fontWeight: 600, animation: 'vc-pulse 1.5s ease-in-out infinite' }}>
            Vérification sécurisée en cours...
          </p>
        </div>
      </main>
    );
  }

  if (error || !card) {
    return (
      <main className="vc-page">
        <style>{CSS}</style>
        <div className="vc-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <svg width="56" height="56" fill="none" stroke={C.koText} viewBox="0 0 24 24" style={{ margin: '0 auto 1rem', display: 'block' }} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p style={{ margin: 0, color: C.koText, fontWeight: 600 }}>{error || 'Carte introuvable'}</p>
        </div>
      </main>
    );
  }

  const isExpired = card.expiresAt ? new Date(card.expiresAt) < new Date() : true;
  const isValid = !card.isLocked && !isExpired;
  const initials = `${card.user.firstName?.charAt(0) ?? ''}${card.user.lastName?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <main className="vc-page">
      <style>{CSS}</style>
      <div className="vc-card">
        {/* Header officiel */}
        <div
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <AdaptiveLogo
              src={theme.logoUrl}
              alt={`Logo ${theme.name}`}
              size={64}
              fallbackText={theme.name.charAt(0).toUpperCase()}
            />
          </div>
          <h1 style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>{theme.name}</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)' }}>
            Système de vérification officiel
          </p>
        </div>

        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          {/* Identité */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              margin: '0 auto 0.9rem',
              position: 'relative',
              overflow: 'hidden',
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.6rem',
              boxShadow: '0 8px 20px rgba(17,24,39,0.18)',
              border: '3px solid #fff',
            }}
          >
            {card.user.profilePhotoUrl ? (
              <Image
                src={card.user.profilePhotoUrl}
                alt={`Photo de ${card.user.firstName} ${card.user.lastName}`}
                fill
                sizes="88px"
                style={{ objectFit: 'cover' }}
                unoptimized
              />
            ) : (
              initials
            )}
          </div>

          <h2
            style={{
              margin: '0 0 0.25rem',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: C.text,
              textTransform: 'uppercase',
              wordBreak: 'break-word',
            }}
          >
            {card.user.firstName} {card.user.lastName}
          </h2>
          <p style={{ margin: '0 0 1.25rem', color: C.muted, fontWeight: 500 }}>Antenne : {card.antennaName}</p>

          {/* Statut */}
          <div
            role="status"
            style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              marginBottom: '1.25rem',
              border: `1px solid ${isValid ? C.okBorder : C.koBorder}`,
              background: isValid ? C.okBg : C.koBg,
              color: isValid ? C.okText : C.koText,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {isValid ? (
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span style={{ fontWeight: 700, letterSpacing: '0.03em', fontSize: '1.1rem' }}>
                {isValid ? 'MEMBRE ACTIF' : 'CARTE INVALIDE'}
              </span>
            </div>
            {!isValid && isExpired && (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', fontWeight: 500 }}>La carte a expiré</p>
            )}
            {!isValid && !isExpired && card.isLocked && (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', fontWeight: 500 }}>La carte est désactivée</p>
            )}
          </div>

          {/* Détails */}
          <div className="vc-grid">
            <div style={{ background: C.soft, border: `1px solid ${C.border}`, borderRadius: '0.6rem', padding: '0.75rem' }}>
              <span style={{ display: 'block', color: C.muted, fontSize: '0.75rem', marginBottom: '0.25rem' }}>N° de Carte</span>
              <span style={{ fontWeight: 700, color: C.text, wordBreak: 'break-all' }}>{card.cardNumber}</span>
            </div>
            <div style={{ background: C.soft, border: `1px solid ${C.border}`, borderRadius: '0.6rem', padding: '0.75rem' }}>
              <span style={{ display: 'block', color: C.muted, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Expiration</span>
              <span style={{ fontWeight: 700, color: C.text }}>
                {card.expiresAt ? new Date(card.expiresAt).toLocaleDateString('fr-FR') : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// web/app/(public)/verify-card/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
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

export default function VerifyCardPage() {
  const { token } = useParams();

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

    api.verifyPublicCard(token as string)
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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4" style={{ color: theme.primary }}>
          <svg className="animate-spin h-10 w-10" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="font-medium animate-pulse">Vérification sécurisée en cours...</p>
        </div>
      </main>
    );
  }

  if (error || !card) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="text-red-600 font-medium">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            {error || "Carte introuvable"}
          </div>
        </div>
      </main>
    );
  }

  const isExpired = card.expiresAt ? new Date(card.expiresAt) < new Date() : true;
  const isValid = !card.isLocked && !isExpired;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header officiel */}
          <div
            className="p-6 text-center"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <AdaptiveLogo
                src={theme.logoUrl}
                alt={`Logo ${theme.name}`}
                size={64}
                fallbackText={theme.name.charAt(0).toUpperCase()}
              />
            </div>
            <h1 className="text-white font-bold text-xl">{theme.name}</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Système de vérification officiel</p>
          </div>

          {/* Statut de la carte */}
          <div className="p-6 text-center">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1 uppercase">
              {card.user.firstName} {card.user.lastName}
            </h2>
            <p className="text-gray-500 font-medium mb-6">Antenne : {card.antennaName}</p>

            <div className={`py-4 rounded-xl mb-6 border ${isValid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                {isValid ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
                <span className="font-bold tracking-wide text-lg">
                  {isValid ? 'MEMBRE ACTIF' : 'CARTE INVALIDE'}
                </span>
              </div>
              {!isValid && isExpired && <span className="text-sm font-medium">La carte a expiré</span>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-left">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 text-xs block mb-1">N° de Carte</span>
                <span className="font-bold text-gray-900">{card.cardNumber}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-500 text-xs block mb-1">Expiration</span>
                <span className="font-bold text-gray-900">
                  {card.expiresAt ? new Date(card.expiresAt).toLocaleDateString('fr-FR') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
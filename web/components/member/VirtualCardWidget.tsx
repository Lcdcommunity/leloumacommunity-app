// web/components/member/VirtualCardWidget.tsx
'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import Image from 'next/image';
import { Button } from '../ui/Button';

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
  const [isFlipped, setIsFlipped] = useState(false);

  // Si la carte n'existe pas ou est verrouillée
  if (!card || card.isLocked) {
    return (
      <div className="relative w-full max-w-md aspect-[1.58/1] rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 border border-gray-300 shadow-inner flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6">
          <svg className="w-12 h-12 text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
          <h3 className="font-bold text-gray-800 text-lg">Carte verrouillée</h3>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            {card?.expiresAt 
              ? "Votre carte a expiré. Veuillez la renouveler." 
              : "Payez votre adhésion annuelle pour débloquer votre carte."}
          </p>
          <Button onClick={() => window.location.href = '/member/contributions'}>
            Régler ma carte
          </Button>
        </div>
        {/* Fausse carte floutée en arrière-plan */}
        <div className="opacity-30 blur-sm w-full h-full flex flex-col">
           <div className="h-12 bg-brand-blue w-full"></div>
           <div className="flex-1 bg-white"></div>
        </div>
      </div>
    );
  }

  // URL publique pour la vérification par scan
  const verificationUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify-card/${card.qrToken}`;

  return (
    <div className="perspective-1000 w-full max-w-md group cursor-pointer mx-auto" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`relative w-full aspect-[1.58/1] transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* === FACE AVANT === */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="h-16 bg-brand-blue flex items-center px-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <Image src="/assets/images/logolcd.jpg" alt="Logo" width={40} height={40} className="object-cover" />
              </div>
              <div className="text-white">
                <h2 className="text-sm font-bold leading-tight">Lélouma Communauté</h2>
                <p className="text-[10px] opacity-80 leading-tight">Antenne : {card.antennaName}</p>
              </div>
            </div>
            <div className="text-white/90 text-xs font-bold tracking-widest">MEMBRE</div>
          </div>

          {/* Corps de la carte */}
          <div className="flex-1 p-4 flex gap-4">
            <div className="w-24 h-32 bg-gray-100 rounded-lg border border-gray-200 flex-shrink-0 overflow-hidden shadow-sm">
              {card.user.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.user.profilePhotoUrl} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center text-sm text-gray-800 flex-1">
              <div className="mb-2">
                <span className="text-[10px] text-brand-blue font-bold uppercase tracking-wider">Nom & Prénom</span> <br/>
                <span className="font-bold text-base uppercase">{card.user.lastName} {card.user.firstName}</span>
              </div>
              <div className="mb-2 flex gap-4">
                 <div>
                   <span className="text-[10px] text-gray-500 uppercase tracking-wider">Né(e) le</span><br/>
                   <span className="font-medium">{card.user.birthDate ? new Date(card.user.birthDate).toLocaleDateString('fr-FR') : 'N/A'}</span>
                 </div>
                 <div>
                   <span className="text-[10px] text-gray-500 uppercase tracking-wider">À</span><br/>
                   <span className="font-medium">{card.user.placeOfBirth || 'N/A'}</span>
                 </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Résidence</span><br/>
                <span className="font-medium leading-tight">{card.user.city || ''}{card.user.city && card.user.country ? ', ' : ''}{card.user.country || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="h-8 bg-gray-100 border-t border-gray-200 px-4 flex items-center justify-between text-[10px] text-gray-600 font-medium">
            <span>ID: <span className="font-bold text-gray-800">{card.cardNumber}</span></span>
            <span>Expire le: <span className="font-bold text-red-600">{card.expiresAt ? new Date(card.expiresAt).toLocaleDateString('fr-FR') : 'N/A'}</span></span>
          </div>
        </div>

        {/* === FACE ARRIÈRE (QR CODE) === */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-brand-blue rounded-2xl shadow-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-white">
          <p className="text-sm font-medium mb-4 text-center text-blue-50">Scannez pour vérifier la validité</p>
          <div className="bg-white p-3 rounded-xl shadow-lg">
            <QRCode value={verificationUrl} size={130} level="H" />
          </div>
          <p className="text-[10px] mt-6 opacity-70 text-center px-4">
            Cette carte est strictement personnelle et incessible. En cas de perte, veuillez contacter votre antenne.
          </p>
        </div>

      </div>
      
      <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        Cliquez sur la carte pour la retourner
      </p>
    </div>
  );
}
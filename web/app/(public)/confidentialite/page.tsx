// web/app/(public)/confidentialite/page.tsx
import React from 'react';
import Link from 'next/link';

export default function PolitiqueConfidentialitePage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F8FAFC', minHeight: '100vh', padding: 'clamp(2rem, 5vw, 4rem) 1rem', color: '#334155' }}>
      <style>{`
        .legal-container { max-width: 800px; margin: 0 auto; background: white; padding: clamp(1.5rem, 4vw, 3rem); border-radius: 24px; box-shadow: 0 10px 40px rgba(15,23,42,0.05); }
        .legal-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 5vw, 2.5rem); font-weight: 700; color: #0F172A; margin-bottom: 0.5rem; line-height: 1.1; }
        .legal-subtitle { font-size: 0.9rem; font-weight: 600; color: #DC2626; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2rem; background: #FEF2F2; display: inline-block; padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid #FECACA; }
        .legal-section { margin-bottom: 2rem; }
        .legal-h2 { font-size: 1.1rem; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        .legal-p { font-size: 0.95rem; line-height: 1.7; margin-bottom: 1rem; color: #475569; }
        .legal-list { padding-left: 1.5rem; margin-bottom: 1rem; }
        .legal-list li { font-size: 0.95rem; line-height: 1.7; margin-bottom: 0.5rem; color: #475569; }
        .legal-strong { color: #0F172A; font-weight: 700; }
        .legal-back { display: inline-flex; align-items: center; gap: 0.5rem; color: #2563EB; font-weight: 700; text-decoration: none; margin-bottom: 2rem; font-size: 0.9rem; transition: transform 0.2s; }
        .legal-back:hover { transform: translateX(-4px); }
      `}</style>

      <div className="legal-container">
        <Link href="/" className="legal-back">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Retour à l&apos;accueil
        </Link>

        <h1 className="legal-title">Politique de Confidentialité</h1>
        <div className="legal-subtitle">Acceptation obligatoire pour l&apos;adhésion</div>

        <div className="legal-section">
          <h2 className="legal-h2">1. Préambule et consentement</h2>
          <p className="legal-p">
            La présente politique de confidentialité décrit la manière dont <span className="legal-strong">LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT (L.C.D.)</span> collecte, utilise et protège les données personnelles de ses membres. La création d&apos;un compte sur notre plateforme numérique implique l&apos;acceptation sans réserve de cette politique, conformément à nos principes de transparence communautaire.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">2. Données collectées</h2>
          <p className="legal-p">Pour assurer le bon fonctionnement de l&apos;association et la gestion des membres, nous collectons les informations suivantes lors de votre inscription et de votre utilisation de la plateforme :</p>
          <ul className="legal-list">
            <li><span className="legal-strong">Informations d&apos;identité :</span> Nom, prénom, adresse email, numéro de téléphone.</li>
            <li><span className="legal-strong">Informations associatives :</span> Antenne de rattachement, statut professionnel ou fonction.</li>
            <li><span className="legal-strong">Données financières :</span> Historique des cotisations, dons, statuts des paiements et méthodes utilisées (les coordonnées bancaires ou de Mobile Money directes ne sont pas conservées sur nos serveurs).</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">3. Utilisation des données</h2>
          <p className="legal-p">Vos données sont strictement utilisées dans le cadre exclusif du fonctionnement de l&apos;association L.C.D. :</p>
          <ul className="legal-list">
            <li>Validation de la qualité de membre adhérent et édition de la carte de membre dématérialisée.</li>
            <li>Suivi transparent des cotisations, gestion des retards et financement des projets.</li>
            <li>Communication officielle (convocations aux Assemblées Générales, actualités de l&apos;antenne, informations socio-politiques).</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">4. Transparence et partage des données</h2>
          <p className="legal-p">
            Conformément à nos statuts sur la transparence communautaire, certaines données (comme le statut des cotisations ou l&apos;état de retardataire) peuvent être visibles par les autres membres actifs au sein de la plateforme. <br/><br/>
            <span className="legal-strong">En aucun cas</span>, l&apos;association L.C.D. ne vendra, ne louera ou ne cédera vos données personnelles à des tiers ou à des fins commerciales.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">5. Sécurité et conservation</h2>
          <p className="legal-p">
            Nous mettons en œuvre des mesures de sécurité techniques (chiffrement des mots de passe, connexions sécurisées) pour protéger vos informations. Vos données sont conservées pendant toute la durée de votre adhésion. En cas de perte de la qualité de membre (démission, radiation, exclusion), vos données seront archivées conformément aux obligations légales de conservation des registres de l&apos;association, puis supprimées.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">6. Vos droits</h2>
          <p className="legal-p">
            Vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles. Vous pouvez exercer ce droit directement depuis les paramètres de votre profil sur la plateforme, ou en contactant le Secrétariat Général de l&apos;association à l&apos;adresse fournie dans les mentions légales.
          </p>
        </div>
      </div>
    </div>
  );
}
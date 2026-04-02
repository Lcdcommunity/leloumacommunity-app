// web/app/(public)/mentions-legales/page.tsx
import React from 'react';
import Link from 'next/link';

export default function MentionsLegalesPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F8FAFC', minHeight: '100vh', padding: 'clamp(2rem, 5vw, 4rem) 1rem', color: '#334155' }}>
      <style>{`
        .legal-container { max-width: 800px; margin: 0 auto; background: white; padding: clamp(1.5rem, 4vw, 3rem); border-radius: 24px; box-shadow: 0 10px 40px rgba(15,23,42,0.05); }
        .legal-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 5vw, 2.8rem); font-weight: 700; color: #0F172A; margin-bottom: 1.5rem; line-height: 1.1; }
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

        <h1 className="legal-title">Mentions Légales</h1>

        <div className="legal-section">
          <h2 className="legal-h2">1. Éditeur de la plateforme</h2>
          <p className="legal-p">
            La présente plateforme web est éditée et gérée par l&apos;association <span className="legal-strong">LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT (L.C.D.)</span>, une association à but non lucratif et apolitique œuvrant pour le développement durable.
          </p>
          <ul className="legal-list">
            <li><span className="legal-strong">Siège social :</span> LELOUMA, République de Guinée.</li>
            <li><span className="legal-strong">Déclaration officielle :</span> DECISION N°050/MATD/RAL/PREF/LMA/CAB/2025 du 17 juillet 2025.</li>
            <li><span className="legal-strong">Contact :</span> [Adresse email de contact à insérer]</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">2. Hébergement</h2>
          <p className="legal-p">
            Le site est hébergé par <span className="legal-strong">[Nom de l&apos;hébergeur, ex: Vercel Inc.]</span>.<br/>
            Adresse : <span className="legal-strong">[Adresse de l&apos;hébergeur]</span>.<br/>
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">3. Propriété intellectuelle</h2>
          <p className="legal-p">
            Le logo, la dénomination &quot;Lélouma Communauté pour le Développement (LCD)&quot; ainsi que l&apos;ensemble des contenus (textes, images, interfaces) présents sur cette plateforme sont la propriété exclusive de l&apos;association. Toute utilisation, reproduction ou manipulation frauduleuse à des fins personnelles ou commerciales sans l&apos;autorisation expresse du bureau exécutif est strictement interdite et s&apos;expose à des poursuites.
          </p>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">4. Responsabilité</h2>
          <p className="legal-p">
            L&apos;association L.C.D. met tout en œuvre pour assurer l&apos;exactitude des informations financières et associatives diffusées sur la plateforme (transparence des cotisations, projets, etc.). Toutefois, elle ne saurait être tenue responsable des éventuelles omissions ou erreurs de saisie. En cas de litige, un traitement à l&apos;amiable sera privilégié avant tout recours aux juridictions compétentes.
          </p>
        </div>
      </div>
    </div>
  );
}
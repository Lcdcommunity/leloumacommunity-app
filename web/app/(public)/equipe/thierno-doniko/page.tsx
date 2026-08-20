// web/app/(public)/equipe/thierno-doniko/page.tsx
import React from 'react';
import Link from 'next/link';

export default function BiographieThiernoDonikoPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F8FAFC', minHeight: '100vh', padding: 'clamp(2rem, 5vw, 4rem) 1rem', color: '#334155' }}>
      <style>{`
        .legal-container { max-width: 800px; margin: 0 auto; background: white; padding: clamp(1.5rem, 4vw, 3rem); border-radius: 24px; box-shadow: 0 10px 40px rgba(15,23,42,0.05); }
        .legal-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 5vw, 2.8rem); font-weight: 700; color: #0F172A; margin-bottom: 0.35rem; line-height: 1.1; }
        .legal-subtitle { font-size: 0.9rem; font-weight: 600; color: #1D4ED8; margin-bottom: 2rem; }
        .legal-section { margin-bottom: 2rem; }
        .legal-h2 { font-size: 1.1rem; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        .legal-list { padding-left: 1.5rem; margin-bottom: 1rem; }
        .legal-list li { font-size: 0.95rem; line-height: 1.7; margin-bottom: 0.5rem; color: #475569; }
        .legal-strong { color: #0F172A; font-weight: 700; }
        .legal-back { display: inline-flex; align-items: center; gap: 0.5rem; color: #2563EB; font-weight: 700; text-decoration: none; margin-bottom: 2rem; font-size: 0.9rem; transition: transform 0.2s; }
        .legal-back:hover { transform: translateX(-4px); }
        .timeline-item { margin-bottom: 1rem; padding-left: 1rem; border-left: 2px solid #E2E8F0; }
        .timeline-period { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #64748B; margin-bottom: 0.2rem; }
        .timeline-role { font-size: 0.95rem; font-weight: 700; color: #0F172A; margin-bottom: 0.2rem; }
        .timeline-desc { font-size: 0.88rem; line-height: 1.6; color: #475569; }
        .legal-external-link { color: #1D4ED8; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
      `}</style>

      <div className="legal-container">
        <Link href="/mentions-legales" className="legal-back">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Retour aux mentions légales
        </Link>

        <h1 className="legal-title">Thierno Saïdou Diallo</h1>
        <div className="legal-subtitle">Connu sous le nom &quot;Thierno Doniko&quot; · Développeur &amp; Webmaster de la plateforme</div>

        <div className="legal-section">
          <h2 className="legal-h2">Parcours scolaire</h2>
          <div className="timeline-item">
            <div className="timeline-period">1991 – 1996</div>
            <div className="timeline-role">Études primaires</div>
            <div className="timeline-desc">École primaire de Kénéry, Lélouma, République de Guinée.</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">1997 – 2000</div>
            <div className="timeline-role">Études secondaires (collège)</div>
            <div className="timeline-desc">Collège Soloprimo, Koloma, Conakry.</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">2001 – 2003</div>
            <div className="timeline-role">Études secondaires (lycée)</div>
            <div className="timeline-desc">Lycée de Kipé, Conakry.</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">2004</div>
            <div className="timeline-role">Concours d&apos;accès aux institutions supérieures</div>
            <div className="timeline-desc">Conakry, République de Guinée.</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">2004 – 2008</div>
            <div className="timeline-role">Diplôme d&apos;Ingénieur Agronome – Zootechnie (équivalent Master)</div>
            <div className="timeline-desc">Institut Supérieur Agronomique et Vétérinaire Valery Giscard d&apos;Estaing de Faranah, Guinée.</div>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">Formation continue &amp; certifications</h2>
          <ul className="legal-list">
            <li>Développement d&apos;outils de gestion &amp; bases de données (No-Code/IA : Glide, Softr, Airtable) — ALEGRIA Group, 2024.</li>
            <li>Titre Développeur Web Front-end &amp; Back-end — STUDI, 2024.</li>
            <li>Gestion administrative (secrétariat, plannings, paie) — LPDE, 2023.</li>
            <li>Agent d&apos;escale polyvalent (Amadeus, Altéa/Air France, sûreté DGAC, DGR9 IATA, PMR/PHMR) — AIRSUP, 2021.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">Parcours professionnel</h2>
          <div className="timeline-item">
            <div className="timeline-period">Mai 2024 – juillet 2026</div>
            <div className="timeline-role">Technicien automobile &amp; logistique — Renault Technocentre, Guyancourt (France)</div>
            <div className="timeline-desc">Analyse et traitement des pièces incidentées, organisation et coordination d&apos;expéditions internationales (Europe, Afrique, Amérique, Asie), gestion des retours et recours fournisseurs.</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">Fév. – Mars 2024</div>
            <div className="timeline-role">Logisticien — Veolia (Technocentre Renault), Guyancourt (France)</div>
            <div className="timeline-desc">Etudes technique et proposition des solutions en vue de la fluidité des opérations</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">Août 2022 – Janvier 2024</div>
            <div className="timeline-role">Agent d&apos;accueil et d&apos;Escale aéroportuaire — Aéroport de Roissy-CDG (ADECCO)</div>
            <div className="timeline-desc">Checking, embarquement, assistance et accompagnement des passagers.</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">Sept. 2021 – Juil. 2022</div>
            <div className="timeline-role">Agent d&apos;appui aux équipes enseignantes — DSDEN, Académie de Versailles (France)</div>
            <div className="timeline-desc">Appui opérationnel aux équipes pédagogiques pendant la crise sanitaire (Covid-19).</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">Juin 2021 – Août 2022</div>
            <div className="timeline-role">Agent logistique &amp; support administratif — FFSS</div>
            <div className="timeline-desc">Gestion documentaire et appui logistique/administratif aux équipes de terrain à Orly Aéroport.</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">Juin – Août 2021</div>
            <div className="timeline-role">Agent d&apos;Escale CDG (ADECCO)</div>
            <div className="timeline-desc">Checking, embarquement, assistance et accompagnement des passagers.</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">2016 – 2019</div>
            <div className="timeline-role">Coordinateur &amp; Superviseur général — Cash Moov, Sénégal</div>
            <div className="timeline-desc">Gestion et coordination de l&apos;entreprise au Sénégal, en Gambie et en Guinée-Bissau : recherche de partenaires, gestion de points de vente, relation clientèle et gestion de caisse (2 employés directs, 12 partenaires).</div>
          </div>
          <div className="timeline-item">
            <div className="timeline-period">2010 – 2016</div>
            <div className="timeline-role">Agent de crédit — CRG, Institution de microfinance, Guinée</div>
            <div className="timeline-desc">Octroi de crédits, suivi de comptes clients, gestion de portefeuilles et émission de rapports financiers.</div>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-h2">Projets personnels &amp; transformation digitale</h2>
          <ul className="legal-list">
            <li>
              <span className="legal-strong">AssoGlobal (Grand Chef)</span> — plateforme SaaS multi-tenant de création et de gestion d&apos;associations, août 2026 —{' '}
              <a href="https://www.dkmoney.store" className="legal-external-link" target="_blank" rel="noopener noreferrer">dkmoney.store</a>
            </li>
            <li>
              <span className="legal-strong">Direct Transf&apos;air</span> — plateforme SaaS de transfert d&apos;argent international, juil. 2026 —{' '}
              <a href="https://direct-transfair.eu" className="legal-external-link" target="_blank" rel="noopener noreferrer">direct-transfair.eu</a>
            </li>
            <li>
              <span className="legal-strong">Lélouma Communauté</span> — plateforme SaaS de gestion associative (ERP), jan. 2026 —{' '}
              <a href="https://www.leloumacommunity.com" className="legal-external-link" target="_blank" rel="noopener noreferrer">leloumacommunity.com</a>
            </li>
            <li>
              <span className="legal-strong">Work Pay</span> — portail RH &amp; gestion des congés, juil. 2025 —{' '}
              <a href="https://socass-rma.fr" className="legal-external-link" target="_blank" rel="noopener noreferrer">socass-rma.fr</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
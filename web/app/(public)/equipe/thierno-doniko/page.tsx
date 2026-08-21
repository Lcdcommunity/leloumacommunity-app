// web/app/(public)/equipe/thierno-doniko/page.tsx
import React from 'react';
import Link from 'next/link';
import PageHero from '../../../../components/PageHero';

export default function BiographieThiernoDonikoPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#FAF7F2', minHeight: '100vh', color: '#334155' }}>
      <style>{`
        .legal-page-body { padding: 0 1rem clamp(2rem, 5vw, 4rem); }
        .legal-container { max-width: 860px; margin: -3rem auto 0; position: relative; z-index: 3; background: white; padding: clamp(1.5rem, 4vw, 3.25rem); border-radius: 24px; box-shadow: 0 10px 40px rgba(15,23,42,0.08); }

        .bio-back { display: inline-flex; align-items: center; gap: 0.5rem; color: #2563EB; font-weight: 700; text-decoration: none; margin-bottom: 2rem; font-size: 0.85rem; }

        .bio-lede {
          font-family: 'Cormorant Garamond', serif; font-style: italic;
          font-size: clamp(1.2rem, 2.4vw, 1.5rem); line-height: 1.5; color: #0F172A;
          margin-bottom: 2.25rem; padding-bottom: 2rem; border-bottom: 1px solid #E2E8F0;
        }

        .bio-section { margin-bottom: 2.25rem; }
        .bio-h2 {
          font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
          color: #1D4ED8; margin-bottom: 0.85rem;
        }
        .bio-p { font-size: 0.98rem; line-height: 1.8; color: #475569; margin-bottom: 1rem; }
        .bio-p strong { color: #0F172A; }

        .bio-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.75rem 0 2.25rem; }
        @media (max-width: 560px) { .bio-stats { grid-template-columns: 1fr 1fr; } }
        .bio-stat { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 1.1rem 1rem; text-align: center; }
        .bio-stat-num { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; color: #1D4ED8; line-height: 1; margin-bottom: 0.3rem; }
        .bio-stat-label { font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.4; }

        .bio-highlights { display: flex; flex-direction: column; gap: 0.9rem; }
        .bio-highlight { display: flex; gap: 0.85rem; align-items: flex-start; }
        .bio-highlight-dot { width: 8px; height: 8px; border-radius: 50%; background: #059669; margin-top: 0.5rem; flex-shrink: 0; }
        .bio-highlight-text { font-size: 0.95rem; line-height: 1.7; color: #475569; }
        .bio-highlight-text strong { color: #0F172A; }

        .bio-projects { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.9rem; }
        @media (max-width: 700px) { .bio-projects { grid-template-columns: 1fr; } }
        .bio-project-card {
          border-radius: 16px; padding: 1.1rem 1.15rem; color: #fff;
          background: linear-gradient(135deg, var(--pc1), var(--pc2));
          box-shadow: 0 10px 26px rgba(15,23,42,0.14);
        }
        .bio-project-name { font-weight: 800; font-size: 0.95rem; margin-bottom: 0.35rem; }
        .bio-project-desc { font-size: 0.8rem; line-height: 1.55; opacity: 0.92; margin-bottom: 0.7rem; }
        .bio-project-link { font-size: 0.75rem; font-weight: 700; color: #fff; text-decoration: underline; text-underline-offset: 2px; opacity: 0.95; }

        .bio-reveal { opacity: 0; animation: bioFadeUp 0.7s cubic-bezier(.22,1,.36,1) forwards; }
        .bio-reveal.bd-1 { animation-delay: 0.05s; }
        .bio-reveal.bd-2 { animation-delay: 0.15s; }
        .bio-reveal.bd-3 { animation-delay: 0.25s; }
        .bio-reveal.bd-4 { animation-delay: 0.35s; }
        .bio-reveal.bd-5 { animation-delay: 0.45s; }
        @keyframes bioFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .bio-reveal { animation: none; opacity: 1; } }
      `}</style>

      <PageHero
        crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Mentions légales', href: '/mentions-legales' }, { label: 'Thierno Doniko' }]}
        title="Thierno Doniko"
        description="Ingénieur agronome devenu bâtisseur de plateformes numériques — développeur et webmaster de la plateforme LCD."
      />

      <div className="legal-page-body">
        <div className="legal-container">
          <Link href="/mentions-legales" className="bio-back">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Retour aux mentions légales
          </Link>

          <p className="bio-lede bio-reveal bd-1">
            De Lélouma à la logistique aéroportuaire francilienne, puis du terrain vers le code : Thierno Doniko incarne cette génération de la diaspora qui met ses compétences au service de sa communauté d&apos;origine — en construisant, seul, l&apos;outil numérique qui la relie.
          </p>

          <div className="bio-stats bio-reveal bd-2">
            <div className="bio-stat">
              <div className="bio-stat-num">8+</div>
              <div className="bio-stat-label">ans d&apos;expérience professionnelle</div>
            </div>
            <div className="bio-stat">
              <div className="bio-stat-num">4</div>
              <div className="bio-stat-label">continents coordonnés en logistique</div>
            </div>
            <div className="bio-stat">
              <div className="bio-stat-num">3</div>
              <div className="bio-stat-label">plateformes SaaS conçues et déployées</div>
            </div>
          </div>

          <div className="bio-section bio-reveal bd-2">
            <div className="bio-h2">Portrait</div>
            <p className="bio-p">
              Né à Lélouma, en République de Guinée, Thierno grandit entre l&apos;école Elémentaire de Kénéry et les bancs de l&apos;Institut Supérieur Agronomique et Vétérinaire de Faranah, où il décroche en 2008 un diplôme d&apos;ingénieur agronome. Mais c&apos;est ailleurs qu&apos;il trouvera sa véritable trajectoire : dans la coordination internationale, puis dans le code.
            </p>
            <p className="bio-p">
              Installé en France depuis 2019, il construit un parcours professionnel dense et exigeant — de la microfinance en Guinée à la logistique aéroportuaire de Roissy-CDG, en passant par la coordination d&apos;expéditions industrielles pour l&apos;automobile sur quatre continents. Un fil conducteur traverse chacune de ces expériences : <strong>la rigueur documentaire, la gestion de flux complexes, et le sens du service</strong>.
            </p>
          </div>

          <div className="bio-section bio-reveal bd-3">
            <div className="bio-h2">Le tournant numérique</div>
            <p className="bio-p">
              En 2024, Thierno se forme en autodidacte au développement web — front-end, back-end, bases de données — et transforme cette double culture (terrain + technique) en un métier à part entière. Il ne se contente pas d&apos;apprendre à coder : <strong>il conçoit et déploie, seul, des plateformes complètes</strong>, de la modélisation de la base de données jusqu&apos;à la mise en production.
            </p>
            <div className="bio-highlights">
              <div className="bio-highlight">
                <div className="bio-highlight-dot" />
                <div className="bio-highlight-text"><strong>Pilote de bout en bout</strong> la conception d&apos;une plateforme SaaS de gestion associative : cartes membres à QR Code, module financier, gouvernance avec votes et calcul de quorum.</div>
              </div>
              <div className="bio-highlight">
                <div className="bio-highlight-dot" />
                <div className="bio-highlight-text">Conçoit et livre <strong>seul</strong> un portail RH interne sécurisé, du recueil des besoins jusqu&apos;au déploiement en production.</div>
              </div>
              <div className="bio-highlight">
                <div className="bio-highlight-dot" />
                <div className="bio-highlight-text">Développe une plateforme SaaS de transfert d&apos;argent international, pensée pour les besoins spécifiques de la diaspora ouest-africaine.</div>
              </div>
            </div>
          </div>

          <div className="bio-section bio-reveal bd-4">
            <div className="bio-h2">Au service de sa communauté</div>
            <p className="bio-p">
              C&apos;est cette expertise que Thierno met bénévolement au service de <strong>Lélouma Communauté pour le Développement</strong>, en tant que développeur et webmaster de la plateforme que vous consultez actuellement — un engagement qui relie directement ses compétences numériques à ses racines guinéennes.
            </p>
          </div>

          <div className="bio-section bio-reveal bd-5">
            <div className="bio-h2">Projets</div>
            <div className="bio-projects">
              <div className="bio-project-card" style={{ '--pc1': '#1D4ED8', '--pc2': '#0F172A' } as React.CSSProperties}>
                <div className="bio-project-name">AssoGlobal (Grand Chef)</div>
                <div className="bio-project-desc">Plateforme SaaS multi-tenant de création et gestion d&apos;associations.</div>
                <a href="https://www.dkmoney.store" target="_blank" rel="noopener noreferrer" className="bio-project-link">dkmoney.store</a>
              </div>
              <div className="bio-project-card" style={{ '--pc1': '#059669', '--pc2': '#0F172A' } as React.CSSProperties}>
                <div className="bio-project-name">Direct Transf&apos;air</div>
                <div className="bio-project-desc">Plateforme SaaS de transfert d&apos;argent international (Direct-Transfair).</div>
                <a href="https://direct-transfair.eu" target="_blank" rel="noopener noreferrer" className="bio-project-link">direct-transfair.eu</a>
              </div>
              <div className="bio-project-card" style={{ '--pc1': '#B45309', '--pc2': '#0F172A' } as React.CSSProperties}>
                <div className="bio-project-name">Work Pay</div>
                <div className="bio-project-desc">Portail RH &amp; gestion des congés et des RMA (Rélévés d&apos;Heures Mensuels) en entreprise.</div>
                <a href="https://socass-rma.fr" target="_blank" rel="noopener noreferrer" className="bio-project-link">socass-rma.fr</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
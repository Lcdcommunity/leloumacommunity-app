// web/app/(public)/mentions-legales/page.tsx
import React from 'react';
import Link from 'next/link';
import PageHero from '../../../components/PageHero';

export default function MentionsLegalesPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#FAF7F2', minHeight: '100vh', color: '#334155' }}>
      <style>{`
        .legal-page-body { padding: 0 1rem clamp(2rem, 5vw, 4rem); }
        .legal-container { max-width: 800px; margin: -3rem auto 0; position: relative; z-index: 3; background: white; padding: clamp(1.5rem, 4vw, 3rem); border-radius: 24px; box-shadow: 0 10px 40px rgba(15,23,42,0.08); }
        .legal-section { margin-bottom: 2rem; }
        .legal-h2 { font-size: 1.1rem; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        .legal-p { font-size: 0.95rem; line-height: 1.7; margin-bottom: 1rem; color: #475569; }
        .legal-list { padding-left: 1.5rem; margin-bottom: 1rem; }
        .legal-list li { font-size: 0.95rem; line-height: 1.7; margin-bottom: 0.5rem; color: #475569; }
        .legal-strong { color: #0F172A; font-weight: 700; }
        .legal-link { color: #1D4ED8; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
        .legal-link:hover { color: #1E40AF; }
        .legal-divider { border: none; border-top: 1px solid #E2E8F0; margin: 2.5rem 0; }
        .legal-kicker { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748B; margin-bottom: 0.5rem; }
        .legal-motto { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 1.15rem; color: #1D4ED8; margin-bottom: 1.25rem; }
        .commission-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
        @media (max-width: 560px) { .commission-grid { grid-template-columns: 1fr; } }
        .commission-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.9rem 1rem; }
        .commission-num { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #1D4ED8; margin-bottom: 0.3rem; }
        .commission-name { font-size: 0.85rem; font-weight: 600; color: #334155; line-height: 1.5; }
        .legal-highlight { background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 16px; padding: 1.25rem 1.5rem; margin-top: 1rem; }
      `}</style>

      <PageHero
        crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Mentions légales' }]}
        title="Mentions Légales"
        description="Cadre officiel de la plateforme numérique de Lélouma Communauté pour le Développement."
        logoUrl="https://res.cloudinary.com/dz8ymtvjz/image/upload/v1776521259/lelouma_community/jovsruxyobwb1aqz9zae.jpg"
      />

      <div className="legal-page-body">
        <div className="legal-container">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#2563EB', fontWeight: 700, textDecoration: 'none', marginBottom: '1.75rem', fontSize: '0.85rem' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Retour à l&apos;accueil
          </Link>

          <div className="legal-section">
            <h2 className="legal-h2">1. Éditeur de la plateforme</h2>
            <p className="legal-p">
              La présente plateforme web est éditée et gérée par l&apos;association <span className="legal-strong">LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT (L.C.D.)</span>, une association à but non lucratif et apolitique œuvrant pour le développement durable.
            </p>
            <ul className="legal-list">
              <li><span className="legal-strong">Siège social :</span> Bâtiment de la mairie de la commune Urbaine, à Pétel, préfecture de Lélouma, République de Guinée.</li>
              <li><span className="legal-strong">Déclaration officielle :</span> DECISION N°050/MATD/RAL/PREF/LMA/CAB/2025 du 17 juillet 2025.</li>
              <li><span className="legal-strong">Téléphone :</span> +224 628 40 00 56</li>
              <li><span className="legal-strong">Contact :</span> lelouma.community@gmail.com</li>
              <li><span className="legal-strong">Présidente :</span> Fatoumata Binta Diallo (France – Paris)</li>
              <li><span className="legal-strong">Développeur / Webmaster :</span> <Link href="/equipe/thierno-doniko" className="legal-link">Thierno Doniko</Link> (France – Paris)</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2 className="legal-h2">2. Hébergement</h2>
            <p className="legal-p">Le site et ses services reposent sur les prestataires techniques suivants :</p>
            <ul className="legal-list">
              <li><span className="legal-strong">Nom de domaine (DNS) :</span> OVH SAS — 2 rue Kellermann, 59100 Roubaix, France.</li>
              <li><span className="legal-strong">Hébergement de l&apos;application web :</span> Vercel Inc. — 650 California St, San Francisco, CA 94108, États-Unis.</li>
              <li><span className="legal-strong">Hébergement du backend / API :</span> Render — Render Services Inc., San Francisco, États-Unis.</li>
              <li><span className="legal-strong">Envoi des emails transactionnels :</span> Resend (Plus Five Five, Inc.) — 2261 Market Street #5039, San Francisco, CA 94114, États-Unis.</li>
            </ul>
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
              L&apos;association L.C.D. met tout en œuvre pour assurer l&apos;exactitude des informations financières et associatives diffusées sur la plateforme (transparence des cotisations, projets, etc.). Toutefois, elle ne saurait être tenue responsable des éventuelles omissions ou erreurs de saisie, ni d&apos;une interruption ou indisponibilité du service liée à ses prestataires techniques (OVH, Vercel, Render, Resend). En cas de litige, un traitement à l&apos;amiable sera privilégié avant tout recours aux juridictions compétentes.
            </p>
          </div>

          <hr className="legal-divider" />

          <div className="legal-section">
            <div className="legal-kicker">Pour aller plus loin</div>
            <h2 className="legal-h2">5. Notre mission et notre vision</h2>
            <div className="legal-motto">« Union — Travail — Progrès »</div>
            <p className="legal-p">
              L&apos;association porte une vision de développement intégré, solidaire et durable pour l&apos;ensemble de la préfecture de Lélouma. Son but principal est de promouvoir le développement durable de la préfecture, en fédérant l&apos;ensemble des associations et sous-préfectures de Lélouma autour d&apos;objectifs communs plutôt que de disperser les efforts à travers des actions isolées.
            </p>
            <p className="legal-p">L&apos;association se fixe notamment comme objectifs de :</p>
            <ul className="legal-list">
              <li>Contribuer à l&apos;amélioration des services de santé, de l&apos;éducation et de la formation professionnelle dans toutes les sous-préfectures ;</li>
              <li>Participer activement au développement de l&apos;agriculture, de l&apos;élevage et des activités génératrices de revenus ;</li>
              <li>Sensibiliser à l&apos;urgence climatique à travers la lutte contre les feux de brousse, le braconnage, la déforestation, et promouvoir le reboisement et les énergies propres ;</li>
              <li>Identifier, concevoir et mettre en œuvre des projets structurants pour la communauté, et rechercher des financements auprès d&apos;associations, ONG, fondations ou institutions ;</li>
              <li>Porter une attention particulière aux couches sociales les plus vulnérables ;</li>
              <li>Valoriser la culture, le sport et le tourisme éco-responsable.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2 className="legal-h2">6. Gouvernance</h2>
            <p className="legal-p">
              L&apos;association s&apos;organise autour de cinq instances : l&apos;Assemblée Générale, le Comité Directeur (organe exécutif élu pour 3 ans), le Conseil des sages (rôle de médiation et de discipline), les antennes locales et internationales, et quatre Commissions Techniques qui pilotent les projets par domaine :
            </p>
            <div className="commission-grid">
              <div className="commission-card">
                <div className="commission-num">Commission 1</div>
                <div className="commission-name">Éducation, Santé, Citoyenneté et Protection de l&apos;enfance</div>
              </div>
              <div className="commission-card">
                <div className="commission-num">Commission 2</div>
                <div className="commission-name">Information, Communication, Sport, Culture et Sécurité</div>
              </div>
              <div className="commission-card">
                <div className="commission-num">Commission 3</div>
                <div className="commission-name">Agriculture, Sécurité alimentaire, Environnement, Tourisme et Biodiversité</div>
              </div>
              <div className="commission-card">
                <div className="commission-num">Commission 4</div>
                <div className="commission-name">Solidarité, Infrastructures, PME, Artisanat et Formation professionnelle</div>
              </div>
            </div>
            <p className="legal-p">Toutes les fonctions exercées au sein de l&apos;association sont bénévoles ; seuls les frais engagés dans l&apos;accomplissement d&apos;un mandat peuvent être remboursés sur justificatifs.</p>
          </div>

          <div className="legal-section">
            <h2 className="legal-h2">7. Ressources financières</h2>
            <p className="legal-p">Conformément à ses statuts, L.C.D. finance ses actions par :</p>
            <ul className="legal-list">
              <li>Les cotisations de ses membres, dont le montant est fixé par le Comité Directeur et approuvé par l&apos;Assemblée Générale ;</li>
              <li>L&apos;organisation de manifestations de soutien (événements culturels, activités sportives, spectacles, brocantes) ;</li>
              <li>Le mécénat, les dons et les legs ;</li>
              <li>Les subventions d&apos;États et d&apos;organisations internationales.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2 className="legal-h2">8. L&apos;antenne LCD France</h2>
            <p className="legal-p">
              Afin de mieux structurer l&apos;engagement de la diaspora, une antenne dédiée — <span className="legal-strong">« Lélouma Communauté pour le Développement – France » (LCD France)</span> — a été constituée en France sous le régime de la loi du 1er juillet 1901, lors de l&apos;Assemblée Générale constitutive tenue sur WhatsApp, le 19 août 2026. Il s&apos;agit d&apos;une association distincte, actuellement en cours de formalités de déclaration auprès de la préfecture des Yvelines.
            </p>
            <div className="legal-highlight">
              <p className="legal-p" style={{ marginBottom: '0.5rem' }}><span className="legal-strong">Siège social :</span> Mairie de Lélouma, Guinée.</p>
              <p className="legal-p" style={{ marginBottom: 0 }}>
                <span className="legal-strong">Conseil d&apos;administration :</span> Présidente — Fatoumata Binta DIALLO · Trésorier — Elhadj Cellou DIALLO · Secrétaire général — Alpha DIALLO·
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
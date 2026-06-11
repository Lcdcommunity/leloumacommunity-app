// web/app/documents/statuts/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ✅ FIX : texte extrait en constante pour éviter les apostrophes non échappées dans le JSX
const PREAMBLE_TEXT = "Vu la charte nationale de la transition ; vu l'ordonnance N°2021/001/PRG/CNRD/SGG du 16 Septembre 2021 ; vu la loi L/03/AN/2005 du 04 Juillet 2005, fixant le régime général des associations en République de Guinée ; vu le retard accumulé par la préfecture de Lélouma dans la plupart des domaines de développement ; vu la multiplicité des associations actives dans les districts et quartiers de Lélouma ; considérant le rôle de plus en plus central que jouent les organisations associatives dans le développement socioéconomique, culturel et environnemental de chaque État —";

const PREAMBLE_CONCLUSION = "nous membres décidons de ce qui suit.";

const PARTS = [
  {
    id: 'part1',
    roman: 'I',
    title: 'Création, Dénomination, Devise, Vision, Siège social, Durée, But et Objectifs',
    articles: [
      { n: 1,  title: 'Création',         body: "Il est créé entre les filles, fils, amis(es) et sympathisants, adhérant aux présents statuts et règlement intérieur, une association à but non lucratif, apolitique sans distinction d'ethnie, de race ou de religion pour toute la communauté de Lélouma qui fédère toutes les associations et de toutes les sous-préfectures de Lélouma du nom de Lélouma Communauté pour le Développement LCD." },
      { n: 2,  title: 'Dénomination',     body: "L'association a pour dénomination LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT en abrégé L.C.D." },
      { n: 3,  title: 'Devise',           body: "Union — Travail — Progrès" },
      { n: 4,  title: 'Vision',           body: "L'association porte une vision de développement intégré, solidaire et durable pour l'ensemble de la préfecture de Lélouma." },
      { n: 5,  title: 'Siège social',     body: "Le Siège social est établi à Lélouma. Il peut être déplacé ou transféré partout ailleurs sur le territoire national sur décision de l'Assemblée Générale." },
      { n: 6,  title: 'Durée',            body: "L'association LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT en abrégé L.C.D est instituée pour une durée illimitée." },
      { n: 7,  title: 'But',              body: "Le but principal de l'association L.C.D est de promouvoir le développement durable. C'est une association apolitique et à but non lucratif." },
      { n: 8,  title: 'Objectifs',        body: "L'association a pour objectif principal de définir un schéma de croissance équilibré et durable pour la préfecture de Lélouma, en mettant en œuvre des programmes qui favorisent : le développement économique local ; le progrès social fondé sur l'équité et la justice ; la protection de l'environnement ; l'accès à l'éducation, à la santé et à la formation pour tous ; la valorisation du sport et de la culture.\n\nObjectifs spécifiques : Fédérer l'ensemble des organisations de ressortissants et résidents de la préfecture ; contribuer à l'amélioration des services de santé, de l'éducation et de la formation professionnelle dans toutes les sous-préfectures ; participer activement au développement de l'agriculture, de l'élevage et des activités génératrices de revenus ; sensibiliser sur l'urgence climatique ; promouvoir la solidarité, la cohésion sociale et l'entraide entre les filles et fils de Lélouma ; identifier, concevoir et mettre en œuvre des projets structurants ; porter une attention particulière aux couches sociales les plus vulnérables ; valoriser la culture, le sport et le tourisme éco-responsable." },
      { n: 9,  title: "Zone d'intervention",      body: "La zone géographique d'intervention est la Préfecture de Lélouma. Des actions peuvent être menées sur toute l'étendue du territoire national et dans tout autre lieu où se trouve un représentant de LCD." },
      { n: 10, title: "Domaines d'intervention",  body: "Les domaines d'intervention sont l'économie, le social et l'environnement." },
      { n: 11, title: "Conditions et droits d'adhésion", body: "L'adhésion est libre et volontaire. L'association est ouverte à tous les ressortissants de la préfecture de Lélouma, les amis et les sympathisants qui en font la demande." },
      { n: 12, title: 'Qualité de membre',         body: "Peut être membre de l'Association, toute personne qui accepte de se conformer aux présents statuts et règlement intérieur." },
      { n: 13, title: 'Perte de la qualité de membre', body: "La qualité de membre se perd par : non-respect du règlement intérieur, le décès, la démission, la radiation, l'exclusion." },
    ],
  },
  {
    id: 'part2',
    roman: 'II',
    title: 'Organisation et Fonctionnement',
    articles: [
      { n: 14, title: "L'Assemblée Générale", body: "Elle regroupe tous les membres de l'association. Elle est l'organe délibérante de toutes les décisions prises par la coordination (comité directeur). L'Assemblée Générale se réunit en session ordinaire une fois par an sur convocation du Président. Elle peut également se réunir en session extraordinaire une fois que les 2/3 des membres en expriment le désir. Les délibérations sont prises à la majorité des voix des membres présents, chaque membre étant inscrit à une voix. Pour la validation des délibérations, la présence du 1/4 des membres est nécessaire." },
      { n: 15, title: 'La Coordination — Comité Directeur', body: "Le Comité Directeur est l'organe exécutif de l'association. Il est composé d'un nombre impair de membres et détient le dernier mot dans les grandes décisions. Il est élu par l'Assemblée Générale pour une durée de 3 ans renouvelable. Il est composé des postes suivants : Président, Vice-Président(e), Secrétaire Général (et adjoints), Trésorier Général (et adjoints), Présidence des commissions, Secrétariat à la communication et des partenariats, Secrétariat à l'organisation, Secrétariat des programmes et projets." },
      { n: 16, title: 'Les antennes locales', body: "L'association peut établir des représentations appelées antennes dans d'autres régions ou pays où résident des membres ou sympathisants de la communauté. Ces antennes ne disposent pas d'autonomie juridique propre, mais agissent sous l'autorité du siège et conformément aux décisions de la Coordination. Leur création, fonctionnement et dissolution sont décidés par la Coordination et validés par l'Assemblée Générale." },
      { n: 17, title: 'Le Conseil de sages', body: "Le Conseil des sages est compétent pour prononcer à l'encontre des membres l'ensemble des sanctions prévues par la réglementation en vigueur et inscrites dans le règlement intérieur de L.C.D. Le règlement intérieur est le document support de l'ensemble des questions relatives aux droits et aux devoirs des membres, à la discipline et aux conséquences en cas de non-respect des règles." },
      { n: 18, title: 'Les Commissions Techniques', body: "Les commissions techniques sont : Commission 1 : Éducation, Santé, Citoyenneté et Protection de l'enfance. Commission 2 : Information, communication, Sport, Culture et Sécurité. Commission 3 : Agriculture, Sécurité alimentaire, Environnement, Tourisme et Biodiversité. Commission 4 : Solidarité, Infrastructures, PME, Artisanat et Formation professionnelle. Ces commissions fonctionnent en mode « projets »." },
      { n: 19, title: 'Le/la Président(e)', body: "Il/elle veille au respect des statuts et du règlement intérieur et s'assure de l'application correcte des décisions prises. Il/elle est habilité(e) à : superviser et mettre en œuvre l'ensemble des activités de l'association ; présider les réunions de la Coordination et de l'Assemblée Générale ; représenter l'association dans tous les actes de la vie civile ; ordonner les dépenses ; diriger les équipes ; gérer le planning des projets ; représenter l'association auprès des différents partenaires et bailleurs." },
      { n: 20, title: 'Le/la Vice-président(e)', body: "Il/elle assiste le Président et le remplace en cas d'empêchement. Le/la Vice-président est particulièrement chargé d'étudier, d'élaborer et de coordonner les projets en collaboration avec les membres du bureau de la coordination et commissions. En cas de vacance de pouvoir, il/elle assure l'intérim jusqu'à la fin du mandat." },
      { n: 21, title: 'Le Secrétaire Général', body: "Le Secrétaire Général gère toute la documentation de L.C.D. Il tient à jour, reçoit, classe et émet tous les documents de l'association. Il est notamment chargé de la tenue des différents registres de l'association, de la rédaction des procès-verbaux des assemblées et des réunions." },
      { n: 22, title: 'Le Trésorier', body: "Il a la charge de tout ce qui concerne la gestion financière de l'association. Il est le garant d'une bonne gestion des finances en surveillant les dépenses et les comptes bancaires. Il tient une comptabilité précise et à jour en enregistrant toutes les transactions financières. Il participe à l'élaboration du budget annuel en s'assurant qu'il est réaliste et équilibré." },
      { n: 23, title: 'Présidence des commissions', body: "Supervise les commissions, assure leur bon fonctionnement et leur coordination." },
      { n: 24, title: 'Le Secrétariat à la communication et partenariats', body: "Gère la communication interne et externe, établit les partenariats avec les ONG et autres parties prenantes." },
      { n: 25, title: "Le Secrétariat à l'organisation", body: "Coordonne et soutient l'organisation, en assurant la fluidité des tâches administratives et la communication interne." },
      { n: 26, title: 'Le secrétariat aux projets et programmes', body: "Coordonne la mise en œuvre des projets, supervise les équipes et évalue les résultats." },
      { n: 27, title: 'Le Conseil de sages — discipline', body: "Le Conseil de discipline est compétent pour prononcer l'ensemble des sanctions prévues. Il joue un rôle d'éducation. Il est composé d'au moins 1 représentant par sous-préfecture et 1 représentant des autorités religieuses. Il est présidé par le président d'honneur." },
      { n: 28, title: 'Les Commissions techniques', body: "Les commissions techniques sont pilotées par la présidence des commissions du bureau de la coordination. Elles mettent en œuvre la politique de l'association et les programmes d'actions. Le Bureau exécutif de chaque commission est composé d'un Président, de Vice-Présidents et de Secrétaires, élu pour une durée de 3 ans renouvelable sans limitation de mandats." },
      { n: 29, title: 'Le Commissariat aux Comptes', body: "Les membres du Commissariat aux Comptes ne font pas partie du Bureau exécutif. Ils exercent leur mission de manière totalement indépendante, afin de garantir l'objectivité et la transparence dans la vérification des comptes de l'association." },
      { n: 30, title: 'Rémunération', body: "Toutes les fonctions exercées au sein de l'association sont à titre gratuit et bénévoles. Les frais occasionnés par l'accomplissement d'une tâche sous mandat en bonne et due forme peuvent être remboursés sur présentation de justificatifs." },
    ],
  },
  {
    id: 'part3',
    roman: 'III',
    title: 'Ressources Financières',
    articles: [
      { n: 31, title: 'Les recettes propres de L.C.D', body: "Les Ressources financières de L.C.D sont composées de :\na. Cotisations : L.C.D est libre d'exiger ou non une cotisation auprès de ses membres d'un montant qui sera fixé par le bureau de la Coordination et approuvé par l'Assemblée Générale.\nb. Autres recettes : provenant de l'organisation de manifestations de soutien (événements culturels, activités sportives, spectacles, brocantes…)\nc. Mécénat, Dons et Legs\nd. Les Subventions : États et organisations internationales" },
    ],
  },
  {
    id: 'part4',
    roman: 'IV',
    title: 'Modification et Dissolution',
    articles: [
      { n: 32, title: 'Modification des Statuts', body: "Les présents statuts peuvent être modifiés. Cependant, toute modification doit être soumise par la Coordination et approuvée par l'Assemblée Générale." },
      { n: 33, title: 'Dissolution', body: "L'Association est dissoute pour les causes communes applicables à toutes les associations en République de Guinée." },
    ],
  },
  {
    id: 'part5',
    roman: 'V',
    title: 'Dispositions Diverses',
    articles: [
      { n: 34, title: 'Litiges', body: "Tout différend entre L.C.D et les tiers est traité à l'amiable. En cas d'échec de cette démarche, le litige sera porté devant les juridictions compétentes." },
      { n: 35, title: "Modalité d'application des statuts", body: "Un règlement intérieur précise les modalités pratiques d'application des présents statuts." },
    ],
  },
];

export default function StatutsPage() {
  const [activeId, setActiveId] = useState('part1');
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id); });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    PARTS.forEach(p => {
      const el = document.getElementById(p.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTocOpen(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --gold: #C8A84B; --gold-l: #F0DFA0;
          --navy: #0F2044; --navy-m: #1A3160;
          --green: #1B5E37;
          --cream: #FAF8F3; --ink: #1E2B3C;
          --muted: #64748B; --rule: rgba(200,168,75,0.25);
        }
        html { scroll-behavior: smooth; }
        .doc-root { font-family: 'DM Sans', sans-serif; background: var(--cream); min-height: 100svh; color: var(--ink); }

        /* HEADER */
        .doc-header { position: sticky; top: 0; z-index: 100; background: var(--navy); border-bottom: 2px solid var(--gold); padding: 0 1.5rem; height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .doc-header-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .doc-header-logo { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; border: 2px solid var(--gold); overflow: hidden; background: white; position: relative; }
        .doc-header-title { font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; font-weight: 700; color: white; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .doc-header-sub { font-size: 0.65rem; font-weight: 500; color: var(--gold-l); letter-spacing: .08em; text-transform: uppercase; margin-top: 1px; }
        .doc-badge { display: inline-flex; align-items: center; gap: 5px; background: rgba(200,168,75,.15); border: 1px solid rgba(200,168,75,.4); color: var(--gold-l); font-size: .68rem; font-weight: 700; padding: .3rem .7rem; border-radius: 99px; white-space: nowrap; flex-shrink: 0; letter-spacing: .04em; }
        .doc-back { display: inline-flex; align-items: center; gap: 6px; color: var(--gold-l); font-size: .8rem; font-weight: 600; text-decoration: none; flex-shrink: 0; transition: color .15s; }
        .doc-back:hover { color: white; }

        /* LAYOUT */
        .doc-layout { display: grid; grid-template-columns: 260px 1fr; max-width: 1100px; margin: 0 auto; min-height: calc(100svh - 64px); }
        @media (max-width: 768px) { .doc-layout { grid-template-columns: 1fr; } .doc-toc-desktop { display: none !important; } }

        /* TOC SIDEBAR */
        .doc-toc-desktop { position: sticky; top: 64px; height: calc(100svh - 64px); overflow-y: auto; padding: 1.5rem 0; border-right: 1px solid var(--rule); scrollbar-width: none; }
        .doc-toc-desktop::-webkit-scrollbar { display: none; }
        .doc-toc-header { padding: 0 1.25rem 1rem; font-size: .65rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--rule); margin-bottom: .75rem; }
        .doc-toc-item { display: flex; align-items: center; gap: 10px; padding: .55rem 1.25rem; cursor: pointer; transition: background .15s; border: none; background: none; width: 100%; text-align: left; font-family: 'DM Sans', sans-serif; }
        .doc-toc-item:hover { background: rgba(200,168,75,.06); }
        .doc-toc-item.active { background: rgba(200,168,75,.1); }
        .doc-toc-roman { width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: .85rem; font-weight: 700; background: var(--navy); color: var(--gold); transition: background .15s; }
        .doc-toc-item.active .doc-toc-roman { background: var(--gold); color: var(--navy); }
        .doc-toc-label { font-size: .78rem; font-weight: 500; color: var(--muted); line-height: 1.35; transition: color .15s; }
        .doc-toc-item.active .doc-toc-label { color: var(--ink); font-weight: 600; }

        /* CONTENT */
        .doc-content { padding: 3rem 2.5rem 5rem; }
        @media (max-width: 768px) { .doc-content { padding: 2rem 1.25rem 4rem; } }

        /* COVER */
        .doc-cover { text-align: center; padding-bottom: 3rem; margin-bottom: 3rem; border-bottom: 1px solid var(--rule); }
        .doc-cover-emblem { width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 1.5rem; border: 3px solid var(--gold); overflow: hidden; background: white; box-shadow: 0 8px 32px rgba(200,168,75,.2); position: relative; }
        .doc-cover-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; color: var(--navy); letter-spacing: -.01em; margin-bottom: .5rem; }
        .doc-cover-title span { color: var(--green); }
        .doc-cover-sub { font-size: .85rem; color: var(--muted); max-width: 380px; margin: 0 auto .75rem; line-height: 1.5; }
        .doc-cover-meta { display: inline-flex; align-items: center; gap: 8px; background: var(--navy); color: var(--gold-l); padding: .4rem 1rem; border-radius: 99px; font-size: .72rem; font-weight: 600; letter-spacing: .06em; }
        .doc-cover-devise { margin-top: 1.25rem; font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; font-style: italic; color: var(--gold); letter-spacing: .06em; }

        /* PREAMBLE */
        .doc-preamble { background: linear-gradient(135deg, rgba(15,32,68,.04), rgba(27,94,55,.04)); border-left: 3px solid var(--green); border-radius: 0 12px 12px 0; padding: 1.25rem 1.5rem; margin-bottom: 3rem; }
        .doc-preamble-title { font-size: .65rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--green); margin-bottom: .75rem; }
        .doc-preamble-text { font-size: .875rem; color: var(--muted); line-height: 1.7; font-style: italic; }

        /* PARTS */
        .doc-part { margin-bottom: 3.5rem; scroll-margin-top: 84px; }
        .doc-part-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.75rem; padding-bottom: 1rem; border-bottom: 2px solid var(--rule); }
        .doc-part-roman { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--navy); color: var(--gold); font-family: 'Cormorant Garamond', serif; font-size: 1.15rem; font-weight: 700; box-shadow: 0 4px 12px rgba(15,32,68,.15); }
        .doc-part-eyebrow { font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--gold); margin-bottom: 3px; }
        .doc-part-title { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; font-weight: 700; color: var(--navy); line-height: 1.3; }

        /* ARTICLES */
        .doc-article { margin-bottom: 1.5rem; padding: 1.25rem 1.5rem; background: white; border-radius: 14px; border: 1px solid rgba(200,168,75,.12); box-shadow: 0 1px 6px rgba(0,0,0,.04); transition: border-color .2s, box-shadow .2s; }
        .doc-article:hover { border-color: rgba(200,168,75,.3); box-shadow: 0 4px 16px rgba(0,0,0,.06); }
        .doc-article-header { display: flex; align-items: center; gap: 10px; margin-bottom: .75rem; }
        .doc-article-num { font-size: .65rem; font-weight: 700; letter-spacing: .08em; color: var(--gold); background: rgba(200,168,75,.1); border: 1px solid rgba(200,168,75,.3); padding: .2rem .55rem; border-radius: 99px; flex-shrink: 0; }
        .doc-article-title { font-family: 'Cormorant Garamond', serif; font-size: 1.05rem; font-weight: 600; color: var(--navy); }
        .doc-article-body { font-size: .875rem; color: #374151; line-height: 1.75; white-space: pre-line; }

        /* MOBILE TOC */
        .doc-toc-mobile-bar { display: none; position: sticky; top: 64px; z-index: 90; background: white; border-bottom: 1px solid var(--rule); padding: .75rem 1.25rem; }
        @media (max-width: 768px) { .doc-toc-mobile-bar { display: block; } }
        .doc-toc-toggle { display: flex; align-items: center; gap: 8px; background: none; border: 1px solid var(--rule); border-radius: 10px; padding: .5rem .9rem; font-family: 'DM Sans', sans-serif; font-size: .8rem; font-weight: 600; color: var(--ink); cursor: pointer; width: 100%; }
        .doc-toc-mobile-panel { background: white; border-bottom: 1px solid var(--rule); overflow: hidden; transition: max-height .3s ease; }
        .doc-toc-mobile-panel.closed { max-height: 0; }
        .doc-toc-mobile-panel.open { max-height: 400px; overflow-y: auto; }

        /* FOOTER */
        .doc-footer { max-width: 1100px; margin: 0 auto; padding: 2rem 2.5rem; border-top: 1px solid var(--rule); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        .doc-footer-info { font-size: .75rem; color: var(--muted); }
        .doc-footer-back { display: inline-flex; align-items: center; gap: 6px; background: var(--navy); color: var(--gold-l); padding: .55rem 1.1rem; border-radius: 10px; font-size: .8rem; font-weight: 600; text-decoration: none; transition: background .15s; }
        .doc-footer-back:hover { background: var(--navy-m); }

        @media print { body { display: none !important; } }
      `}</style>

      <div className="doc-root" onContextMenu={e => e.preventDefault()}>

        {/* ── HEADER ── */}
        <header className="doc-header">
          <div className="doc-header-left">
            <div className="doc-header-logo">
              <Image src="/assets/images/logolcd.jpg" alt="LCD" fill style={{ objectFit: 'cover' }} unoptimized />
            </div>
            <div>
              <div className="doc-header-title">STATUTS LCD</div>
              <div className="doc-header-sub">Lelouma Communauté pour le Développement</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <span className="doc-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Lecture seule
            </span>
            <Link href="/login" className="doc-back">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Retour
            </Link>
          </div>
        </header>

        {/* Mobile TOC */}
        <div className="doc-toc-mobile-bar">
          <button className="doc-toc-toggle" onClick={() => setTocOpen(v => !v)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18h12M9 12h12M9 6h12M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
            Table des matières
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ marginLeft: 'auto', transform: tocOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`doc-toc-mobile-panel ${tocOpen ? 'open' : 'closed'}`}>
            {PARTS.map(p => (
              <button key={p.id} className={`doc-toc-item ${activeId === p.id ? 'active' : ''}`} onClick={() => scrollTo(p.id)}>
                <span className="doc-toc-roman">{p.roman}</span>
                <span className="doc-toc-label">{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── LAYOUT ── */}
        <div className="doc-layout">
          <aside className="doc-toc-desktop">
            <div className="doc-toc-header">Table des matières</div>
            {PARTS.map(p => (
              <button key={p.id} className={`doc-toc-item ${activeId === p.id ? 'active' : ''}`} onClick={() => scrollTo(p.id)}>
                <span className="doc-toc-roman">{p.roman}</span>
                <span className="doc-toc-label">{p.title}</span>
              </button>
            ))}
          </aside>

          <main className="doc-content" ref={contentRef}>

            {/* Cover */}
            <div className="doc-cover">
              <div className="doc-cover-emblem">
                <Image src="/assets/images/logolcd.jpg" alt="LCD" fill style={{ objectFit: 'cover' }} unoptimized />
              </div>
              <h1 className="doc-cover-title">
                {'Statuts '}
                <span>LCD</span>
              </h1>
              <p className="doc-cover-sub">
                Document officiel de LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT (LCD)
              </p>
              <span className="doc-cover-meta">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                17 JUIN 2025
              </span>
              {/* ✅ FIX : devise sans apostrophe dans le JSX */}
              <div className="doc-cover-devise">
                {'\u00ab Union \u2014 Travail \u2014 Progr\u00e8s \u00bb'}
              </div>
            </div>

            {/* Préambule — ✅ FIX : texte via constante JS, pas de JSX direct */}
            <div className="doc-preamble">
              <div className="doc-preamble-title">Préambule</div>
              <p className="doc-preamble-text">
                {PREAMBLE_TEXT}
                {' '}
                <strong style={{ color: '#1B5E37' }}>{PREAMBLE_CONCLUSION}</strong>
              </p>
            </div>

            {/* Parts & Articles */}
            {PARTS.map(part => (
              <section key={part.id} id={part.id} className="doc-part">
                <div className="doc-part-header">
                  <div className="doc-part-roman">{part.roman}</div>
                  <div>
                    <div className="doc-part-eyebrow">Partie {part.roman}</div>
                    <div className="doc-part-title">{part.title}</div>
                  </div>
                </div>
                {part.articles.map(art => (
                  <div key={art.n} className="doc-article">
                    <div className="doc-article-header">
                      <span className="doc-article-num">ART. {art.n}</span>
                      <h3 className="doc-article-title">{art.title}</h3>
                    </div>
                    <p className="doc-article-body">{art.body}</p>
                  </div>
                ))}
              </section>
            ))}
          </main>
        </div>

        {/* Footer */}
        <footer className="doc-footer">
          <div className="doc-footer-info">
            &copy; 2025 LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT &mdash; Document en lecture seule
          </div>
          <Link href="/login" className="doc-footer-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Retour à la connexion
          </Link>
        </footer>
      </div>
    </>
  );
}
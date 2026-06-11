// web/app/documents/reglement/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const PARTS = [
  {
    id: 'intro',
    roman: '—',
    title: 'Introduction',
    articles: [
      { n: 0, title: 'Introduction', body: "Le présent règlement intérieur, élaboré conformément aux statuts de LCD, constitue le cadre de fonctionnement administratif de l'Association." },
    ],
  },
  {
    id: 'part1',
    roman: 'I',
    title: 'Droits et obligations des membres',
    articles: [
      { n: 1, title: 'Obligations générales', body: "Les membres de l'association sont tenus de remplir fidèlement leurs obligations découlant des statuts et du règlement intérieur et de ne commettre aucun acte pouvant porter atteinte à la moralité et au bon fonctionnement de l'association." },
      { n: 2, title: 'Qualité de membre adhérent', body: "Est membre de l'association celui ou celle qui s'acquitte de ses droits de cotisations et de la carte membre. La carte membre devra être dématérialisée et aura une durée de validité d'un an renouvelable. Elle sera donc automatiquement éditée après cotisation du membre." },
      { n: 3, title: 'Non-paiement de cotisation', body: "En cas de non-paiement de sa cotisation, le membre devra régulariser sa situation dans un délai de 3 mois après notification du Trésorier. Passé ce délai, le membre sera considéré comme démissionnaire, par conséquent suspendu de l'association." },
    ],
  },
  {
    id: 'part2',
    roman: 'II',
    title: 'Organisation et fonctionnement',
    articles: [
      // ✅ FIX : guillemets doubles pour éviter la collision avec l'apostrophe
      { n: 4, title: "Organes de l'association", body: "Les organes de l'Association sont : l'Assemblée Générale, le Comité Directeur « Bureau », les Commissions techniques et le Conseil des sages et les antennes locales et internationales." },
      { n: 5, title: 'Composition du bureau', body: "Le bureau est composé de : un Président et un Vice-Président ; un Secrétaire Général et un Adjoint ; un Trésorier Général et un Adjoint ; un Commissaire aux Comptes et un Adjoint ; un Secrétaire Chargé de l'Organisation et un adjoint ; un Secrétaire Chargé de la Communication et un adjoint ; un secrétaire chargé des programmes et projets et un adjoint ; un Président des commissions." },
      { n: 6, title: 'Mandat et élections', body: "Les membres du Bureau sont élus pour un mandat de trois (3) ans, renouvelable une fois. L'élection se fait à bulletin secret, à la majorité simple des membres présents à jour de leurs obligations. Tout membre souhaitant se présenter doit être membre actif depuis au moins un an. Le Conseil des sages est un organe consultatif composé de membres fondateurs ou anciens membres du bureau, chargé de jouer un rôle de médiation et de conseil, notamment en cas de conflits internes." },
      { n: 7, title: 'Sanctions disciplinaires', body: "Toute sanction disciplinaire est précédée d'un avertissement écrit. En cas de litige, une médiation est proposée avec le Conseil des sages avant toute radiation définitive." },
      { n: 8, title: 'Fonctionnement des commissions', body: "Chaque Commission est responsable de son fonctionnement et de son organisation interne." },
      { n: 9, title: 'Rôle des commissions', body: "Le bureau s'appuie sur les commissions pour exécuter son programme." },
    ],
  },
  {
    id: 'part3',
    roman: 'III',
    title: 'Gestion financière',
    articles: [
      { n: 10, title: 'Contrôle financier', body: "Le contrôle de la gestion financière se fait 2 fois par an. La trésorerie met à disposition du Président les rapports financiers. Le commissariat aux comptes analysent et valident le rapport financier qui est adressé au Président. Le Président s'appuie sur le rapport des commissaires aux comptes pour élaborer sa présentation annuelle. En cas de litige, l'Assemblée Générale peut désigner un auditeur externe." },
      { n: 11, title: 'Exercice budgétaire', body: "L'exercice budgétaire de l'Association va du 1er janvier au 31 décembre." },
    ],
  },
  {
    id: 'part4',
    roman: 'IV',
    title: 'Réunions, décisions et votes',
    articles: [
      { n: 12, title: 'Réunions du bureau', body: "Le bureau tient au moins quatre (4) réunions par an, dont : une réunion en vue de la préparation du rapport annuel (administratif et financier) ; trois réunions ordinaires. En cas de nécessité, le bureau peut se réunir en séance extraordinaire." },
      { n: 13, title: 'Assemblée Générale', body: "L'Assemblée Générale comprend tous les membres en règles de l'Association. Elle se réunit en session ordinaire 2 fois par an sur convocation du Président de l'Association, et en session extraordinaire à la demande des deux tiers (2/3) de ses membres. Les décisions de l'Assemblée Générale sont prises à la majorité (moitié plus un) des voix, des membres présents. En cas d'égalité des voix, celle du Président est prépondérante. La présence de la moitié des membres est nécessaire pour la tenue de l'Assemblée Générale." },
      { n: 14, title: 'Convocations', body: "Les convocations sont adressées aux membres au moins quinze (15) jours avant la date des réunions." },
      { n: 15, title: 'Modalités de vote', body: "Les votes se font par scrutin secret et uniquement par les membres à jour de toutes obligations. Le vote par procuration est admis. Le membre présent ne peut être porteur que d'une seule procuration. Les points faisant l'objet de controverse sont réglés : 1. Par consensus. 2. Par vote à la majorité absolue. 3. Par vote à la majorité simple. 4. En cas de partage des voix, celle du Président est prépondérante. On peut s'appuyer sur les nouvelles technologies en cas de besoins pour l'organisation des votes." },
      { n: 16, title: 'Commission électorale', body: "Les votes sont organisés par une Commission électorale indépendante et assermentée, constituée d'un nombre impair de membres, d'au moins cinq (5) membres et ne pouvant excéder neuf (9) membres. La Commission électorale doit être créée au moins quatre (4) semaines avant le premier jour du dépôt des candidatures.\n\nChronogramme des Élections :\n\u2022 1er au 10 mars : Dépôt des candidatures\n\u2022 7 au 14 mars : Examen des candidatures\n\u2022 15 mars : Publication de la liste officielle des candidats\n\u2022 16 au 27 mars : Campagne électorale\n\u2022 28 mars : Scrutin électoral\n\u2022 29 et 30 mars : Dépôt des griefs et contentieux électoraux\n\u2022 31 mars : Clôture des contentieux, proclamation des résultats définitifs" },
    ],
  },
  {
    id: 'part5',
    roman: 'V',
    title: 'Dispositions suspensives',
    articles: [
      { n: 17, title: 'Règles de vie associative', body: "a. Les canaux de communication en vigueur approuvés par le bureau sont les seuls outils de communication officiels.\n\nb. Le président peut convoquer des réunions présentielles et locales si besoin, sans la présence des membres de la diaspora ou alors en combinant les deux (présentielles et distancielles).\n\nc. Les vocaux ne doivent pas dépasser les deux minutes afin de permettre à tous de suivre les conversations.\n\nd. Seuls les membres adhérents peuvent être introduits dans le groupe WhatsApp.\n\ne. Les injures, menaces, les termes déplacés et discriminatoires sont formellement interdits. Quiconque s'y adonnera se verra sanctionné voire définitivement révoqué de l'association.\n\nf. Les annonces officielles de faits divers ou affaires sociales doivent passer par l'équipe de communication de LCD.\n\ng. Le canal LELOU INFOS est mis en place pour les informations générales (faits divers, informations socio-politiques, affaires sociales).\n\nh. Il est interdit d'utiliser le logo et la dénomination de l'association à des fins autres que celles de l'association ou personnelles, sans autorisation du bureau.\n\ni. Le bureau étant souverain, aucun membre n'est autorisé à imposer quoi que ce soit aux autres membres.\n\nj. Tous les membres sont tenus d'assister aux assemblées générales obligatoires, sauf cas de forces majeures justifiés.\n\nk. Le présent Règlement Intérieur, adopté par l'Assemblée Générale, entre en vigueur immédiatement. Il ne peut être amendé que par ladite Assemblée." },
    ],
  },
];

const DEFINITIONS = [
  { term: 'Membre adhérent', def: "Toute personne ayant rempli le formulaire d'adhésion et s'étant acquittée de sa cotisation." },
  { term: 'Commission', def: "Groupe de travail thématique mis en place par le Bureau." },
  { term: 'Antenne', def: "Représentation locale ou internationale de l'association." },
];

export default function ReglementPage() {
  const [activeId, setActiveId] = useState('intro');
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
        .doc-header { position: sticky; top: 0; z-index: 100; background: var(--green); border-bottom: 2px solid var(--gold); padding: 0 1.5rem; height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
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
        .doc-toc-roman { width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: .85rem; font-weight: 700; background: var(--green); color: var(--gold); transition: background .15s; }
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
        .doc-cover-meta { display: inline-flex; align-items: center; gap: 8px; background: var(--green); color: var(--gold-l); padding: .4rem 1rem; border-radius: 99px; font-size: .72rem; font-weight: 600; letter-spacing: .06em; }

        /* PARTS */
        .doc-part { margin-bottom: 3.5rem; scroll-margin-top: 84px; }
        .doc-part-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.75rem; padding-bottom: 1rem; border-bottom: 2px solid var(--rule); }
        .doc-part-roman { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--green); color: var(--gold); font-family: 'Cormorant Garamond', serif; font-size: 1.15rem; font-weight: 700; box-shadow: 0 4px 12px rgba(27,94,55,.2); }
        .doc-part-eyebrow { font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--gold); margin-bottom: 3px; }
        .doc-part-title { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; font-weight: 700; color: var(--navy); line-height: 1.3; }

        /* ARTICLES */
        .doc-article { margin-bottom: 1.5rem; padding: 1.25rem 1.5rem; background: white; border-radius: 14px; border: 1px solid rgba(200,168,75,.12); box-shadow: 0 1px 6px rgba(0,0,0,.04); transition: border-color .2s, box-shadow .2s; }
        .doc-article:hover { border-color: rgba(200,168,75,.3); box-shadow: 0 4px 16px rgba(0,0,0,.06); }
        .doc-article-header { display: flex; align-items: center; gap: 10px; margin-bottom: .75rem; }
        .doc-article-num { font-size: .65rem; font-weight: 700; letter-spacing: .08em; color: var(--green); background: rgba(27,94,55,.08); border: 1px solid rgba(27,94,55,.2); padding: .2rem .55rem; border-radius: 99px; flex-shrink: 0; }
        .doc-article-title { font-family: 'Cormorant Garamond', serif; font-size: 1.05rem; font-weight: 600; color: var(--navy); }
        .doc-article-body { font-size: .875rem; color: #374151; line-height: 1.75; white-space: pre-line; }

        /* DEFINITIONS */
        .doc-definitions { background: white; border-radius: 16px; border: 1px solid var(--rule); padding: 1.5rem; margin-top: 2rem; }
        .doc-def-title { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; font-weight: 700; color: var(--navy); margin-bottom: 1rem; padding-bottom: .75rem; border-bottom: 1px solid var(--rule); }
        .doc-def-item { display: flex; gap: 1rem; padding: .75rem 0; border-bottom: 1px solid rgba(200,168,75,.08); }
        .doc-def-item:last-child { border: none; }
        .doc-def-term { font-weight: 700; font-size: .85rem; color: var(--green); min-width: 150px; flex-shrink: 0; }
        .doc-def-desc { font-size: .85rem; color: #374151; line-height: 1.6; }

        /* LEGAL */
        .doc-legal { margin-top: 2rem; background: rgba(15,32,68,.04); border-radius: 12px; padding: 1.25rem 1.5rem; }
        .doc-legal-title { font-size: .65rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: .75rem; }
        .doc-legal-text { font-size: .8rem; color: var(--muted); line-height: 1.7; }

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
        .doc-footer-back { display: inline-flex; align-items: center; gap: 6px; background: var(--green); color: var(--gold-l); padding: .55rem 1.1rem; border-radius: 10px; font-size: .8rem; font-weight: 600; text-decoration: none; transition: background .15s; }
        .doc-footer-back:hover { background: #155230; }

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
              <div className="doc-header-title">RÈGLEMENT INTÉRIEUR LCD</div>
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
                {'Règlement '}
                <span>Intérieur</span>
              </h1>
              <p className="doc-cover-sub">
                Document officiel de LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT (LCD)
              </p>
              <span className="doc-cover-meta">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Document officiel — LCD
              </span>
            </div>

            {/* Parts */}
            {PARTS.map(part => (
              <section key={part.id} id={part.id} className="doc-part">
                <div className="doc-part-header">
                  <div className="doc-part-roman">{part.roman}</div>
                  <div>
                    {part.roman !== '—' && (
                      <div className="doc-part-eyebrow">Partie {part.roman}</div>
                    )}
                    <div className="doc-part-title">{part.title}</div>
                  </div>
                </div>
                {part.articles.map(art => (
                  <div key={art.n} className="doc-article">
                    <div className="doc-article-header">
                      {art.n > 0 && <span className="doc-article-num">ART. {art.n}</span>}
                      <h3 className="doc-article-title">{art.title}</h3>
                    </div>
                    <p className="doc-article-body">{art.body}</p>
                  </div>
                ))}
              </section>
            ))}

            {/* Mentions légales */}
            <div className="doc-legal">
              <div className="doc-legal-title">Mentions légales</div>
              <p className="doc-legal-text">
                Le siège social de l&apos;association est situé à LELOUMA.<br />
                L&apos;association est déclarée sous le numéro : [Numéro à compléter].
              </p>
            </div>

            {/* Définitions */}
            <div className="doc-definitions">
              <div className="doc-def-title">Définitions</div>
              {DEFINITIONS.map(d => (
                <div key={d.term} className="doc-def-item">
                  <span className="doc-def-term">{d.term}</span>
                  <span className="doc-def-desc">{d.def}</span>
                </div>
              ))}
            </div>
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
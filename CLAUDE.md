# CLAUDE.md — Assograndchef (LCD / Lelouma Community)

Plateforme SaaS **multi-tenant** de gestion d'associations (diaspora) : membres, cotisations, dépenses, projets, événements, élections, virements entre antennes, communications email/SMS/push. **Application en PRODUCTION** (3 associations clientes actives) : toute modification doit être prudente, rétro-compatible et testée avant livraison.

## Façon de travailler (règles du propriétaire)

- Répondre en **français**, en **tutoyant**.
- Livrer des **fichiers complets** (jamais de diff ni de snippet à recoller). Pour une correction : n'envoyer **que** les fichiers touchés. Au-delà de **5 fichiers** : envoyer un **zip**.
- **Ne jamais commiter ni pousser** (`git commit` / `git push`) : le propriétaire s'en charge. Ne pas le rappeler à chaque réponse.
- Nouvelles fonctionnalités : de préférence dans des **fichiers neufs et isolés** (backend et frontend) plutôt qu'en modifiant l'existant, pour ne pas casser la prod.
- Corriger la **cause racine** plutôt que poser un rustine minimale ; penser à la montée en charge.
- Les paramètres métier doivent être **configurables dynamiquement**, pas codés en dur.
- Chaque fichier modifié garde son **en-tête de version** (`// v1.4 — 🔥 CORRIGÉ …`) : y ajouter une entrée expliquant le pourquoi du changement.
- Back-office web (admin / super-admin / system-admin) : **jamais de `<table>`** ; uniquement des **cartes ombrées**, design moderne et soigné, bonne UX (mobile inclus).
- Le Grand Chef (Thierno Doniko) doit être crédité comme développeur dans les métadonnées/attribution de chaque site client.
- Environnement de dev du propriétaire : Windows + Git Bash. Il vérifie via Prisma Studio et les DevTools du navigateur ; il envoie souvent des captures d'écran plutôt que des logs.

## Structure (monorepo pnpm)

```
backend/   NestJS 10 + Prisma 5.22 + PostgreSQL        (package @lcd/backend, port 3001)
web/       Next.js 16 (App Router) + React 19           (package @lcd/web, port 3000)
```

Commandes (depuis la racine) : `pnpm backend` · `pnpm web` · `pnpm build` · `pnpm lint:web`.
Backend (dans `backend/`) : `pnpm prisma:generate` · `pnpm prisma:migrate:dev` · `pnpm prisma:migrate:deploy` · `pnpm prisma:studio`.
Gestionnaire de paquets : **pnpm uniquement** (`pnpm-lock.yaml` fait foi).

## Backend (`backend/src`)

- Préfixe global **`/api`** ; fichiers uploadés servis sur **`/static`** ; Swagger sur `/docs` (`SWAGGER_PATH`).
- `modules/<domaine>/` : un module Nest par domaine (controller + service + dto). `common/` : guards, décorateurs, utilitaires. `domain-provisioning/` : domaines personnalisés (Cloudflare + Vercel).
- **Rôles** (enum Prisma `UserRole`) : `SYSTEM_ADMIN` (le Grand Chef, plateforme) › `SUPER_ADMIN` (président d'une association) › `ANTENNA_ADMIN` (responsable d'antenne) › `MEMBER`.
- **Autorisation** : `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` sur chaque controller/route. `@Permissions()` / `PermissionsGuard` existent mais **ne sont utilisés nulle part**. Les droits d'affectation d'un admin d'antenne (`AntennaAdminAssignment.canValidateMembers/canValidateContributions/canManageProjects/canManageContent`) sont appliqués par `AdminService.assertAssignmentFlag()` (routes `/admin/*`) et dans `contributions.service.ts`. Le périmètre d'antenne d'un admin vient de ses **affectations** (`getAdminContext()` / `EventsService.getAdminAntennaIds()`), jamais de son adhésion `Membership` (les admins créés par le super admin n'en ont pas).
- **Cloisonnement multi-tenant** : toute requête métier doit filtrer par `associationId` (issu du JWT). Pour un `ANTENNA_ADMIN`, filtrer aussi par antennes via `AdminService.getAdminContext()` → `{ antennaIds, associationId }` (`antennaIds === undefined` = pas de filtre antenne, cas du super admin). Toujours faire `findFirst({ where: { id, associationId } })` **avant** un `update`/`delete` par id.
- **Auth** : JWT **Bearer** (header `Authorization`, pas de lecture du cookie côté API) ; access token 15 min par défaut, refresh 30 j (`/auth/refresh`). `JwtStrategy.validate()` relit l'utilisateur en base (cache mémoire 15 s) : compte non `ACTIVE`/supprimé ⇒ 401, rôle et association = valeurs de la base (coupe-circuit `JWT_VERIFY_USER=false`). Verrouillage de domaine au login via l'en-tête `Origin` (`x-tenant-domain` en secours).
- **Argent** : colonnes `Decimal(14,2)` ; ne jamais calculer en `Number` flottant pour persister. Une cotisation / dépense validée doit créer sa `LedgerEntry` **dans la même transaction** (`$transaction`). Le solde = somme **signée** du ledger (`LedgerService.getBalances`, `*_IN` positifs, `*_OUT` négatifs).
- **Stockage fichiers** : `STORAGE_DRIVER` = `local` | `s3` | `cloudinary` (`uploads/`). `file-assets/` et l'avatar d'inscription passent **toujours par Cloudinary**.
- **Jobs planifiés** : `@Cron` dans `modules/scheduler` (process long, ex. Render) **et** routes `GET /jobs/run-scheduled` (`JOBS_SECRET`) / `GET /domain-provisioning/check` (`CRON_SECRET`) pour un cron externe. Ne pas activer les deux pour les mêmes jobs.
- **CORS** dynamique dans `main.ts` : liste `CORS_ORIGINS`/`FRONTEND_URL` + domaines clients lus en base (cache 60 s).
- Migrations Prisma : dossier `prisma/migrations/` (historique actuel, depuis 25/07/2026). `prisma/migrations_ancien_historique_client/` est l'ancien historique du compte client, **non utilisé** par Prisma.
- Données : `prisma/seeds/seed.ts` crée le SYSTEM_ADMIN **uniquement s'il n'existe pas** (un compte existant n'est jamais modifié) ; `SEED_ADMIN_PASSWORD` (12 caractères min.) est obligatoire pour la création. Reste à éviter sur la prod par principe.

## Frontend (`web`)

- Routes : `app/(public)` (signup, vérification email/carte, pages légales), `app/(protected)/{system-admin,super-admin,admin,member}` (un dossier par rôle), `login`, `forgot-password`, `reset-password`.
- `middleware.ts` : redirection par rôle d'après le **payload du JWT décodé sans vérification de signature** (confort de navigation uniquement ; la sécurité réelle est côté API).
- Appels API : objet `api` dans `lib/api-client.ts` (+ `communications-api-client.ts`, `project-proposals-admin-client.ts`, `super-admin-api.ts`), via `lib/http.ts` (ajout du Bearer, refresh auto sur 401). Tokens dans `localStorage` (`assoc_auth_v1`) + cookie `accessToken` (lu par le middleware). Toute nouvelle route d'API appelée par le front doit **exister dans le backend** : vérifier le chemin ET la méthode HTTP.
- Layout : `components/layout/AppShell` (Sidebar + Topbar + MobileNav). Les liens de navigation se déclarent dans `Sidebar.tsx` **et** `MobileNav.tsx`.
- Style : styles inline avec objets de design par écran (`C` couleurs, `F` polices) + classes CSS dans `app/globals.css` (préfixes `aa-`, `sm-`, `md-`…). **Tailwind n'est pas installé** : les classes utilitaires (`flex`, `p-4`, `bg-gray-50`, `sr-only`…) n'ont aucun effet — n'en écris jamais dans un nouvel écran.
- i18n : `lib/i18n.ts` (fr, en, pt, es, ff, ar ; repli `fr`). Une grande partie de l'UI est en français en dur.
- `next.config.ts` : proxy `/static/*` vers le backend (`BACKEND_URL`).

## Variables d'environnement

Backend **obligatoires** : `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`.
Backend usuelles : `TRUST_PROXY_HOPS` (nb de proxys devant l'API, défaut 1 ; sert à `req.ip` pour le rate-limit), `SEED_ADMIN_PASSWORD` (seed uniquement), `FRONTEND_URL`, `CORS_ORIGINS`, `CORS_ALLOW_VERCEL_APP` (false = refuse les `*.vercel.app` non listés), `JWT_VERIFY_USER` (false = coupe-circuit de la relecture utilisateur du JWT), `PORT`, `STORAGE_DRIVER`, `CLOUDINARY_*`, `SMTP_*` + `MAIL_FROM`, `TWILIO_*`, `VAPID_*`, `CRON_SECRET`, `JOBS_SECRET`, `JOBS_ENABLED`, `SCHEDULER_ENABLED`, `SWAGGER_ENABLED`, `CLOUDFLARE_*`, `VERCEL_API_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID`, `THROTTLE_TTL`/`THROTTLE_LIMIT`.
Web : `NEXT_PUBLIC_API_URL` (finit par `/api`), `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_VAPID_KEY`, `BACKEND_URL`.
Jamais de secret dans le code ni dans Git (`.env*` est ignoré).

## Pièges connus (voir le rapport d'audit du 11/10/2026)

- `package-lock.json` à la racine est un **résidu obsolète** (NestJS 11 / Prisma 7) : ne pas faire `npm install`.
- Les scripts backend `test`, `lint` et `format` ne fonctionnent pas (jest, eslint, prettier absents des dépendances).
- Types Prisma : lancer `pnpm --filter @lcd/backend prisma:generate` avant tout `tsc`.
- Avant d'ajouter un endpoint de validation/rejet financier : **vérifier le statut courant** de l'objet et réserver la transition de façon atomique (`updateMany` conditionné au statut, dans la même `$transaction` que le ledger). Règles en place pour les cotisations : `VALIDATED` et `CANCELLED` ne se valident pas (409) ; `REJECTED` reste re-validable ; rejeter une `VALIDATED` supprime son écriture de ledger dans la même transaction.
- Secrets des crons (`JOBS_SECRET`, `CRON_SECRET`) : toujours via `isValidBearerSecret()` (`common/utils/bearer-secret.util.ts`) ; secret absent ⇒ route fermée.
- Uploads : tout dossier/extension venant du client passe par `safe-storage-path.util.ts` (anti path traversal).
- `backend/.gitignore` ignore `/uploads/` (racine du backend uniquement) : ne pas remettre le motif non ancré `uploads/`, qui masquerait `src/modules/uploads/`.
- Changement de mot de passe : `PATCH /users/me/password` exige `currentPassword` + `password` ; une mauvaise valeur renvoie 400 (jamais 401, que le front traduit en déconnexion).
- Swagger : désactivé par défaut quand `NODE_ENV=production` (`SWAGGER_ENABLED` prioritaire).
- Annuler/supprimer une cotisation `VALIDATED` (`DELETE /admin/contributions/:id`) la passe en `CANCELLED` et retire son écriture de ledger ; on ne l'efface jamais.

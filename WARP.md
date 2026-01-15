# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

PolySeek is a Next.js (App Router) application for searching and managing VRChat-related products (avatars, outfits, gimmicks). It uses PostgreSQL via Prisma, NextAuth for authentication, Sentry for monitoring, and a custom Booth scraper pipeline to ingest and maintain product data.

Key technologies:
- Next.js 16 (App Router, `src/app`)
- TypeScript with strict settings (`tsconfig.json`)
- Prisma + PostgreSQL (`@prisma/client`, `prisma` CLI, `docker-compose.yml`)
- NextAuth (`src/middleware.ts`, `src/lib/auth.ts`, `@/auth`)
- Vitest for unit/component tests and Playwright for E2E tests
- Tailwind-based UI with shadcn-style primitives under `src/components/ui`
- Sentry integration via `@sentry/nextjs` and `next.config.ts`

Node version: `>=20` (see `package.json.engines`). The project is an ES module (`"type": "module"`).

## Running the app locally

Use `npm` by default; replace with `yarn`/`pnpm`/`bun` if you prefer.

### Install dependencies

- `npm install`

### Start the development server

- `npm run dev`
  - Runs Next.js dev server on port 3000.
  - Entry layout is `src/app/layout.tsx`; home page is `src/app/page.tsx` which renders `ClientHome` inside a `Suspense` boundary.

### Build and run in production mode

- Build: `npm run build`
- Start (after build): `npm run start`
  - By default the app will listen on port 3000 unless overridden with `-p` or `PORT`.

### Linting

- `npm run lint`
  - Uses Next.js/ESLint config defined in `package.json` and local config files.

## Database & environment

PostgreSQL is managed via `docker-compose.yml`.

Services:
- `db`: main application database on host port `5432`.
- `test-db`: test database on host port `5433` (used by Playwright E2E tests).

Environment variables are expected from `.env` (app) and `.env.test` (tests). At minimum you will need Postgres credentials:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` for `db`
- `TEST_POSTGRES_USER`, `TEST_POSTGRES_PASSWORD`, `TEST_POSTGRES_DB` for `test-db`
- `DATABASE_URL` for the app/Prisma (Playwright overrides this for tests)

Common DB-related commands:
- Start main DB only: `docker compose up -d db`
- Start test DB only: `docker compose --env-file .env.test up -d test-db` (also available as `npm run db:test:up`)

Prisma:
- Prisma client is initialized in `src/lib/prisma.ts` and reused via a global in non-production.
- `package.json` configures `"prisma.seed": "tsx prisma/seed.ts"`; run `npx prisma db seed` (with `DATABASE_URL` pointing at the correct DB) to seed.
- `npm run db:test:migrate` applies migrations to the test database using `.env.test`.

Sentry:
- `next.config.ts` wraps the app with `withSentryConfig` when `NEXT_PUBLIC_SENTRY_ENABLED` is not set to `"false"`.
- E2E scripts explicitly set `NEXT_PUBLIC_SENTRY_ENABLED=false` to avoid noisy reports during tests.

## Testing

### Unit and integration tests (Vitest)

Configuration:
- `vitest.config.ts` uses Vite with React + `vite-tsconfig-paths`.
- Tests live under:
  - `src/**/*.{test,spec}.(ts|tsx|js|jsx|...)`
  - `tests/**/*.{test,spec}.(ts|tsx|js|jsx|...)`
- Many domain and infrastructure tests are in:
  - `src/lib/__tests__` (e.g., `searchProducts.test.ts`, `rate-limit.test.ts`)
  - `src/lib/booth-scraper/*.test.ts`
  - `src/hooks/__tests__`

Commands:
- Run full test suite: `npm test`
- Run Vitest UI (interactive): `npm run test:ui`

Running a single test:
- By file: `npm test -- src/lib/__tests__/searchProducts.test.ts`
- By test name: `npm test -- -t "searchProducts filters by safe search"`

### End-to-end tests (Playwright)

Configuration:
- `playwright.config.ts` uses `testDir: ./e2e`.
- Uses a dedicated Postgres test DB on `localhost:5433` configured via `TEST_POSTGRES_*` env vars and exported as `DATABASE_URL` for the Playwright process.
- A test auth secret is injected into `AUTH_SECRET` and `NEXTAUTH_SECRET`.
- `webServer` in the config runs `npm run start -- -p 3001` and waits for `BASE_URL` (defaults to `http://localhost:3001`).

Scripts (from `package.json`):
- `npm run db:test:up`
  - `docker compose --env-file .env.test up -d test-db`
  - Starts the Postgres test container on port 5433 using `.env.test`.
- `npm run db:test:migrate`
  - `dotenv -e .env.test -- npx prisma migrate deploy`
  - Applies migrations to the test DB.
- `npm run test:e2e:run`
  - `cross-env NEXT_PUBLIC_SENTRY_ENABLED=false dotenv -e .env.test -- npx playwright test --trace on`
  - Assumes the app is already built and test DB is ready (migrated + seeded).
- `npm run test:e2e`
  - `cross-env NEXT_PUBLIC_SENTRY_ENABLED=false dotenv -e .env.test -- npm run build && npm run db:test:up && npm run db:test:migrate && dotenv -e .env.test -- npx prisma db seed && npm run test:e2e:run`
  - Full E2E pipeline: build app, start test DB, run migrations, seed DB, execute Playwright tests.

Running a subset of E2E tests:
- Use Playwright’s CLI filtering via `npm run test:e2e:run -- --grep "<pattern>"` to narrow which tests execute.

### Other scripts

From `package.json.scripts`:
- `npm run compare-queries` → `tsx src/scripts/compare-queries.ts`
  - Compares search queries / results implementations (see `src/scripts/compare-queries.ts`).

There are additional operational scripts in `src/scripts` (e.g., `booth-cron.ts`, `seed-target-tags.ts`, `debug-cron-state.ts`, `validate-queries.ts`) that interact with the scraper and search stack; when modifying domain logic, check for usage in these scripts.

## High-level architecture

### App Router structure (`src/app`)

- Global layout:
  - `src/app/layout.tsx` sets up Geist fonts, `SessionProvider` (NextAuth), theme support via `ThemeProvider`, cookie consent via `CookieConsentProvider` and `CookieBanner`, header/footer (`Header`, `Footer`), main layout (`MainLayout`), `AuthGuard`, toast notifications (`Toaster`), and optional GA via `AnalyticsLoader` when `NEXT_PUBLIC_GA_ID` is set.
  - SEO metadata uses `BASE_URL` from `src/lib/constants` and defines title templates and icons.
- Core pages include (non-exhaustive):
  - `/` → `src/app/page.tsx` (wraps `ClientHome` in `Suspense` with a `ProductGridSkeleton` fallback).
  - `/about`, `/faq`, `/terms`, `/privacy` informational pages.
  - `/search` with loading skeleton and search UI components under `src/components/search`.
  - `/products/[productId]` for product detail; includes a nested `layout.tsx`.
  - `/profile` and subroutes (likes, owned) using components in `src/components/profile`.
  - `/register-item` wizard with subcomponents under `src/app/register-item/components`.
  - `/admin` area with multiple admin subpages (users, reports, Booth scraper dashboard) backed by `src/components/admin` and API routes under `src/app/api/admin`.
  - `/guidelines` and related guideline content under `src/app/guidelines` and `src/components/guidelines`.
  - `/maintenance` page used when `MAINTENANCE_MODE=true`.
- Error handling:
  - `src/app/global-error.tsx` and `src/app/not-found.tsx` provide global error/404 handling.

### API layer (`src/app/api`)

Route handlers are colocated with routes under `src/app/api/.../route.ts` and use Prisma plus domain utilities from `src/lib`.

Key groups:
- Auth:
  - `src/app/api/auth/[...nextauth]/route.ts` → NextAuth handler.
  - `src/app/api/auth/agree/route.ts` → handles user agreement flow for terms/guidelines.
- User and profile data:
  - `src/app/api/profile/route.ts`, `src/app/api/session-info/route.ts`, and others related to current-user state.
- Products and items:
  - `src/app/api/products/...` (single product, listing, latest, etc.).
  - `src/app/api/items/create`, `src/app/api/items/update`, `src/app/api/items/route.ts` for create/update flows.
- Tagging and categories:
  - `src/app/api/tags/[tagId]`, `/tags/by-type`, `/tags/search`, and `src/app/api/categories/route.ts`.
  - Admin side endpoints under `src/app/api/admin/tag-types` and `src/app/api/admin/tags` manage tag categories and tags used both for search and Booth scraping.
  - Recent fixes in `README.md` highlight that tag-related logic must respect Prisma models: properties like `type`, `category`, and `color` live on `TagCategory` / related models rather than `Tag` itself. When changing tag APIs or models, check routes in `src/app/api/*tags*` and UI components like `src/components/admin/TagForm.tsx` and `src/components/guidelines/TagCategoryBadge.tsx` together.
- Admin and reports:
  - `src/app/api/admin/reports`, `/admin/users`, `/admin/scraper-config`, etc., power the admin dashboards.
  - Reporting endpoints under `src/app/api/reports` and UI under `src/components/reports` implement abuse/report flows.

When modifying API contracts, always trace through:
- The route handler under `src/app/api/.../route.ts`.
- Any domain helpers in `src/lib` (e.g., `searchProducts.ts`, `user-validation.ts`, `rate-limit.ts`).
- Corresponding UI components in `src/components/...`.
- Existing unit tests in `src/lib/__tests__` and integration/E2E tests in `e2e`.

### Authentication, authorization, and middleware

- `src/middleware.ts` wires NextAuth into edge middleware via `NextAuth(authConfig)`:
  - Enforces a maintenance mode: when `MAINTENANCE_MODE=true`, all routes except `/maintenance` redirect to `/maintenance`. When false, direct `/maintenance` redirects back to `/`.
  - Protects routes listed in `src/lib/routes.ts` (`protectedRoutes` currently include `/admin`, `/profile`, `/register-item`). Any request to those prefixes redirects unauthenticated users to `"/api/auth/signin?callbackUrl=..."`.
- `src/lib/auth.ts` exposes `isAdmin()` which:
  - Reads the current session via `auth()` from `@/auth`.
  - Checks `session.user.role` if present, otherwise looks up the user in Prisma and compares to `Role.ADMIN`.
  - This is used for server-side admin checks separate from UI-only gating.
- The `AuthGuard` component in `src/components/AuthGuard.tsx` (not shown here) wraps page content and likely coordinates with the middleware to provide client-side redirects/guards on protected routes.

If you change protected paths or auth behavior:
- Update `protectedRoutes` in `src/lib/routes.ts`.
- Update any corresponding usage in `src/middleware.ts`, `AuthGuard`, and admin/profile-related components.
- Ensure E2E tests for auth flows still pass, especially around maintenance mode and admin-only pages.

### Domain and service layer (`src/lib`)

The `src/lib` directory holds most non-UI domain logic and integrations.

Important modules and submodules:
- `src/lib/booth-scraper/*`:
  - Central orchestrator: `orchestrator.ts` exports a singleton `orchestrator` managing a queue of scraping tasks.
    - Uses `PQueue` with `concurrency: 1` and rate limiting (`TASK_WAIT_MS`, default 2000ms) to control request pacing.
    - Reads `BACKFILL_PRODUCT_LIMIT`, `TASK_WAIT_MS`, and `MAX_QUEUE_SIZE` from env to control batch sizes and queue length.
    - Persists run status in Prisma models like `scraperRun` and `scraperLog` and resumes backfills using `scraperTargetTag` metadata (e.g., `lastBackfillPage`).
    - Supports modes such as `NEW` and `BACKFILL`, expanding `useTargetTags` into per-tag queue items.
  - `listing-crawler.ts`, `product-parser.ts`, `listing-parser.ts`, `product-creator.ts`, `product-checker.ts`, `urls.ts`, and `utils.ts` implement crawling Booth listing pages, parsing product data (HTML or JSON), de-duplicating existing products, and persisting them.
  - There is extensive test coverage (`*.test.ts` files) validating parser, URL, and integration behavior.
- Search and filtering:
  - `src/lib/searchProducts.ts` implements the main product search, including safe-search logic (see tests `searchProducts.test.ts` & `searchProductsSafeSearch.test.ts`).
  - `src/lib/rate-limit.ts` and `src/lib/rate-limit.test.ts` implement request throttling/abuse prevention.
- User and validation:
  - `src/lib/user-validation.ts` plus tests handle account validation rules.
  - `src/lib/session.ts` wraps session access utilities.
- Integrations:
  - `src/lib/notion-client.ts` for Notion.
  - `src/lib/discord/webhook.ts` and tests for Discord notifications.
  - `src/lib/i18n.ts` and `src/lib/constants/messages.ts` for i18next-based translations and message constants.
- Misc utilities:
  - `src/lib/constants.ts` (e.g., `BASE_URL`, feature flags) used by layout and metadata.
  - `src/lib/sanitize.ts`, `src/lib/cookieConsentStorage.ts`, `src/lib/utils.ts`, etc.

When changing domain rules (e.g., how products are scraped, tagged, or searched):
- Update the lib implementation under `src/lib` (and `src/lib/booth-scraper` where relevant).
- Adjust any admin UI in `src/components/admin` and user-facing components (e.g., search filters, tag badges).
- Update and extend unit tests in `src/lib/__tests__` and `src/lib/booth-scraper`.
- Verify E2E flows around search, product display, and admin scraper control.

### UI components (`src/components`)

The `src/components` tree holds reusable UI and feature-specific components.

Major areas:
- `src/components/ui`:
  - Shadcn-style primitives: `button`, `dialog`, `dropdown-menu`, `input`, `pagination`, `sheet`, `tabs`, `tooltip`, `table`, etc.
  - `ErrorBoundary.tsx` and `sonner.tsx` for error display and toast notifications.
- Core layout and shared components:
  - `Header`, `Footer`, `MainLayout`, `Breadcrumbs`, `CookieBanner`, `AnalyticsLoader`, auth widgets (`AuthDropdown`, `AuthDialogNotice`), and search/product display components (`ProductGrid`, `ProductCard`, skeletons, mobile-specific controls).
- Feature-specific groups:
  - `components/admin/*`: Admin layout, Booth scraper dashboard (`ScraperDashboard`), reports list, user management, tag management (list/edit modal), running task summaries.
  - `components/search/*`: `ProductSearch`, filters and sidebar, sorting controls, skeletons.
  - `components/guidelines/*`: guideline containers, dialogs, onboarding modal, rating flowchart and visualizers, tag category badges, tagging guides.
  - `components/profile/*`: profile form, delete-account section, safe-search toggle, user product list.
  - `components/reports/*`: report dialogs and related UI.
  - `components/onboarding/*`: onboarding tour and related UX.

When changing UI behavior for a feature:
- Look for a corresponding feature folder (e.g., `components/search`, `components/admin`, `components/guidelines`) and update components there.
- Check for cross-feature components, such as tag/category badges, that are shared between end-user pages and admin.

### Hooks (`src/hooks`)

Custom React hooks encapsulate common behaviors:
- `useProductSearch` for client-side search interactions.
- `useDebounce`, `useMediaQuery`, `useTypewriter`, and `useGuidelineFirstVisit` for various UX patterns.
- Tests in `src/hooks/__tests__` and `src/hooks/useMediaQuery.test.ts` validate behavior.

These hooks are widely reused in components; changes can have broad impact. Always run Vitest after modifying them and check for usage across `src/components`.

### Scripts (`src/scripts`)

Operational/maintenance scripts:
- `booth-cron.ts` likely runs scheduled Booth scraper tasks via the orchestrator.
- `seed-target-tags.ts` seeds `scraperTargetTag` records that define which tags are scraped and their backfill state.
- `validate-queries.ts`, `compare-queries.ts`, and `debug-cron-state.ts` help debug or compare search/query behavior and scraper runs.

Scripts are generally invoked via `tsx` (see `compare-queries` npm script). When changing underlying domain logic, confirm whether these scripts need to be updated to keep operational flows consistent.

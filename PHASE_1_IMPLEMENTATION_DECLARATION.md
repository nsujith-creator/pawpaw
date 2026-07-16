# Pawpaw — Phase 1 Implementation Declaration

**Status:** Awaiting ChatGPT review  
**Scope authority:** `PROJECT_BRIEF.md`  
**Implementation agent:** Claude  
**Review agent:** ChatGPT

## 1. Build boundary

Phase 1 will create the working private Home flow only:

- Next.js App Router application;
- Supabase connection and reproducible migrations;
- administrator email/password authentication with explicit allowlist enforcement;
- shared viewer passphrase checked only on the server;
- signed, expiring, revocable viewer cookie;
- request gate protecting archive and administrator routes;
- private Storage bucket and policies;
- minimum content and media schema;
- mobile-capable administrator flow for Home content and Home photographs;
- authenticated Home page with a non-autoplay carousel and ambient-theme foundation;
- critical automated tests and manual browser acceptance checks.

Phase 1 will not create Her Story, Gallery, Letters, Moments, vault, finance, analytics, notifications, video, or speculative future abstractions.

## 2. Files to create or change

### Root configuration

- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `.env.example`
- `.gitignore` — extend only if generated files require it
- `README.md` — replace placeholder content with setup, run, test, migration, and backup instructions

### Application shell and request gate

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/robots.ts`
- `src/proxy.ts`

### Public authentication routes

- `src/app/family-login/page.tsx`
- `src/app/family-login/actions.ts`
- `src/app/admin/login/page.tsx`
- `src/app/admin/login/actions.ts`
- `src/app/auth/callback/route.ts`
- `src/app/logout/viewer/route.ts`
- `src/app/logout/admin/route.ts`

### Protected viewer Home flow

- `src/app/(archive)/page.tsx`
- `src/app/(archive)/home.module.css`
- `src/components/home/home-carousel.tsx`
- `src/components/home/carousel-controls.tsx`
- `src/components/home/ambient-frame.tsx`

### Protected administrator Home flow

- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/home/page.tsx`
- `src/app/admin/home/actions.ts`
- `src/app/admin/home/home-editor.tsx`
- `src/app/admin/media/actions.ts`
- `src/app/admin/media/upload-form.tsx`

### Server and validation modules

- `src/lib/env.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/admin.ts`
- `src/lib/auth/admin.ts`
- `src/lib/auth/viewer-cookie.ts`
- `src/lib/auth/viewer-passphrase.ts`
- `src/lib/auth/throttle.ts`
- `src/lib/auth/origin.ts`
- `src/lib/content/home.ts`
- `src/lib/content/schema.ts`
- `src/lib/media/private-url.ts`
- `src/lib/media/image-metadata.ts`
- `src/lib/media/palette.ts`

### Supabase migrations

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_rls_and_admin_policies.sql`
- `supabase/migrations/0003_private_media_bucket.sql`
- `supabase/seed.sql` — development-only documented seed without real credentials or private photographs

### Tests

- `vitest.config.ts`
- `tests/unit/viewer-cookie.test.ts`
- `tests/unit/content-schema.test.ts`
- `tests/unit/origin-check.test.ts`
- `tests/integration/publication-boundary.test.ts`
- `playwright.config.ts`
- `tests/e2e/auth-boundaries.spec.ts`
- `tests/e2e/home-flow.spec.ts`

The implementation agent may reduce this list when two small responsibilities are clearer in one file. Any added file or structural deviation must be declared before creation.

## 3. Database schema and policies

### `admin_users`

- `user_id uuid primary key references auth.users(id)`
- `display_name text not null`
- `active boolean not null default true`
- timestamps

### `content_items`

- fields required by the brief;
- Release 1 permits `type = 'home'` only at the application layer;
- `body_blocks jsonb` validated by the server before persistence;
- `status` constrained to `draft` or `published`.

### `media_assets`

- private Storage path and required metadata from the brief;
- no public URL column;
- processing state and recoverable error field.

### `content_media`

- composite uniqueness preventing duplicate placement;
- stable sort order;
- foreign keys with deletion rules preventing silent loss of referenced media.

### Policy boundary

- RLS enabled on every application table;
- authenticated users receive no write rights merely because they are signed in;
- active rows in `admin_users` are required for administrator reads and writes;
- viewer browsers receive no direct table access;
- private bucket blocks anonymous reads and permits writes only to active administrators;
- server-side viewer reads use the service role only after viewer-cookie validation and return published data only.

## 4. Dependencies

### Runtime

1. `next`, `react`, `react-dom`
   - Purpose: accepted application framework and UI runtime.
   - Install: `npm install next@latest react@latest react-dom@latest`
   - Recurring service cost: INR 0; open-source packages.

2. `@supabase/ssr`, `@supabase/supabase-js`
   - Purpose: supported Supabase browser/server authentication and database clients.
   - Install: `npm install @supabase/ssr @supabase/supabase-js`
   - Recurring package cost: INR 0.

3. `zod`
   - Purpose: validate environment variables, structured content blocks, and administrator input at runtime.
   - Install: `npm install zod`
   - Recurring cost: INR 0.
   - Built-in TypeScript types are insufficient because they do not validate untrusted runtime data.

4. `sharp`
   - Purpose: server-side image dimensions and palette-processing foundation for optimized presentation copies.
   - Install: `npm install sharp`
   - Recurring cost: INR 0.
   - Condition: retain only after production-build and Vercel-runtime verification. If it fails, stop and propose the brief-approved browser Canvas fallback before replacing it.

No animation library, component library, CMS, analytics, monitoring service, image SaaS, or icon package is approved for Phase 1.

### Development and tests

1. `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `eslint`, `eslint-config-next`
   - Purpose: type checking and linting.
   - Install: `npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next`
   - Recurring cost: INR 0.

2. `vitest`
   - Purpose: focused unit and integration tests for cryptographic/session and publication boundaries.
   - Install: `npm install -D vitest`
   - Recurring cost: INR 0.

3. `@playwright/test`
   - Purpose: real-browser checks for authentication boundaries, mobile width, and Home interaction.
   - Install: `npm install -D @playwright/test && npx playwright install chromium`
   - Recurring cost: INR 0; local browser download and disk use only.

## 5. Environment variables

The repository will document names only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VIEWER_PASSPHRASE_HASH`
- `VIEWER_COOKIE_SECRET`
- `VIEWER_SESSION_VERSION`
- `NEXT_PUBLIC_SITE_URL`

No secret value may be committed, logged, rendered to the browser, or placed in a `NEXT_PUBLIC_` variable unless it is explicitly intended to be public.

## 6. Free-tier verification and operating limits

Verified from official platform pages on 16 July 2026:

### Supabase Free

- INR 0/month;
- 500 MB database;
- 1 GB file storage;
- 5 GB egress plus 5 GB cached egress;
- 50 MB maximum upload;
- no automatic backups;
- no included image transformations;
- project may pause after one week of inactivity;
- two active free projects per account.

Operational consequences:

- presentation copies only, not original-photo archival storage;
- Release 1 upload validation must impose a much smaller application limit than 50 MB;
- manual database/content export must be documented;
- first real album usage must be measured before more media is loaded;
- inactivity pausing is accepted for initial private use and must be reopened if reliable always-on access becomes necessary.

### Vercel Hobby

Before deployment, Claude must record the exact current Hobby limits relevant to bandwidth, function duration, function size, image optimization, deployment count, and commercial/personal-use eligibility from Vercel's official limits and plan documentation. Any limit that conflicts with this private family use or the image-processing path is a blocker before production deployment, not before local scaffolding.

## 7. Acceptance tests

### Automated

- valid viewer cookie verifies;
- altered signature fails;
- expired cookie fails;
- old session version fails;
- invalid structured content fails validation;
- arbitrary HTML/script blocks fail validation;
- origin/host check rejects disallowed cross-origin administrator mutation;
- viewer query returns published Home content only;
- draft content is absent from viewer results;
- inactive/non-allowlisted authenticated user cannot mutate content;
- anonymous Storage read fails;
- viewer cookie never authorizes an administrator route.

### Manual browser acceptance

At 375 px and normal desktop width:

- family login rejects incorrect passphrase visibly and recovers;
- correct passphrase creates a persistent viewer session;
- unauthenticated archive request redirects before archive HTML/content is delivered;
- administrator login works independently for both approved accounts;
- non-admin authenticated account is denied;
- administrator creates, saves, publishes, edits, and unpublishes Home content;
- administrator uploads JPEG, PNG, and WebP presentation copies from a phone-sized viewport;
- unsupported or oversized upload shows a recoverable error without false success;
- private image cannot be fetched anonymously;
- Home carousel supports swipe, keyboard, previous/next controls, position indication, stable dimensions, and no autoplay;
- reduced-motion preference removes unnecessary motion;
- browser console and network panel contain no secret leakage or unexplained failures.

## 8. Required manual inputs before the complete Phase 1 flow can pass

These do not block the code scaffold, but they block a complete working deployment:

- a new Supabase project dedicated to Pawpaw;
- Supabase URL and keys stored locally and later in Vercel environment settings;
- Supabase user accounts for Sujith and Paru;
- their user IDs inserted into `admin_users` through a documented one-time procedure;
- a chosen family passphrase, converted locally to a scrypt hash;
- a new random viewer-cookie secret;
- approved Home prose;
- a small set of approved presentation-copy photographs with alt-text decisions;
- production hostname before final cookie and redirect configuration.

## 9. Declared deviations

None. This declaration intentionally stops before implementation so ChatGPT can review it as required by the canonical brief.

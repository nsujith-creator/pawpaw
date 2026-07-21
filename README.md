# Pawpaw

Private family archive for Varada. Read the canonical documents before touching any code.

- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — **read this first**: current build status, working-tree inventory, pending work, and manual-testing policy
- [docs/PENDING_REQUIREMENTS.md](docs/PENDING_REQUIREMENTS.md) — canonical living list of approved, blocked, proposed, released, and dropped follow-up requirements
- [docs/PRODUCT_PHILOSOPHY.md](docs/PRODUCT_PHILOSOPHY.md) — Release 2 product principles and feature decision tests
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — approved Release 2 visual foundation and unresolved implementation proofs
- [docs/visual-proof/](docs/visual-proof/) — Sujith's approved 19 July 2026 typography, colour, character, Home, Her Story, and Admin proof artefacts
- [PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- [CLAUDE_PROJECT_INSTRUCTIONS.md](CLAUDE_PROJECT_INSTRUCTIONS.md)
- [PHASE_1_IMPLEMENTATION_DECLARATION.md](PHASE_1_IMPLEMENTATION_DECLARATION.md)

---

## Setup

### 1. Prerequisites

- Node.js 20.9.0 or newer (required by Next.js 16)
- npm 9+
- Supabase CLI (`npm install -g supabase`)
- Access to the configured shared Supabase project. Pawpaw uses isolated tables, policies, and a private `media` bucket within that project; see `docs/PROJECT_STATUS.md` for the accepted Free-plan constraint.

### 2. Install dependencies

```
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in every value.

```
cp .env.example .env.local
```

#### Generate VIEWER_PASSPHRASE_HASH

```
node scripts/hash-passphrase.js
```

Enter the family passphrase when prompted. Copy the printed `scrypt:…` string into `.env.local`.

#### Generate VIEWER_COOKIE_SECRET and THROTTLE_KEY_SECRET

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run twice — use one value for each secret. They must be different.

### 4. Apply database migrations

#### Local development

```
supabase start
supabase db reset
```

#### Linked shared project

The hosted Supabase project is intentionally shared with QtPi and Paru Health. Pawpaw's eight migration files in `supabase/migrations/` are authoritative for Pawpaw only. Five additional remote-only migration versions are authoritative for QtPi or Paru Health and must remain absent from this repository.

Do **not** run `supabase db push --linked` for this project. Supabase CLI 2.109.1 rejects both the plain command and `--include-all` because the five legitimate shared-app versions are not present locally. Do not follow the CLI suggestion to repair, revert, fetch, or copy those versions; doing so would rewrite or import another application's migration history.

The controlled procedure used for Pawpaw's seventh and eighth migrations is:

1. Create one forward-only local Pawpaw migration with `npx supabase migration new <pawpaw_change_name>` and review the SQL for Pawpaw objects only.
2. Validate it locally with `npx supabase db reset` and the complete Pawpaw automated test suite.
3. With separate explicit authorization for that migration, use the official, project-scoped Supabase MCP `apply_migration` operation once, passing the migration name and the exact reviewed SQL from that committed local file. `apply_migration` executes the SQL and records its version in remote migration history together; do not substitute `execute_sql` followed by manual history repair.
4. Verify the result read-only with `npx supabase migration list`, a read-only query of `supabase_migrations.schema_migrations`, the live integration suite, and `npx supabase db advisors --linked`.

The current seventh and eighth Pawpaw migrations are recorded remotely as:

```
npx supabase db query --linked "select version, name from supabase_migrations.schema_migrations where version in ('20260717102121','20260717102133') order by version;"
```

Expected rows are `20260717102121 / phase1_security_hardening` and `20260717102133 / owner_scoped_atomic_media`. This query and `npx supabase migration list` are the harmless read-only validation for the current arrangement. No CLI dry-run can preview a future Pawpaw-only push while the remote-only shared history remains absent locally; if the project-scoped `apply_migration` operation is unavailable, stop rather than changing shared migration history.

Supabase documents [`apply_migration` as an official MCP database operation](https://supabase.com/docs/guides/ai-tools/mcp) and documents that ordinary [`db push` compares local files with remote migration history](https://supabase.com/docs/reference/cli/supabase-db-push).

### 5. Seed admin users

After creating Supabase Auth accounts for Sujith and Paru, run:

```sql
insert into public.admin_users (user_id, display_name) values
  ('<sujith-supabase-user-id>', 'Sujith'),
  ('<paru-supabase-user-id>', 'Paru');
```

Run this once through the Supabase SQL editor. Never commit real user IDs to the repository.

---

## Development

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Verification

```
npm run type-check    # TypeScript
npm run lint          # ESLint
npm test              # Vitest unit + integration tests
npm run test:e2e      # Playwright (requires running server and credentials)
npm run build         # Production build
```

---

## Manual backup / export

Export the database at any time:

```
supabase db dump -f backup-$(date +%Y%m%d).sql
```

Photographs are stored in the Supabase private `media` bucket. Download them from the Supabase dashboard → Storage → media. Supabase is not the sole master copy — keep original photographs in Sujith and Paru's normal photo backup system.

---

## Deployment

**Current production:** [https://www.heyvarada.in](https://www.heyvarada.in)

**Short entry domain:** [https://heyvarada.in](https://heyvarada.in), redirected to `www`

**Legacy/fallback URL:** [https://pawpaw-lemon.vercel.app](https://pawpaw-lemon.vercel.app)

Wix is the registrar and DNS host. Vercel hosts the `pawpaw` application. Production uses `NEXT_PUBLIC_SITE_URL=https://www.heyvarada.in`.

1. Push to GitHub.
2. Connect the repository to a dedicated Pawpaw Vercel project.
3. Add all environment variables from `.env.example` in Vercel project settings.
4. Set `NEXT_PUBLIC_SITE_URL` to the canonical production hostname.
5. Verify Vercel Hobby plan limits before deploying (bandwidth, function duration, image optimization).

Phase 1 is complete, merged, deployed, and production verified. Release 2 design proof is approved: canonical visual rules live in `docs/DESIGN_SYSTEM.md`, and the approved artefacts live in `docs/visual-proof/`. The current milestone is documentation reconciliation only. The next gate is a bounded UI implementation declaration and plan; implementation has not begun and is not authorised by this run.

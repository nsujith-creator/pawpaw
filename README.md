# Pawpaw

Private family archive for Varada. Read the canonical documents before touching any code.

- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — **read this first**: current build status, working-tree inventory, pending work, and manual-testing policy
- [PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- [CLAUDE_PROJECT_INSTRUCTIONS.md](CLAUDE_PROJECT_INSTRUCTIONS.md)
- [PHASE_1_IMPLEMENTATION_DECLARATION.md](PHASE_1_IMPLEMENTATION_DECLARATION.md)

---

## Setup

### 1. Prerequisites

- Node.js 18+
- npm 9+
- Supabase CLI (`npm install -g supabase`)
- A dedicated Supabase project for Pawpaw (separate from qtpi)

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

```
supabase db push
```

Or for local development:

```
supabase start
supabase db reset
```

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

1. Push to GitHub.
2. Connect the repository to a Vercel project (separate from qtpi).
3. Add all environment variables from `.env.example` in Vercel project settings.
4. Confirm production hostname, then set `NEXT_PUBLIC_SITE_URL` in Vercel.
5. Verify Vercel Hobby plan limits before deploying (bandwidth, function duration, image optimization).

Domain registration (`varada.in` or `varadanair.in`) is manual and not required for local development.

# Pawpaw — Project Build Status, Pending Work, and Manual Test Register

**Status date:** 18 July 2026 (Release 2 design foundation documented; awaiting product-owner approval)
**Repository:** `nsujith-creator/pawpaw`
**Working branch:** `main`
**PR:** `#2 — Implement Phase 1 private Home flow` (merged and closed)
**Main merge commit:** `93e464f30bdb95975bbac5d9e387a931c509c0ff` — normal GitHub merge of PR #2
**Purpose of this file:** Single self-contained source of truth for current work, completed work, pending tasks, active risks, verification status, and manual-testing policy.

---

## 1. Mandatory operating rules

### 1.1 Manual testing policy

1. Do not request manual testing after each implementation run, bug fix, or prompt.
2. Manual testing happens only after a **major phase or major integrated milestone** is complete.
3. Maximum manual-testing rounds for the Pawpaw project: **3 consolidated rounds total**.
4. The earlier Phase 1 browser checks are consolidated as **Manual Test Round 1**.
5. All **3 of 3** formal manual-test rounds have been used. Manual Test Round 3 completed with every check passed and no failed, unclear, or untested items.
6. New findings discovered between formal rounds must be:
   - recorded in this file;
   - covered by automated tests wherever feasible;
   - fixed and verified automatically;
   - deferred to the next consolidated manual round.
7. After Manual Test Round 3, any further UI observations or feedback must be added to the pending register in this file. Do not request another manual round unless the user explicitly overrides this rule.
8. A manual test may be requested early only for a true blocker that cannot be verified through unit, integration, E2E, build, static analysis, or live Supabase tests. The reason must be stated explicitly.
9. Every Claude Code prompt must instruct Claude to update this file before returning its report.

### 1.2 Claude prompt requirements

Every implementation prompt sent to Claude must include:

- repository path and branch;
- current committed head;
- exact current milestone;
- completed work that must not be regressed;
- current work;
- pending work;
- known defects and risks;
- automated verification commands;
- explicit instruction not to request manual testing unless a major milestone is complete;
- instruction to update this file;
- instruction not to commit, push, merge, or alter PR state unless specifically authorized;
- AI model and reasoning level stated outside the prompt.

### 1.3 Security and release rules

- Do not expose `.env.local`, Supabase secret/service-role keys, passwords, passphrases, UUIDs, or signed tokens.
- Do not weaken Auth, active-admin checks, origin checks, RLS, private Storage, file validation, or signed delivery.
- Do not amend migrations already applied remotely.
- New database changes must be forward-only migrations and reviewed before remote push.
- PR #2 may be marked ready for review after this acceptance-status update is pushed and every required verification command exits 0.
- Restore `next-env.d.ts` after `next build` if Next.js regenerates it.
- Do not merge Phase 1 while this file lists unresolved release blockers.

### 1.4 Phase 1 acceptance summary

- Manual Test Round 3: **completed — all checks passed**.
- Formal manual-test rounds used: **3 of 3**.
- Failed items: **0**.
- Unclear items: **0**.
- Untested items: **0**.
- Phase 1 manual acceptance: **complete**.
- Further manual testing: **not authorized unless Sujith explicitly requests it later**.
- Shared Supabase arrangement, warnings, and limitations: **accepted as recorded in Sections 3.2 and 8**.
- Release decision: **PR #2 was marked ready for review after every required automated verification command exited 0**.
- Merge and deployment: **complete**. Phase 1 is merged into `main`, deployed, and production verified.
- Release 2: **opened**. Its first milestone is the documentation-only design foundation.
- UI implementation gate: **blocked pending Sujith's approval** of `docs/PRODUCT_PHILOSOPHY.md` and `docs/DESIGN_SYSTEM.md`.
- Manual testing for this milestone: **not required and not requested**; all 3 of 3 formal rounds remain consumed.

---

## 2. Product direction

Pawpaw is Varada's private family website and publishing system.

The product must provide:

- private family access through a shared passphrase;
- separate secure admin authentication;
- private Supabase Storage;
- signed image delivery;
- a cinematic illustrated storybook family experience built around truthful photographs, chapters, chronology, and family voices;
- a complete owner-facing content and media management workflow;
- clear separation between drafts, published content, Home-page configuration, and reusable media;
- a maintainable admin dashboard that remains usable when content grows.

### Visual direction

The active selected direction is **Direction B-led with selected Direction C energy**. Direction B supplies a cinematic illustrated storybook structure: truthful photography, chapter-based visual worlds, chronology, authorship, and family voices. Direction C supplies present-day vivid controlled colour, humour, expressive characters, contemporary energy, playful annotations, and baby-girlish personality without cliché.

The interface must be premium, modern, highly readable, imaginative, and age-aware. Illustration is coherent and first-class around documentary photographs; colour is vivid and controlled; baby-girlish never means pink-only, princess-only, generic nursery styling, or clutter. Avoid quiet/editorial-only, cream-and-ink-only, dark-cosmos-default, generic SaaS, trend-heavy sticker-collage, and conventional luxury-family-album treatments.

---

## 3. Completed and remotely verified work

### 3.1 Repository and PR

- `main` baseline: `5112bca009dd180f5dc5b29e4f7d468242562b75`
- Phase 1 implementation commits:
  - `dc7e41c68659bdbbe8ae483bab2ce34619ce5711`
  - `5ce09b25a0846496b19b230bceb6e284be290193`
  - `23467de00fe8e75c948506c848fdab6d45feff08 — Verify live Supabase security and privileges`
  - `0f529a8b47b4a6bc34b3d371bdfb64bcab648ef9 — Complete Phase 1 admin, media, and family Home flow`
  - `a5efaaf89edba59f27478b8d56ed101bcfad46f6 — Finalize Phase 1 acceptance status`
  - `c02d4c6fba6ab5acac5d6e10e287377f8e75a2c0 — Fix Phase 1 security and verification blockers`
  - `Resolve final Phase 1 review findings` — current checkpoint commit containing this file; exact SHA is added to PR #2 after push
  - `93e464f30bdb95975bbac5d9e387a931c509c0ff — Merge pull request #2 from nsujith-creator/phase-1-implementation`
- `main` is pushed to `origin/main`; `phase-1-implementation` is preserved.
- PR #2 is merged and closed. Phase 1 production deployment is complete.

### 3.2 Supabase

Project:

- name: `pawpaw`
- project ref: `voorknvdvfweahsnjvne`
- region: Mumbai
- plan: Free
- status: Healthy

Applied migrations — tracked locally in `supabase/migrations/` and applied remotely:

- `0001_initial_schema.sql` — committed before `dc7e41c`
- `0002_rls_and_admin_policies.sql` — committed before `dc7e41c`
- `0003_private_media_bucket.sql` — committed before `dc7e41c`
- `0004_viewer_login_throttle.sql` — committed before `dc7e41c`
- `0005_table_privileges.sql` — added by commit `23467de`
- `0006_lock_set_updated_at_search_path.sql` — added by commit `23467de`
- `20260717102121_phase1_security_hardening.sql` — canonical Home singleton plus atomic viewer-login failure accounting; applied remotely in this run
- `20260717102133_owner_scoped_atomic_media.sql` — owner-scoped media and Storage policies plus atomic attachment, reorder, detach, and relational-delete functions; applied remotely in this run

All 8 Pawpaw files exist on disk under `supabase/migrations/`; the two timestamped files are the forward-only migrations created and applied in this remediation run. They form the current Pawpaw migration set. The linked Supabase project is intentionally shared with qtpi tracker and Paru Health because the Supabase Free plan permits only two projects and Sujith operates more than two Supabase-backed apps. This is an explicit accepted cost constraint, not a Pawpaw release blocker by itself.

The five additional remote-only history versions were inspected and classified without importing them into this repository or altering their history:

- `20260716231532` — `create_paru_health_assets_bucket`: creates only Paru Health's `paru-health-assets` bucket and Paru-specific Storage policies.
- `20260716235504` — `create_qtpi_feeds`: creates only `public.qtpi_feeds`, its index, qtpi-scoped RLS policies, and its Realtime publication entry.
- `20260717040149` — `grant_qtpi_feeds_anon`: grants only schema usage and qtpi table privileges required by qtpi tracker's existing anonymous-client model.
- `20260717091207` — `create_qtpi_assets_bucket`: creates only qtpi tracker's `qtpi-assets` bucket and qtpi-scoped Storage policies.
- `20260717091406` — `drop_qtpi_assets_anon_insert`: removes only qtpi tracker's anonymous insert policy from `qtpi-assets`.

None references or changes Pawpaw's tables, helper function, `media` bucket, media paths, privileges, policies, tests, or application runtime. They are accepted shared-project history and must not be copied into Pawpaw merely to make local and remote version columns symmetrical.

The current Supabase CLI cannot push Pawpaw-only migrations from this repository while those five remote-only versions remain absent locally: both `npx supabase db push --linked --dry-run` and the same command with `--include-all` fail before producing a plan. The controlled alternative used for the seventh and eighth Pawpaw migrations is the official project-scoped Supabase MCP `apply_migration` operation, once per reviewed forward-only local file. It executes the exact SQL and records the remote migration version together. Do not use `execute_sql` plus manual history repair, and do not repair, revert, fetch, or import the five shared-app versions. Read-only verification confirms remote records `20260717102121 / phase1_security_hardening` and `20260717102133 / owner_scoped_atomic_media`. The executable procedure and validation query are documented in README Section 4.

Verified:

- local and remote Pawpaw histories match through `20260717102133`; the five shared-app entries are remote-only and classified as listed above;
- active-admin RLS works;
- inactive admins are rejected;
- anonymous users cannot read private tables;
- private Storage upload and signed delivery work;
- Pawpaw's `media` bucket is currently `public = false`;
- a read-only live isolation audit found 6 current Pawpaw media records, all with owner-scoped paths; anonymous listing returned zero objects and anonymous download of a known object was blocked;
- the Paru policy predicate is exactly `bucket_id = 'paru-health-assets'`, so it grants no access to Pawpaw's `media` bucket or paths;
- service-role and authenticated table privileges are explicit;
- `public.set_updated_at()` has a fixed empty `search_path`;
- the advisor warning for public `paru-health-assets` belongs to Paru Health and does not cross its bucket predicate; it is a separate Paru-specific security concern, not a Pawpaw blocker;
- the advisor warning for public `qtpi-assets` belongs to qtpi tracker and does not cross its bucket predicate; it is a separate qtpi-specific security concern, not a Pawpaw blocker;
- the accepted Free-plan leaked-password-protection warning remains;
- the repository is linked to the intended shared project ref.

### 3.3 Authentication and privacy

Implemented and verified:

- family passphrase login;
- signed viewer cookie;
- versioned viewer session invalidation;
- database-backed login throttling;
- admin Supabase Auth;
- active-admin allowlist;
- viewer logout;
- admin logout;
- empty family state with Leave control;
- published family state with Leave control.

### 3.4 Home content flow

Implemented:

- Home title;
- plain-text paragraph editor;
- server conversion to validated structured blocks;
- Save draft;
- Publish;
- Unpublish;
- status display;
- draft isolation from family viewer;
- published content display;
- Advanced JSON access for structured content.

### 3.5 Media flow

Implemented and committed:

- direct browser-to-private-Supabase signed upload;
- no image bytes through Vercel Server Actions;
- JPEG, PNG, and WebP validation;
- 8 MB application limit;
- trusted server finalization;
- server verification of Storage metadata;
- `media_assets` creation;
- Home attachment creation;
- invalid-object cleanup;
- bounded stale-orphan sweep;
- signed private thumbnails;
- separate accessibility alt text and visible caption;
- attachment description editing;
- reordering;
- detaching;
- permanent deletion;
- `router.refresh()` after successful mutations;
- form-value preservation after failure;
- one-photo-at-a-time carousel;
- full-image `object-fit: contain`;
- bounded responsive frame;
- visible caption;
- arrows, dots, swipe, and keyboard support.

### 3.6 Admin Dashboard, Content Library, Media Library, Premium UI work

The full declared milestone is implemented, committed, and automatically verified as of 17 July 2026. The linked Supabase findings are classified as accepted shared-project state, Pawpaw isolation is verified, and Phase 1 manual acceptance is complete.

#### New files added this milestone

- `src/components/admin/admin-nav.tsx` — sticky client nav with active-link detection, aria-current, sign-out form
- `src/components/admin/admin-nav.module.css` — frosted bar, reduced-motion support
- `src/app/admin/content/page.tsx` — Content Library (all content_items, status/type filters, Home→editor link, Release 2 note for other types)
- `src/app/admin/media/page.tsx` — Media Library server page (signed thumbnails, attachment count)
- `src/app/admin/media/media-library-client.tsx` — interactive client: Attach to Home, edit alt/caption, permanent delete with confirmation
- `docs/DESIGN_SYSTEM.md` — color tokens, typography, spacing, admin layout, card/badge patterns, premium carousel pattern
- `tests/unit/admin-dashboard.test.ts` — 16 static source checks
- `tests/unit/content-library.test.ts` — 9 static source checks
- `tests/unit/media-library.test.ts` — 16 static source checks

#### Modified files this milestone

- `src/app/admin/layout.tsx` — removed standalone sign-out from header; added `<AdminNav />`
- `src/app/admin/page.tsx` — real dashboard: stat cards (Drafts, Published, Media files), quick links, recent-items table, parallel DB fetch
- `src/app/admin/media/actions.ts` — added `attachMediaToHome`; updated `revalidateHome()` to include `/admin/media`
- `src/app/admin/media/attachment-list.tsx` — renamed button "Remove from Home (keep file)" → "Move to Media Library"; updated success message
- `src/components/home/home-carousel.tsx` — replaced flat palette background with layered blurred bg + translucent overlay + sharp contained image
- `src/components/home/home-carousel.module.css` — added `.blurredBg` and `.overlay` classes; added `position: relative; z-index: 0` to `.image`
- `tests/unit/ui-acceptance.test.ts` — updated 3 expectations for renamed button + new img count; added 4 premium background tests

#### Admin library blocker-closure work

- `/admin` now uses active-admin-owned content only; shows updated/published timestamps, exact attachment counts, and the first available private signed thumbnail; supports case-insensitive title search, status/type filters, clear/reset, deterministic newest-first ordering, and explicit query-error handling.
- `/admin/content` now supports case-insensitive title search combined with existing status/type filters, deterministic ordering, clear/reset, filtered no-results, and explicit query-error handling.
- **Create New product decision:** the Phase 1 control is deliberately disabled and labelled `Create New — Release 2`. It does not link to an editor, preload Home, or mutate the Home singleton. Home remains the only editable Phase 1 content type; unsupported types retain `Editor coming in Release 2`.
- `/admin/media` now shows creation date, safe filename, MIME type, size, alt text, caption, exact attachment count, and attached content titles; supports cross-field search, JPEG/PNG/WebP filtering, attached/unattached filtering, newest/oldest ordering, clear/reset, and combined filters.
- Media data remains active-admin-owned; Storage paths stay server-side, thumbnails use short-lived signed URLs, and query failures remain distinct from genuine empty states.
- `src/lib/admin/library-view.ts` contains pure deterministic filter, sort, timestamp, safe-basename, and attachment-summary behavior.
- `tests/unit/admin-library-behavior.test.ts` adds 19 behavioral cases; Dashboard, Content Library, and Media Library regression suites add 12 source-contract cases; live media-management coverage adds 2 real PostgREST relationship-query cases.

#### Automated verification results (17 July 2026 — Round 2 defect fixes applied)

| Command | Exit | Result |
|---|---|---|
| `npm run type-check` | 0 | Passed |
| `npm run lint` | 0 | Passed — no findings, full `eslint .` |
| `npm test` | 0 | 15 files passed, 4 skipped; **186 tests passed**, 33 skipped |
| `npm run test:integration:live` | 0 | 5 files passed; 34 tests passed (all live Supabase calls) |
| `npm run test:e2e` | 0 | 20 passed, 2 skipped |
| `npm run build` | 0 | 12 routes — clean |
| `git diff --check` | 0 | LF/CRLF warnings only |
| `npx supabase migration list` | 0 | 6/6 local+remote in sync |
| `npx supabase db advisors --linked` | 0 | Historical result recorded by that run; superseded by the final checkpoint audit below |

#### Verification stability investigation and fix (17 July 2026)

**Vitest crash root cause:** Vitest 3.2.7 already defaults to `pool: 'forks'` (child processes). The prior Tinypool crash was a one-time transient worker teardown event on Windows + Node 24.13.0 — not a deterministic failure. On repeated re-runs, `npm test` exits 0 consistently. The `pool: 'forks'` setting has been made explicit in `vitest.config.ts` (previously it was only the upstream default, not declared in the project config) to prevent regression if the upstream default ever changes.

**ESLint crash root cause:** The prior crash (exit code -1073740791 = Windows `STATUS_STACK_BUFFER_OVERRUN`) was a one-time transient process crash during parallel TypeScript file processing, likely triggered by a stale `.next` build artefact that was present during that session. No ESLint cache file existed. On repeated runs — including `--no-cache`, isolated per-directory runs, and full `eslint .` — the command exits 0 with zero findings. No configuration change was required; no cache was corrupted.

**File changed:** `vitest.config.ts` — added `pool: 'forks'` explicitly to lock in the safe worker pool.

#### Full verification results (17 July 2026 — blocker-remediation checkpoint)

| Command | Exit | Result |
|---|---|---|
| `npm run type-check` | 0 | Passed |
| `npm run lint` | 0 | Passed — no findings, full `eslint .` |
| `npm test` | 0 | 19 files passed, 5 skipped; **244 tests passed**, 42 skipped |
| `npm run test:integration:live` | 0 | 6 files passed; **43 tests passed**, 0 skipped; global fixture reconciliation active |
| Pawpaw fixture residue query | 0 | users 0, content 0, media 0, associations 0, Storage objects 0, throttle rows 0 |
| `npm run test:e2e` | 0 | **21 passed, 3 skipped**, 0 failed; one worker protects the shared live Home singleton |
| Pawpaw server-process check | 0 | `PAWPAW_SERVER_PROCESSES_POST=0` |
| `npm run build` | 0 | 12 routes — clean |
| `git diff --check` | 0 | No whitespace errors; Windows LF/CRLF normalization warnings only |
| `npx supabase migration list` | 0 | 8 Pawpaw migrations aligned local/remote; 5 classified shared-app migrations remain remote-only |
| `npx supabase db advisors --linked` | 0 | 3 accepted warnings: Paru public listing, qtpi public listing, leaked-password protection disabled |
| `git status --short` | 0 | Only intended blocker-remediation files modified; generated `next-env.d.ts` change restored |

Every required step exited 0 in one sequential run. No test failed. Across the default, live, and E2E suites, **308 tests passed, 45 were intentionally skipped, and 0 failed**. The live integration suite passed all 43 credential-gated tests with no skips. Pawpaw migrations are current through `20260717102133`; the five remote-only shared-project entries touch only Paru Health/qtpi objects, and Pawpaw's private `media` bucket remains isolated.

**Skipped tests (intentional — require live credentials not available in default run):**
- `tests/integration/admin-function-security.test.ts` — 6 skipped (requires real Supabase credentials; run via `test:integration:live`)
- `tests/integration/direct-upload.test.ts` — 13 skipped (same)
- `tests/integration/home-content-save.test.ts` — 4 skipped (same)
- `tests/integration/media-management.test.ts` — 14 skipped (same)
- `tests/integration/publication-boundary.test.ts` — 4 of 5 skipped (1 runs in default mode; 4 require credentials)
- `tests/integration/throttle-live.test.ts` — 1 skipped (same)

**E2E skipped tests (3):**
- `[chromium] home-flow.spec.ts — family passphrase login flow — entering the family passphrase grants a viewer session` — raw family passphrase is intentionally unavailable to automation
- `[mobile-chrome] same test`
- `[mobile-chrome] published-home-route.spec.ts — publish, media degradation, unpublish, and republish are fresh on HTTP requests` — live mutation runs once in the desktop project to avoid racing the same singleton

#### Published Home rendering investigation and closure (17 July 2026)

Live evidence before the fix:

- exactly one Home row exists; it is owned by an active admin and has status `published`;
- title is `Varada Test` with two valid paragraph blocks;
- the family-side query returned that same row;
- two attached-media relationships resolved and both private signed URLs generated;
- two independent authenticated fresh HTTP requests returned status 200 with the title and both paragraphs present and the empty-state text absent;
- responses used `Cache-Control: no-cache, must-revalidate`, with no `Age` or `x-nextjs-cache` header;
- `src/app/(archive)/page.tsx` is `force-dynamic`; no `use cache`, `unstable_cache`, cached fetch, static route config, or ISR is used on this path.

Exact defects found and fixed:

1. The family route treated `carousel.length === 0` as “no published Home”, so valid published title/body could be replaced by the empty state when no attachment resolved.
2. `getPublishedHomeContent()` returned `null` for both a real empty result and a content-query failure, swallowing an operational error into the empty state.
3. Content blocks were cast without runtime validation; duplicate published Home rows were silently reduced to one by `limit(1).maybeSingle()`.
4. The content and media relationship were fetched in one query, so a media relationship failure could suppress valid published prose.

Fix and regression proof:

- explicit `published`, `empty`, and `error` result states;
- runtime `bodyBlocksSchema` validation and duplicate detection;
- separate content and media queries;
- missing media, media-query failure, missing related media, and signed-URL failure degrade the carousel while preserving published prose and displaying a distinct warning;
- `tests/unit/home-content-loader.test.ts`: 7 behavioral cases;
- `tests/integration/publication-boundary.test.ts`: live loader returns the exact published row with valid blocks and signed media;
- `tests/e2e/published-home-route.spec.ts`: authenticated real-route publish, repeated fresh request, forced media-signing failure, unpublish, and republish; original title/body/status/publish timestamp/media path restored in `finally`;
- the required real update cycle advanced the Home row's normal `updated_at` audit timestamp; no content, status, attachment, or Storage-path drift remains.

The exact historical browser state from Manual Test Round 2 was not captured, so it is not honest to classify that past observation as proven browser cache or proven pre-publish state. Current caching, data, session, and fresh-request evidence rules out a retained Next.js server/data cache in the reproduced path. The published-Home rendering issue is proven closed for the current application path.

### 3.7 Vercel Phase 1 production deployment (18 July 2026)

Production configuration:

- Vercel project: `pawpaw` under `nsujith-creator's projects` (`nsujith-creators-projects`)
- canonical production URL: `https://www.heyvarada.in`
- short entry domain: `https://heyvarada.in` (redirects to `www`)
- legacy/fallback production URL: `https://pawpaw-lemon.vercel.app`
- registrar and DNS host: Wix
- application host and project: Vercel, project `pawpaw`
- deployed Phase 1 application Git SHA: `ab554df19e5867b7c0b4e09ffc6fd69e3b8cfc07`
- production branch: `main`
- Git integration: connected to `nsujith-creator/pawpaw`
- automatic production deployments from `main`: enabled
- preview deployments: normal Vercel defaults; no Preview environment variables were added
- framework/root/build/output: Next.js, repository root, Vercel default Next.js build, Vercel default Next.js output
- Node.js: `24.x`, compatible with the repository requirement `>=20.9.0`
- custom domain: configured and verified; the apex redirects to the canonical `www` hostname and HTTPS is valid
- cost gate: existing free Hobby resources; incremental project/deployment cost is INR 0

Production environment-variable presence (values are not recorded):

| Variable | Production status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | added, encrypted |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | added, encrypted |
| `SUPABASE_SERVICE_ROLE_KEY` | added, encrypted |
| `VIEWER_PASSPHRASE_HASH` | added, encrypted |
| `VIEWER_COOKIE_SECRET` | added, encrypted; application validator accepted it |
| `VIEWER_SESSION_VERSION` | added, encrypted; application validator accepted it |
| `THROTTLE_KEY_SECRET` | added, encrypted |
| `NEXT_PUBLIC_SITE_URL` | added, encrypted; final value points to the production URL above |

Final production deployment `dpl_51k28VjWtSRV6F97BmDYVGBUaMxS` is `READY`, records branch `main` and exact Git SHA `ab554df19e5867b7c0b4e09ffc6fd69e3b8cfc07`, and has no dirty-worktree marker. The final build compiled Next.js 16.2.10, completed TypeScript, generated 12/12 static pages, emitted every declared static/dynamic route plus Proxy, and completed deployment with exit 0. The native `sharp` dependency installed and bundled without build failure; runtime image decoding/upload was not exercised because production smoke testing did not modify permanent family content.

Production smoke result: **passed within the credential limitations explicitly allowed by the deployment request**.

- `/` redirects unauthenticated viewers to `/family-login`; the family login page returns 200.
- one wrong passphrase was rejected with `Incorrect passphrase.`; this may create the expected hashed failed-login throttle record, but no schema, migration, policy, bucket, family content, media, QtPi, or Paru Health state was changed.
- the raw family passphrase was unavailable to automation, so positive production login and Leave/logout were not fabricated; positive passphrase and logout behavior remain supported by the fully passed Manual Test Round 3.
- `/admin`, `/admin/content`, `/admin/media`, and `/admin/home` all redirect unauthenticated users to `/admin/login`; the admin login page returns 200.
- administrator credentials were unavailable locally, so authenticated production Dashboard, Content, Media, and Home-editor navigation was not exercised; no content mutation was attempted.
- a real private media record produced a short-lived `/object/sign/media/` URL that returned 200; the corresponding `/object/public/media/` request was blocked; the `media` bucket remains `public = false`.
- 19 delivered CSS/JavaScript assets returned successfully; no ChunkLoadError, hydration failure, missing asset, Pawpaw browser-console warning/error, raw database error, runtime error cluster, production warning/fatal log, or 5xx response was found.
- family and admin login pages had no horizontal overflow at desktop and 375 px mobile widths.
- actual server-only values were absent from rendered login HTML and fetched client bundles.
- linked migration history still contains all 8 Pawpaw migrations and the same 5 classified QtPi/Paru remote-only migrations. No migration or database command that changes state was run.

Production-only warnings and accepted limitations:

- Vercel warns that the open-ended Node engine `>=20.9.0` can automatically adopt future major Node versions; the configured runtime is currently `24.x`.
- positive family and administrator production sessions were not automation-testable without raw credentials. This is recorded as a credential limitation, not reported as fabricated proof.
- every non-Home content surface remains outside the completed Phase 1 deployment.

**Phase 1 production verification: complete.** This verdict combines the exact-SHA clean build, live unauthenticated/auth-failure boundaries, live private-media/Supabase checks, asset/secret/runtime-log checks, and the already completed Manual Test Round 3 for positive credential flows.

### 3.8 Production logout remediation (18 July 2026)

Two authenticated production controls were confirmed broken on deployment `dpl_4gpzdcWTUZSMVYM4odRRNZwLbMmA`:

- family `Leave` submitted `POST /logout/viewer`; the handler cleared `pawpaw_viewer` and returned the default `NextResponse.redirect` status 307 to `/family-login`. The browser correctly preserved POST across the 307 and `POST /family-login` returned 405.
- admin `Sign out` submitted `POST /logout/admin`; the handler called Supabase `auth.signOut()` and returned the same default 307 to `/admin/login`. The browser preserved POST and `POST /admin/login` returned 405.

The controls, POST route handlers, and Proxy routing were otherwise correct. This was not a GET mutation, form-method mismatch, Proxy interception, or Supabase failure. The exact defect was using a method-preserving 307 after successful logout mutations when both destinations are GET-only pages.

Fix:

- both POST logout handlers now use HTTP 303 See Other, which tells the browser to follow the redirect with GET;
- viewer cookie deletion and Supabase admin sign-out remain unchanged;
- no GET logout endpoint, migration, policy, dependency, content change, or cross-app change was introduced.

Regression proof:

- `tests/e2e/auth-boundaries.spec.ts` creates only a tagged temporary active-admin fixture, signs in through the real admin form, clicks the real Sign out control, and proves the destination request is GET/200 and `/admin` stays blocked; it also uses a valid signed viewer session, clicks the real Leave control, proves GET/200, exercises Back/reload, and proves `/` stays blocked.
- `tests/e2e/home-flow.spec.ts` additionally asserts the existing real family Leave flow follows with GET/200 before checking the cleared-session boundary.
- temporary Auth/allowlist fixtures are deleted and the shared cleanup proves users, content, media, associations, Storage objects, and throttle rows all return to zero.

Final local verification after the last test change:

| Command | Exit | Result |
|---|---|---|
| `git status --short` | 0 | Only the two logout handlers and two E2E files were modified before this status update |
| `npm run type-check` | 0 | Passed |
| `npm run lint` | 0 | Passed, no findings |
| `npm test` | 0 | 244 passed, 42 intentionally skipped |
| `npm run test:integration:live` | 0 | 43 passed, 0 skipped; zero fixture residue |
| `npm run test:e2e` | 0 | 25 passed, 3 intentionally skipped; zero fixture residue and zero Pawpaw server processes |
| `npm run build` | 0 | Next.js 16.2.10 production build passed; 12 routes generated |
| `git diff --check` | 0 | No whitespace errors; Windows line-ending warnings only |

Production verification used code-identical deployment `dpl_4Vr9zw4QNYfuGyAguY69PKspgVre` (`READY`) before the release commit was created so this result could be recorded in the same requested commit. Eight production authentication-boundary browser tests passed. An authenticated derived viewer session clicked Leave; `/family-login` returned 200 by GET, Back/reload did not restore access, and `/` remained blocked. A tagged temporary active administrator signed in through the real form and clicked Sign out; `/admin/login` returned 200 by GET and `/admin` remained blocked. The temporary administrator and allowlist row were deleted; residue was zero and no permanent family content changed. Deployment-scoped Vercel logs recorded `POST /logout/viewer 303` and `POST /logout/admin 303`, with no 405 or 5xx. Both live login pages produced no browser-console warning or error, and no secret exposure or ChunkLoadError was observed. The final Git-integrated production deployment and its exact SHA are verified after this commit is pushed.

### 3.9 Corrective logout history-restoration remediation (18 July 2026)

Commit `0f5c90d84f9f045b80df14a4bfe9d79aafd67cd7` fixed only the method-preserving redirect defect: both logout mutations correctly remained POST-only and began returning 303 followed by GET/200 login pages. It did not close the browser-history privacy boundary. Real production testing subsequently proved that one immediate browser Back action could restore the previously rendered private family Home or Admin Dashboard.

The Section 3.8 Back claim and its tests were incomplete. The family test called `page.goBack()` but did not inspect the restored page until after `page.reload()`, which revalidated authentication and masked the transient private restoration. The admin test did not call Back at all. Neither test proved the immediate post-Back DOM state.

Instrumented local reproduction identified the exact mechanism in both flows as a normal browser history-cache restoration, not BFCache and not a Next.js client-router transition:

- family Back returned the prior `/` response as HTTP 200 with `Cache-Control: no-cache, must-revalidate`, `PerformanceNavigationTiming.type = back_forward`, and `pageshow.persisted = false`;
- admin Back returned the prior `/admin` response with the same status/header/navigation evidence and `pageshow.persisted = false`.

The corrective implementation is intentionally limited to authenticated private surfaces:

- production responses for `/`, `/admin`, `/admin/content`, `/admin/home`, and `/admin/media` now send `Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate`;
- an early private-history guard runs before private children render, hides the document during logout and `pagehide`, and forces a same-URL authentication revalidation for `back_forward` or persisted `pageshow` restorations while the private DOM remains hidden;
- `/family-login` and `/admin/login` are excluded from the private cache header and remain statically prerendered;
- the admin navigation is no longer rendered on the public admin login page;
- POST-only logout handlers, 303 responses, viewer-cookie invalidation, Supabase `signOut`, Proxy enforcement, and existing security controls are unchanged.

Corrected regression tests click the real Leave and Sign out controls, prove the destination request is GET/200, press browser Back once, and immediately assert that the private family surface/Dashboard/navigation/logout controls are absent before any explicit reload. Reload and direct protected-route navigation are then tested separately. The tests execute in desktop Chromium and mobile Chrome.

Final local verification:

| Command | Exit | Result |
|---|---|---|
| `npm run type-check` | 0 | Passed |
| `npm run lint` | 0 | Passed, no findings |
| `npm test` | 0 | 244 passed, 42 intentionally skipped |
| `npm run test:integration:live` | 0 | 43 passed, 0 skipped; zero fixture residue |
| `npm run test:e2e` | 0 | 27 passed, 3 intentionally skipped; both immediate-Back cases passed on desktop/mobile, zero fixture residue, zero Pawpaw server processes |
| `npm run build` | 0 | Next.js 16.2.10 production build passed; protected pages dynamic and both login pages static |
| `npx supabase migration list` | 0 | Eight Pawpaw versions remain aligned; the same five documented shared-project versions remain remote-only; no mutation run |
| `git diff --check` | 0 | No whitespace errors; Windows line-ending warnings only |

Code-identical production candidate deployment `dpl_78VfHsWcriZNt2554JuC9YLjoEkq` reached `READY` and was aliased to `pawpaw-lemon.vercel.app`. All 18 production authentication-boundary cases passed across desktop and mobile. Both real logout controls produced POST -> 303 -> GET/200; immediate Back before reload exposed neither private surface nor protected controls; reload and direct protected navigation remained blocked. Protected production responses included `private, no-store`; login responses did not. Temporary users/allowlist rows and all other fixture categories returned to zero. Deployment-scoped logs recorded four logout POSTs with 303, no 405, no 5xx, and no error/fatal entries. The admin login page had no console warning/error; the family login page had only the existing missing `favicon.ico` 404 and no application/runtime error. No permanent content, migration, shared-Supabase object, domain, dependency, secret, Release 2 feature, or unrelated application was changed. The final Git-integrated deployment and exact commit SHA are verified after this commit is pushed.

### 3.10 Natural family-history correction (18 July 2026)

Sujith's subsequent real production test superseded the synthetic/automated conclusion in Section 3.9: commit `3ac6a6c1296f92667d54597efd622175480bbc35` fixed the Admin Back behaviour, but one natural Back after family Leave could still make the private family Home visible. Admin remains passing and was not modified in this correction. Phase 1 was reopened only for the family logout-history privacy boundary.

Route ownership was verified rather than assumed. Next's generated route manifest maps `/(archive)/page` to production `/`; the compiled server chunk contains `src/app/(archive)/layout.tsx`, `PrivateHistoryGuard`, and `data-private-surface="family"`. Therefore, the archive layout does wrap the real family page. The guard was not placed in an unused route.

Natural local and production-safe derived-session instrumentation recorded the failing design before this correction:

| Evidence | Result |
|---|---|
| URL before Leave | `/` |
| URL after Leave | `/family-login` after POST -> 303 -> GET/200 |
| URL after automated Back handling completed | `/family-login` |
| private response cache header | production `private, no-cache, no-store, max-age=0, must-revalidate`; local dev `no-cache, must-revalidate` |
| navigation / BFCache | history traversal; `pageshow.persisted = false` |
| private DOM and guard | family wrapper and guard script both present in the private document |
| lifecycle | submit/pagehide applied `data-pawpaw-private-hidden`; pagehide handlers ran; viewer cookie was absent after logout |
| Back network | Back initiated `/`; guard revalidation then requested `/family-login` |
| replace evidence | the immediate inspection context was destroyed by the guard-triggered navigation |

Because the viewer cookie was absent, any private family DOM seen after Back could not be newly authenticated server output; it was the old private history document becoming paintable before the reactive guard completed its replacement navigation. The exact family-only root cause was therefore not missing route ownership, missing cache headers, BFCache, or newly authorized output. It was that the implementation left the private family document in browser history and depended on restored HTML/lifecycle JavaScript running before the browser displayed it. Chromium automation completed that reaction quickly enough to appear safe; Sujith's browser exposed the timing window. Admin's real flow remained safe, while the family login and private Home are separate route-layout documents and retained the vulnerable private history entry.

Family-only correction:

- the real Leave form still targets the POST-only `/logout/viewer` handler;
- the hydrated control performs that POST with same-origin credentials, follows the existing 303, verifies the final same-origin `/family-login` GET/200 response, and then uses `window.location.replace('/family-login')`;
- replacing the current navigation removes the private Home entry, so one Back returns to the earlier family-login document and never starts a request for `/`;
- the private document is hidden synchronously while logout runs;
- if fetch is unavailable or the response is unexpected, the unchanged native form POST is submitted as the fallback while the private document remains hidden;
- the existing no-store header and history guard remain defence in depth; Admin code and shared guard code are unchanged.

The corrected E2E starts naturally at `/family-login`, establishes only a production-safe derived viewer session, loads the real `/`, clicks the actual Leave control, proves POST 303 and GET 200, marks the post-logout lifecycle, presses Back exactly once, and immediately proves all of the following before reload: URL remains `/family-login`; no `/` request occurred; no visible family wrapper was observed; private headings/text/images and Leave are absent; and the passphrase form is visible. Reload and direct `/` navigation are verified separately. The same test runs in desktop Chromium and mobile Chrome. The existing Admin regression remains unchanged and passed in both projects.

Final local verification for this correction:

| Command | Exit | Result |
|---|---|---|
| `npm run type-check` | 0 | Passed |
| `npm run lint` | 0 | Passed, no findings |
| `npm test` | 0 | 244 passed, 42 intentionally skipped |
| `npm run test:integration:live` | 0 | 43 passed, 0 skipped; zero fixture residue |
| `npm run test:e2e` | 0 | 27 passed, 3 intentionally skipped; natural family and unchanged Admin logout passed on desktop/mobile; zero fixture residue and zero Pawpaw server processes |
| `npm run build` | 0 | Next.js 16.2.10 production build passed; `/` dynamic and both login pages static |

No dependency, migration, Supabase structure, permanent content, QtPi/Paru state, domain, secret, Release 2 feature, or unrelated UI changed.

### 3.11 Release 2 design-foundation milestone (18 July 2026)

Release 2 is authorized and opened with a documentation-only milestone:

- `docs/PRODUCT_PHILOSOPHY.md` defines Pawpaw as Varada's private, long-lived family archive and publishing system, including privacy, truth, dignity, childhood protection, family voice, anti-social-media rules, AI truth boundaries, and feature decision tests.
- `docs/DESIGN_SYSTEM.md` defines implementation-ready visual, typography, colour, layout, responsive, component, photography, motion, and accessibility rules. It also records a code-based audit of family login, family Home, Admin login, Dashboard, Content Library, Media Library, and Home editor.
- `README.md` records the canonical production domain, Wix DNS arrangement, Vercel host/project, legacy fallback URL, and current Release 2 approval gate.
- No application source, CSS, component, route, dependency, migration, authentication, Supabase, DNS, Vercel configuration, QtPi, or Paru Health change occurred.
- No manual test is required or requested. The formal manual-test count remains 3 of 3.

**Approval gate:** UI implementation must not begin until Sujith reviews and approves both foundation documents. Approval authorizes design implementation planning only; stories, letters, galleries, timeline, new routes, and new features remain separate decisions.

Production closure: Git-integrated deployment `dpl_GKk3Ye7kra4CHXs88dMXkS6g6RF9` reached `READY`, records exact fix SHA `c5ce42e7655a54a3f9b36c5116226f356ffd64b6`, and serves the production alias. The same natural family test passed on desktop and mobile: Leave produced POST 303 followed by GET 200; one immediate Back remained on `/family-login`; no request for `/` occurred; no family wrapper, title/text/image, or Leave control was present or observed visible; and the passphrase form remained visible. Reload and direct `/` navigation remained blocked. The unchanged Admin regression also passed on desktop and mobile. Production fixtures started and ended at zero. Deployment-scoped logs recorded both viewer and Admin logout POSTs as 303 and contained no 405, 5xx, error, or fatal entry. The family production blocker is closed.

### 3.12 Independent design-audit identity reconciliation (19 July 2026)

**Audit verdict:** Pawpaw is **not ready for UI implementation**. The audit confirmed an identity split: the original playful `PROJECT_BRIEF.md` is the emotional authority, while the prior quieter visual translation in subordinate Release 2 documents is rejected.

- Sujith selected **Direction B-led with selected Direction C energy**: a cinematic illustrated storybook of Varada's real life, built on truthful photographs, chapter structure, chronology, authorship, and family voices; animated by vivid controlled colour, humour, expressive characters, contemporary energy, and newborn baby-girlish personality.
- The direction-selection blocker is resolved. This is not a 50/50 hybrid, quiet/editorial-only, cream-and-ink-only, or generic baby-site direction.
- The current bounded task is the `docs/PRODUCT_PHILOSOPHY.md` correction. `docs/DESIGN_SYSTEM.md` remains unapproved and must not govern UI implementation yet.
- UI implementation remains blocked. No stories, letters, gallery, moments, timeline, new route, or other feature is authorised.
- No manual test is requested, and a fourth formal manual-test round is not authorised.

**Exact next gate — typography visual test:** Fraunces + Manrope is the first candidate only, not a decided or approved pairing. Test it against one real Varada photograph with “Varada” at 72px, real English family prose, and real Malayalam text or a name where available, rendered on desktop and at 375px mobile. Sujith must approve or reject the actual visual result before any UI implementation can proceed.

---

## 4. Completed major milestone — Phase 1 private Home flow

**Status:** COMPLETE — declared Dashboard, Content Library, Media Library, Home editor, private media, and family Home requirements are implemented and verified
**Manual test required now:** No — Round 3 completed with all checks passed; no further manual testing is authorized
**Formal manual round:** 3 of 3 used

### 4.1 Admin dashboard

Build `/admin` as a real dashboard with:

- Home page;
- Drafts;
- Published;
- Recently updated;
- Media Library;
- clear admin navigation;
- roomy premium cards;
- content type;
- status;
- updated timestamp;
- published timestamp;
- media count;
- first-image or cover thumbnail;
- chronological ordering;
- search;
- status filters;
- content-type filters;
- responsive desktop and mobile navigation.

### 4.2 Content library

Build `/admin/content`:

- all `content_items`;
- separate draft and published views or filters;
- chronological cards;
- type labels;
- search by title;
- clear empty states;
- clicking an item opens its editor;
- existing Home content remains a special singleton;
- reopening Home restores saved content;
- Create New must either open a genuinely blank supported editor or present a clear disabled Release 2 state without false functionality; Phase 1 uses the disabled Release 2 decision documented in Section 3.6;
- unsupported public content types must not be presented as fully live.

### 4.3 Media Library

Build `/admin/media`:

- list all media owned by the active admin;
- attached and unattached views;
- signed thumbnails;
- alt text;
- caption;
- MIME type;
- byte size;
- creation date;
- attachment count;
- attached content titles;
- search;
- image-type filter;
- newest/oldest sorting;
- edit alt and caption;
- attach or reattach to Home;
- inspect usage;
- permanent delete with correct confirmation.

Rename:

- current `Remove from Home (keep file)`
- to `Move to Media Library`

Required meaning:

- remove only `content_media`;
- preserve `media_assets`;
- preserve private Storage object;
- show immediately in Media Library → Unattached;
- allow reattachment later.

No media may disappear into an inaccessible backend state.

### 4.4 Premium UI system

Create/update `docs/DESIGN_SYSTEM.md`.

Apply the design system to:

- `/admin`;
- `/admin/content`;
- `/admin/media`;
- `/admin/home`;
- content cards;
- media cards;
- family carousel frame.

Replace the flat image-background colour with:

- softened palette-derived gradients;
- optional blurred image background;
- translucent neutral overlay;
- sharp contained image above;
- good contrast;
- reduced-motion support;
- no heavyweight animation or canvas dependency.

---

## 5. Phase 1 blocker-remediation work

This remediation started from clean commit `a5efaaf89edba59f27478b8d56ed101bcfad46f6`. Scope was limited to the independently reported merge blockers and important pre-merge findings. PR #2 was not altered, merged, or deployed.

Root causes and closures:

- **Viewer cookie fail-closed:** proxy code accepted an empty-string secret fallback and viewer-auth configuration lacked central validation. `src/lib/env.ts`, `src/lib/auth/viewer-cookie.ts`, and `src/proxy.ts` now reject missing, empty, weak, or invalid configuration without logging secret values; valid signed/versioned cookies continue to work.
- **Test isolation and cleanup:** fixtures used timestamp-only legacy names, cleanup was suite-local, and the global cleanup process could not see live environment values. Live tests now use a run-scoped `pawpaw-test-*` ID plus fixture metadata, reconcile only conclusively tagged Pawpaw fixtures before and after the suite, paginate Auth users, and remove related content, associations, media, Storage objects, allowlist rows, and Auth users. The first effective reconciliation found 4 legacy Pawpaw users and ended at zero; subsequent residue checks are zero.
- **Final cleanup hardening:** shared cleanup now fails on every database, Storage, Auth, exact-count, and Home-restoration error. It reconciles before and after both live integration and Playwright, counts associations and throttle rows, and scans real Home/admin owner folders while deleting only exact `pawpaw-test-*` object names. Current pre/post counts are zero for users, content, media, associations, Storage objects, and throttle rows.
- **Windows E2E server lifecycle:** Playwright could leave a Pawpaw Next.js server after completion. `scripts/run-e2e.mjs` runs Playwright, terminates only command lines verified as this repository's Next dev/start server, and fails unless the post-run count is zero. `reuseExistingServer` is disabled.
- **Home singleton and mutation safety:** Home mutations trusted a client ID and did not prove affected rows. Migration `20260717102121` adds the singleton index; server code resolves canonical `type='home'`/`slug='home'`, rejects mismatched IDs, checks returned rows, preserves Home content during unpublish, and distinguishes query errors from a genuine empty state.
- **Atomic throttling:** read/increment/upsert could lose concurrent failures and datastore errors were not conservative. Migration `20260717102121` adds one atomic database function restricted to service role; login denies when throttle reads/writes/clears fail. A 10-way live concurrent test proves threshold blocking.
- **Owner-scoped media:** earlier active-admin rules did not consistently enforce record/path ownership. Migration `20260717102133` aligns table and Storage policies and adds ownership-checking RPCs. Server actions verify the active admin and canonical owned Home; two-admin live tests prove cross-owner update, attach, reorder, detach, and delete denial.
- **Image-byte verification:** finalization trusted reported MIME/metadata. Existing `sharp` now decodes the uploaded bytes, verifies actual format and dimensions, and rejects/removes truncated, mislabeled, or header-only data before registration.
- **Transactional media operations:** max-plus-one append, multi-step reorder, and relational deletion were race-prone; orphan listing stopped at 100. Database RPCs serialize append/reorder and atomically delete relations, Storage deletion failures are explicit, and orphan cleanup now lists before deleting with a 1,000-object scan cap and 100-object delete batches so deletion cannot invalidate later offsets.
- **False-positive tests:** anonymous denial, protected response headers, and carousel assertions could pass without proving behavior. Tests now branch only between explicit permission denial and an empty result, inspect the real protected response, seed deterministic media, and require controls/dots on desktop and mobile.
- **Node runtime floor:** `package.json` and README now require Node `>=20.9.0`, matching Next.js 16; no dependency was broadly upgraded and the installed Node version was not changed.

Files in this checkpoint:

- Runtime/config: `package.json`, `package-lock.json`, `playwright.config.ts`, `vitest.config.ts`, `scripts/run-e2e.mjs`.
- Viewer/login: `src/proxy.ts`, `src/lib/env.ts`, `src/lib/auth/viewer-cookie.ts`, `src/lib/auth/throttle.ts`, `src/app/family-login/actions.ts`.
- Home: `src/lib/content/home.ts`, `src/lib/content/manage-home.ts`, `src/app/admin/home/actions.ts`, `src/app/admin/home/home-editor.tsx`, `src/app/admin/home/page.tsx`.
- Media: `src/lib/media/finalize-upload.ts`, `src/lib/media/image-metadata.ts`, `src/lib/media/manage-media.ts`, `src/lib/media/orphan-sweep.ts`, `src/app/admin/media/actions.ts`.
- Migrations: `supabase/migrations/20260717102121_phase1_security_hardening.sql`, `supabase/migrations/20260717102133_owner_scoped_atomic_media.sql`.
- Tests: `tests/e2e/auth-boundaries.spec.ts`, `tests/e2e/global-cleanup.ts`, `tests/e2e/home-flow.spec.ts`, `tests/integration/admin-function-security.test.ts`, `tests/integration/direct-upload.test.ts`, `tests/integration/fixture-names.ts`, `tests/integration/global-fixtures.ts`, `tests/integration/home-content-save.test.ts`, `tests/integration/media-management.test.ts`, `tests/integration/publication-boundary.test.ts`, `tests/integration/throttle-live.test.ts`, `tests/support/fixture-cleanup.ts`, `tests/unit/fixture-cleanup.test.ts`, `tests/unit/manage-home.test.ts`, `tests/unit/manage-media.test.ts`, `tests/unit/media-library.test.ts`, `tests/unit/orphan-sweep.test.ts`, `tests/unit/throttle.test.ts`, `tests/unit/viewer-cookie.test.ts`.
- Documentation: `README.md`, `docs/PROJECT_STATUS.md`.

No new package was added. `sharp` was already installed. No Paru Health or qtpi data, policies, or migrations were modified. Manual testing remains closed at 3/3.

---

## 6. Manual acceptance record

### Policy status

- Formal consolidated manual rounds used: **3 of 3**
- Formal consolidated manual rounds remaining: **0**
- Manual Test Round 2: **failed and consumed** — its published-Home finding is now verified and hardened (see Section 3.6)
- Manual Test Round 3: **completed — every item passed**
- Failed, unclear, or untested Round 3 items: **none**
- Phase 1 manual acceptance: **complete**
- Further manual testing: **not authorized unless Sujith explicitly requests it later**

### Manual Test Round 3 — completed scope

Sujith confirmed that the following consolidated browser scope was fully tested and passed:

#### Family access

- incorrect passphrase rejected;
- correct passphrase accepted;
- viewer logout from empty state;
- viewer logout from published state;
- protected page inaccessible after logout.

#### Admin dashboard

- dashboard sections render correctly;
- navigation works;
- active section is clear;
- desktop and mobile layouts are readable;
- no horizontal overflow;
- cards are chronological and type/status labels are accurate.

#### Content library

- Home singleton restores saved state;
- Create New remains clearly disabled for Release 2 and never opens or overwrites Home;
- drafts and published views are separate and accurate;
- title search works;
- type filter works;
- chronological ordering works;
- unsupported public types are clearly labelled.

#### Home editing

- Save draft;
- Publish;
- Unpublish;
- plain text conversion;
- Advanced JSON preservation;
- family page changes after refresh.

#### Upload

- 1–8 MB JPEG/PNG/WebP succeeds;
- upload goes directly to Supabase;
- over-8 MB rejection;
- wrong MIME rejection;
- network failure preserves form values;
- admin UI refreshes immediately.

#### Media Library

- uploaded media appears;
- attached/unattached filters work;
- Move to Media Library makes item unattached and visible;
- reattach to Home;
- edit alt and caption;
- usage list accurate;
- deletion confirmation;
- permanent deletion;
- other media unaffected.

#### Carousel and family UI

- portrait image;
- landscape image;
- square image;
- full image visible;
- no cropping;
- no stretch;
- no overflow;
- caption visible;
- alt text not visibly duplicated;
- arrows;
- dots;
- swipe;
- keyboard;
- mobile presentation;
- premium background treatment.

#### Security sanity

- no raw secrets in browser;
- private signed image URLs;
- no public bucket URL;
- no raw database errors;
- non-admin paths remain blocked.

### Policy after Round 3

The third and final formal manual-testing round is complete. From this point:

- do not request another manual test;
- add every new observation to Section 8;
- prioritize security/data-loss blockers for automated fixes;
- defer non-blocking visual or workflow findings to the next planned release unless the user explicitly requests another manual round.

---

## 7. Automated verification register

Completed on 17 July 2026 for the published Home closure; retain these commands for the next milestone:

```powershell
npm run type-check
npm run lint
npm test
npm run test:integration:live
npm run test:e2e
npm run build
git diff --check
git diff --stat
git status --short
```

Also verify:

```powershell
npx supabase migration list
npx supabase db advisors --linked
```

Expected:

- Pawpaw migrations through `20260717102133` remain present on both sides; unrelated remote-only qtpi/Paru history is documented rather than imported;
- no Pawpaw-specific advisor warning; the leaked-password, Paru public-listing, and qtpi public-listing warnings are accepted and tracked separately;
- no `next-env.d.ts` change in the final diff; `next build` regenerated it and the generated change was restored;
- no secret files tracked;
- no skipped live integration tests;
- every skipped E2E test explicitly identified.

### Current package scripts (verified 17 July 2026)

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "type-check": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:integration:live": "vitest run --mode live tests/integration",
  "test:e2e": "node scripts/run-e2e.mjs"
}
```

### Current test directories (verified 16 July 2026)

```
tests/
  e2e/
  integration/
  unit/
  setup.ts
```

---

## 8. Pending issues and product decisions

### P0 — release blockers

- **RESOLVED BY RECLASSIFICATION — shared migration history:** remote-only `20260716231532` belongs to Paru Health; `20260716235504`, `20260717040149`, `20260717091207`, and `20260717091406` belong to qtpi tracker. Their SQL touches only `paru-health-assets`, `public.qtpi_feeds`, or `qtpi-assets`, with no Pawpaw-object reference. They are accepted shared-project history, not Pawpaw blockers. Pawpaw migrations are aligned locally/remotely through `20260717102133`; no shared-app history was repaired or imported.
- **RESOLVED BY RECLASSIFICATION — Paru Health public bucket:** `paru-health-assets` and policies `paru_assets_public_read` / `paru_assets_anon_insert` are explicitly bucket-scoped to Paru Health. Pawpaw source, migrations, tests, and database media records use the separate private `media` bucket only. The Paru public/anonymous-upload posture remains a Paru-specific security warning for that app's owner to review; Pawpaw does not modify it and is not blocked by it.
- **RESOLVED BY RECLASSIFICATION — qtpi public bucket:** the `qtpi-assets` listing advisor warning is scoped to qtpi's bucket and read policy. It grants no access to Pawpaw's private `media` bucket or owner paths, so Pawpaw records it without modifying qtpi state.
- ~~Complete Admin Dashboard requirements in Section 4.1.~~ **DONE** — timestamps, exact media usage, first signed thumbnail, search, combined filters, deterministic ordering, ownership scope, and explicit query errors implemented.
- ~~Complete Content Library requirements in Section 4.2.~~ **DONE** — case-insensitive title search, combined filters, deterministic ordering, clear/no-results/error states, and disabled Release 2 Create New decision implemented without a second Home action.
- ~~Complete Media Library requirements in Section 4.3.~~ **DONE** — creation metadata, safe filename, accurate usage titles/counts, cross-field search, MIME/attachment filters, deterministic newest/oldest sorting, and explicit query errors implemented.
- ~~Ensure detached media remains visible and reusable.~~ **DONE** — "Move to Media Library" detaches only content_media row; asset and Storage object survive; media appears in /admin/media
- ~~Re-run complete automated verification after integration.~~ **DONE** — all required commands exit 0: type-check, full `eslint .`, `npm test` (244 passed, 42 skipped), `test:integration:live` (43 passed, 0 skipped), `test:e2e` (21 passed, 3 expected skips), build (12 routes), zero fixture residue, and zero Pawpaw server processes.
- ~~Fix deletion-invalidated orphan pagination.~~ **DONE** — each sweep lists up to 1,000 objects before removing candidates in 100-object batches; a mutable 150-orphan test proves every eligible object is visited and removed.
- ~~Make cleanup fail loudly and reconcile E2E residue.~~ **DONE** — live integration and Playwright run idempotent pre/post reconciliation; exact-count, database, Storage, Auth, Home-restoration, association, object, and throttle failures are surfaced. Current residue is users 0, content 0, media 0, associations 0, objects 0, throttle 0.
- ~~Document a working shared-Supabase migration procedure.~~ **DONE** — README records the tested CLI limitation and the controlled project-scoped `apply_migration` alternative used for migrations 7 and 8, with read-only history verification and explicit prohibitions on shared-history repair/import.
- ~~Synchronize canonical status and PR #2 description.~~ **DONE** — current counts, eight Pawpaw migrations, five remote-only shared migrations, three accepted advisor warnings, Manual Test Round 3 at 3/3 passed, and production Vercel unverified are recorded without claiming plain linked `db push` works.
- ~~Diagnose and stabilize Tinypool crash and ESLint crash.~~ **DONE** — crashes were transient; `pool: 'forks'` made explicit in vitest.config.ts; root causes documented in Section 3.6
- ~~Conduct Manual Test Round 2.~~ **DONE — Round 2 failed and consumed.** Five defects confirmed and fixed (17 Jul 2026):
  - **BLOCKER 1 fixed** — Media Library showed 0 files. Root cause: `content_media(id)` in PostgREST embed; `content_media` has no `id` column (composite PK only). Fixed in `src/app/admin/media/page.tsx` and `src/app/admin/media/actions.ts`. Client refactored to Attached/Unattached sections.
  - **BLOCKER 2 fixed and proven closed** — Published Home could be misclassified as empty because the route required at least one resolved carousel item, and the loader returned `null` for both a query error and no row. The loader now has distinct published/empty/error states, validates content, detects duplicates, and degrades media independently. Live and route-level proof is in Section 3.6. The historical Round 2 browser state was not captured, so it is not classified as proven browser cache or proven pre-publish state.
  - **BLOCKER 3 fixed** — Upload/publish workflow unclear. Fixed: upload success message in `upload-form.tsx` now explains that family visibility requires publishing Home. Guidance note added near Attached photos in `home/page.tsx`.
  - **IMPORTANT 1 fixed** — Dashboard stat cards were decorative. Fixed in `src/app/admin/page.tsx`: cards are now `<a>` links to `/admin/content?status=draft`, `/admin/content?status=published`, `/admin/media`. Media count now scoped to `created_by = admin.id`.
  - **IMPORTANT 2 fixed** — Content Library had duplicate "Edit Home page" header link plus per-row "Open editor →". Removed header link from `src/app/admin/content/page.tsx`; per-row link retained as the single entry point.
- 13 earlier regression assertions remain across `admin-dashboard.test.ts`, `content-library.test.ts`, `media-library.test.ts`, and `ui-acceptance.test.ts`.
- Published Home closure adds 7 deterministic loader cases, 1 live loader case, and 1 real authenticated route lifecycle case.
- ~~Conduct Manual Test Round 3.~~ **DONE — all checks passed.** No failed, unclear, or untested items remain; formal rounds used are 3/3 and Phase 1 manual acceptance is complete.

### P1 — important

- ~~Apply durable premium design system.~~ **DONE** — `docs/DESIGN_SYSTEM.md` created; premium layered carousel background implemented
- ~~Replace flat palette image backgrounds.~~ **DONE** — blurred bg + overlay + sharp contained image
- ~~Ensure all current uncommitted work is inventoried and preserved.~~ **DONE** — see Section 5
- `00_READ_ME_FIRST.md` was named in the checkpoint request but exists neither in the working tree nor in HEAD. No substitute content was invented; `docs/PROJECT_STATUS.md` remains the explicit canonical source.
- ~~Update PR #2 description and mark it ready for review.~~ **DONE** — the description records the verified Phase 1 scope, checks, shared-Supabase arrangement, Manual Test Round 3 result, and accepted limitations; PR #2 is merged and closed.
- PR #2 remains the accepted Phase 1 scope and does not require a split before review.
- ~~Confirm production Vercel runtime behaviour after deployment.~~ **DONE** — see Section 3.7.

### P2 — later enhancement

- Dedicated editors and public routes for story, gallery, letter, and moment.
- Drag-and-drop media ordering.
- Rich text without raw JSON.
- General reusable-media attachment picker for all content types.
- Realtime family-page updates.
- Scheduled publishing.
- Media bulk actions.
- Image focal-point mode as an optional alternative to contain.
- Automated caption assistance.
- Full media-library pagination as the collection grows.

### Accepted limitations

- The Supabase Free-plan project is shared with qtpi tracker and Paru Health. Pawpaw remains isolated through its own tables, RLS, owner-scoped paths, and private `media` bucket, but unrelated apps' remote migration history and advisor findings appear in the same Supabase project.
- Supabase Free plan lacks leaked-password protection.
- The Paru Health `paru-health-assets` public/anonymous-upload advisor warning remains a separate, bucket-scoped warning and is not changed by Pawpaw.
- The qtpi tracker `qtpi-assets` public-listing advisor warning remains a separate, bucket-scoped warning and is not changed by Pawpaw.
- Family page currently requires refresh to see admin changes.
- Detached media remains visible and reusable in the implemented Media Library core flow.
- Alt text is accessibility metadata and is not a hover tooltip.
- Caption is the visible family-facing description.
- Copied private signed media URLs may remain usable until their short expiry.
- Home is the only editable Phase 1 content type; Create New and editors for story, gallery, letter, and moment remain Release 2 work.
- The default automated suite intentionally skips credential-gated integration cases that are exercised by `npm run test:integration:live`.
- Three E2E cases are intentionally skipped: two family-passphrase cases because the raw passphrase is unavailable to automation, and one mobile duplicate of the live Home mutation lifecycle to avoid racing the shared singleton.
- Admin Back remains verified. The natural family correction, exact Git-integrated deployment, and desktop/mobile production proof are recorded in Section 3.10. Raw household/admin credentials remain unavailable to automation and were not exposed.

---

## 9. Current release decision

**PHASE 1 ACCEPTANCE COMPLETE — the family logout history correction is deployed and production verified; no Pawpaw release blocker remains.**
**PR #2 was merged into `main` through normal GitHub merge commit `93e464f30bdb95975bbac5d9e387a931c509c0ff`.**
**The final independent merge review approved the merged head; post-merge type-check, lint, default tests, and production build passed on `main`.**
**`phase-1-implementation` remains preserved. Phase 1 is production deployed and verified. Release 2 is now open at its documentation-only design-foundation milestone.**
**Manual Test Round 2 failed and remains consumed; its findings were fixed and verified. Manual Test Round 3 completed with all checks passed.** Formal rounds used are **3 of 3**. There are no failed, unclear, or untested Round 3 items. No further manual testing is authorized unless Sujith explicitly requests it later.

Release boundary status after final checkpoint verification:

1. ✓ Admin Dashboard complete with owner-scoped data, signed thumbnails, timestamps, usage count, search, filters, deterministic order, and error state.
2. ✓ Content Library complete for Phase 1; title search and combined filters work, and Create New is honestly disabled until Release 2 without touching Home.
3. ✓ Media Library complete with metadata, usage titles/counts, combined discovery filters, deterministic sorting, and reusable unattached media.
4. ✓ Phase 1 visual conventions documented and applied; Release 2's proposed design system and current-UI audit now supersede any unsupported claim that the existing UI is already premium.
5. ✓ Full application verification suite green — every required command exits 0.
6. ✓ Dashboard stat cards are navigation links; media count is scoped to the active admin.
7. ✓ Upload/publish workflow UI clarity: message and guidance note explain attach versus publish.
8. ✓ Published Home regression covers valid prose/media, degraded media, genuine empty, operational error, publish, fresh repeat, unpublish, and republish.
9. ✓ Pawpaw tables remain RLS-protected; anonymous reads expose zero rows.
10. ✓ Pawpaw `media` bucket is private; paths are owner-scoped; anonymous listing exposes zero objects and known-object download is blocked.
11. ✓ `20260716231532` is Paru Health-only; `20260716235504`, `20260717040149`, `20260717091207`, and `20260717091406` are qtpi-only; none changes Pawpaw objects.
12. ✓ `paru-health-assets` policies are bucket-scoped and grant no access to Pawpaw's `media` bucket or paths.
13. ✓ `next-env.d.ts` was restored after build and has no diff; no secret file is tracked.
14. ✓ Manual Test Round 3 completed with every check passed; formal rounds used are 3/3 and Phase 1 manual acceptance is complete.
15. ✓ **Release decision:** Phase 1 is merged into `main`; both Admin and natural family logout history are production verified. Release 2 design foundation is documented, with UI implementation blocked pending Sujith's approval of both foundation documents.
16. ✓ Canonical production is `https://www.heyvarada.in`; Wix hosts registrar/DNS, the apex redirects to `www`, Vercel project `pawpaw` hosts the application, and `https://pawpaw-lemon.vercel.app` remains the legacy/fallback URL.
17. ✓ No coding, UI, CSS, component, route, dependency, migration, authentication, data, DNS, hosting-configuration, or cross-application change occurred in the design-foundation milestone.
18. ✓ No manual testing is required or requested for this documentation-only milestone. The exact next action is Sujith's review of `docs/PRODUCT_PHILOSOPHY.md` and `docs/DESIGN_SYSTEM.md`.

---

## 10. Required update format for future Claude runs

Every implementation prompt must read this file first.

Before returning, Claude must update this file with:

- status date;
- current committed head;
- exact working-tree inventory;
- completed tasks;
- current tasks;
- pending tasks;
- blockers;
- test counts;
- skipped tests;
- migration state;
- manual-test round status;
- newly discovered issues;
- next major milestone;
- whether manual testing is required now.

## Non-negotiable Pawpaw quality gate

Pawpaw is Varada’s website. Design quality is not approved through compromise scoring.

No product philosophy, design system, visual direction, component system, visual prototype, or UI implementation may advance while any relevant assessed category is below the project’s required excellence standard.

For audit scoring:

- 10/10 means exceptional, distinctive, coherent, evidenced, implementable, accessible, and explicitly approved by Sujith.
- Anything below 10/10 means the area remains unfinished.
- “Approve with revisions,” “good enough,” “tasteful,” “professional,” “industry standard,” or a high average score does not satisfy this gate.
- Strong scores in privacy, scope control, or documentation cannot compensate for weak distinctiveness, typography, colour, illustration, components, motion, emotional coherence, or visual execution.
- Scores must not be inflated. Every 10/10 requires concrete evidence, including visual proof where the category is visual.
- Documentation alone cannot establish a 10/10 visual score.
- UI coding must not begin until the selected visual direction and its required proof are approved by Sujith.
- Sujith may explicitly override this gate, but no agent may silently lower it for convenience, speed, cost, or implementation simplicity.

The objective is not perfection through endless documentation. The objective is an unmistakably Pawpaw result: childlike imagination with adult-level art direction, backed by visual evidence.

Claude's report must state:

```text
PROJECT_STATUS.md updated: yes/no
Manual testing requested: yes/no
Formal manual-test round: 1/3, 2/3, or 3/3
Reason manual testing is or is not required:
```

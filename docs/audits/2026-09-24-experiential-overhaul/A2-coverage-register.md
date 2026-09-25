# A2 — Coverage register

[← Owner report](00-owner-report.md)

Status values: **Pass** · **Fail** · **Blocked** (a named reason prevented it) · **Not tested** (possible, not done) · **N/A** (with a reason) · **Unknown**. They are never merged. "Covered" means inspected with the method stated.

## Summary counts

| Dimension | Denominator (what counts) | Covered | Notes |
|---|---|---|---|
| Tracked first-party files | 266 files at `9acc56e` (including `package-lock.json`) | 265 inspected or mapped; the lockfile is inventoried only | See §1 |
| Substantive first-party documents | 12 canonical docs + 29 governance files + 1 visual-proof README = 42 | 42 opened. **8 read in full**, 4 long historical docs read by section (listed), 29 governance files read in summary (every task outcome and result, with non-pass items extracted) | §1.1 |
| Family routes (route definitions) | 7 page routes (`/family-login`, `/`, `/first-days`, `/chapters`, `/chapters/[slug]`, not-found, offline page) + 2 system states (loading, error) | 6 Observed live; the offline page was read in source only (a real offline cycle was **Not tested**); loading seen only transiently plus source; error **Not tested** (cannot be forced in production) | §2 |
| Admin routes *(note: the first admin crawl opened every collapsible panel before recording, to expose all copy; the editor height was re-measured in its normal state on 24 Sep and is unchanged, `data/editor-height.json`)* | 10 page routes (`/admin/login`, `/admin`, `/admin/content`, `/admin/content/new`, `/admin/content/[id]` ×5 steps, `/admin/content/[id]/preview`, `/admin/media`, `/admin/home`, admin not-found) | 10 Observed | §2 |
| Published content items | 3 (Home, First Days, The Day You Arrived) | 3/3 read in full, rendered at 4 widths | §3 |
| Draft content items | 2 (both test debris) | 2/2 opened read-only in the editor (all steps) | F-10 |
| Published photographs | 20 | 20/20 inspected full-size | [A6](A6-assets.md) |
| Unattached library photos | 12 | Thumbnails and titles only (not reviewed individually) | F-10 |
| Videos | 1 attached to the letter | Player loading, layout at 390/1440, no-autoplay and link expiry **Observed** (after you allowed the video hosts). **Playback Unverified**: this Chromium has no H.264 decoder | §5, F-02, F-26 |
| Illustrations / icons / proof images | 9 / 6 / 11 | All inspected | [A6](A6-assets.md) |
| Roles | Unauthenticated, family viewer, admin | 3/3 | Second admin (Paru): **Not tested** (no second login) |
| Viewports | 360×780, 390×844, 768×1024, 1440×900 (+ landscape 844×390, and a reflow check at 720 CSS px, DPR 2: the layout Chrome gives a 1440 window at 200% zoom. Text-only zoom **Not tested**) | Family: all 6 routes × 4 widths. Admin: 13 routes × 4 widths plus 4 items × 6 views at 390/1440 | §4 |
| Browsers | Chromium, Firefox, WebKit, real iPhone Safari, real Android Chrome | **Chromium 1194 only.** Firefox and WebKit are not installed; real devices are not available | §5 |

## 1. First-party files by group

| Group | Files | Method | Maps to visible or behavioural effect | Status |
|---|---|---|---|---|
| `AGENTS.md`, `CLAUDE_PROJECT_INSTRUCTIONS.md`, `README.md`, `PROJECT_BRIEF.md`, `docs/PRODUCT_PHILOSOPHY.md`, `docs/DESIGN_SYSTEM.md`, `docs/visual-proof/README.md` | 7 | Read in full | Rules reconciled in A1 | Covered |
| `docs/PROJECT_STATUS.md` | 1 | §1–2, §3.11–3.20, §8–10 read in full. §3.1–3.10 and §4–7 (Phase 1 procedural records, July) read by heading | Stale state recorded in A1 | Covered (partial read, stated) |
| `docs/PENDING_REQUIREMENTS.md` | 1 | Read in full | PR-003/004/011 statuses stale; PR-007–010 (character expansion) conflict with the recommendation to retire characters | Covered |
| `PHASE_1_IMPLEMENTATION_DECLARATION.md`, `RELEASE_2_UI_IMPLEMENTATION_DECLARATION.md` | 2 | Headings plus the §12–14 contracts (ambient colour, motion, character finding) | Historical; superseded by the live code | Covered by section |
| `.build-governance/` tasks (17), results (11), ledger (1), baseline (1) | 30 | Every task's outcome and status; every result's verdict and non-pass criteria; journey-build task and result read in full | Open items listed in A1 rows 15, 19, 20 | Covered (summary) |
| `docs/visual-proof/*.png/pdf` | 11 | Viewed | Source of the current look (A6 §4) | Covered |
| `src/app/**` (routes, layouts, actions, CSS modules, manifest, robots, icons) | 51 | Every route, action and layout read. CSS modules read where a finding needed them (home, family-login, carousel, chapter-renderer, admin) | Findings F-01…F-20, D-01…D-06 | Covered |
| `src/components/**` | 21 | TSX read in full; CSS where relevant | Carousel, Leave, history guard, PWA controls, chapter renderer, block editor, admin nav | Covered |
| `src/lib/**` | 32 | Auth, media (signing, upload, palette, ambient), content loaders and validation, video read. Supabase client wrappers and `library-view` read as needed | F-01, F-02, F-05, F-19, F-23 | Covered |
| `src/assets/varada/*` | 6 | Viewed | D-02 | Covered |
| `src/proxy.ts` | 1 | Read | Private headers, gate | Covered |
| `public/*` (service worker, offline page, icons, illustrations) | 8 | Read or viewed | Offline copy, caching (safe: no private caching) | Covered |
| `supabase/migrations` (15), `supabase/tests` (3), `seed.sql`, `config.toml` | 20 | Filenames plus the relevant schema (content, revisions, media, video, scenes) through the code that uses it | The data model behind the editor (F-03, F-05) | Mapped, not audited line by line (no schema change proposed except Stage 1 derivatives) |
| `tests/**` | 59 | Inventoried. Setup and cleanup read to decide whether running them is safe | Integration and several E2E suites **create and delete remote users, content and objects**, so they were not run | Mapped |
| `scripts/*` | 3 | Read (`run-e2e.mjs`), names for the others | — | Mapped |
| Config (`next.config.ts`, `package.json`, `tsconfig`, `eslint`, `postcss`, 3 Playwright configs, `vitest`, `.env.example`, `.gitignore`, `next-env.d.ts`) | 13 | Read where relevant. **No environment values read** | Deps: Next 16.3.0, React 19, Supabase, sharp, tus, zod | Covered |
| `package-lock.json` | 1 | Inventoried as vendor metadata | — | N/A (generated) |
| `node_modules`, `.next` | — | Not present in this clone | — | N/A |

## 2. Routes × role × state

| Route | Unauth | Family | Admin | States observed | Result |
|---|---|---|---|---|---|
| `/family-login` | Observed ×4 widths | — | — | default; empty-submit (native validation fires); successful login; deep-link return (**lost**, F-06) | Pass except F-06, F-17 contrast |
| `/` Home | → login (Observed) | Observed ×4 + landscape + 720 px reflow | Admin session (no viewer cookie) → allowed by proxy (Code) | all 6 slides at 4 widths (**corrected 24 Sep:** the first crawl's fixed 900 ms wait recorded slides 3 and 5 as the previous photo, so two Home photos were never captured as displayed. Re-captured waiting for each slide, `data/carousel-recheck.json`, `family/home-slide*-recheck.png`: 6 distinct photos at every width; screenshots taken after the 520 ms reveal animation finishes, since the earlier re-capture caught photos mid-fade); keyboard; arrows; reduced motion; **idle: works at 4 min, Next stuck at 6 min** (F-02, re-tested 24 Sep) | **Fail** (F-01, F-02) |
| `/first-days` | → login | Observed ×4 + 720 px reflow | — | lazy load; **idle then scroll: 2 of 10 images broken** (F-02); repeat visit re-downloads every photo (Observed 24 Sep); Back restore **fails** (F-07) | **Fail** |
| `/chapters` | → login | Observed ×4 | — | 1 item | Pass (content gap F-15) |
| `/chapters/the-day-you-arrived` | → login | Observed ×4 + 720 px reflow | Preview Observed | video player loads, no autoplay; link **401 after 330 s** (F-02); player outside the text column at 1440 (F-26); **overflow 72 px at 768 and 720 px reflow** (F-16); no `<main>` (Code). Story photos after idle: the first run's selector counted **0 of 0** (no `<main>`); re-tested 24 Sep with `figure img` (`data/recheck.json`) | **Fail** (F-02, F-16, F-26) |
| `/chapters/<unknown>` | → login | Observed: not-found content with **HTTP 200** | — | soft 404 | Fail (F-18) |
| `/no-such-page` | → login (proxy) | Observed 404 | Observed at `/admin/nope`: family 404 shown | no nav, no Leave | Fail (F-18) |
| Leave (`POST /logout/viewer`) | — | Observed: lands on login; **label "Leavingâ€¦"**; Back after Leave shows login (pass) | — | | Fail (F-08) / privacy pass |
| Offline page / service worker | — | Source read; SW caches only `/offline.html`, icons, `/_next/static` (safe) | — | Real offline cycle **Not tested** | Unknown (behaviour) / Pass (privacy by code) |
| Loading states | — | Seen transiently; source read | Source read | | Copy findings only |
| Error boundaries | — | **Not tested** (can't be forced safely in production) | Not tested | | Unknown |
| `/admin/login` | Observed ×4 | — | Deep link to an admin page → login → always `/admin` (Code-supported: `loginAdmin` redirects to `/admin`; the crawl log line for this was truncated) | | Pass w/ copy findings |
| `/admin` Today | → login | — | Observed ×4 | counts, attention, filters (GET) | Fail (F-09, F-10) |
| `/admin/content` | → login | — | Observed ×4 | list, filters | Pass w/ naming findings |
| `/admin/content/new` | → login | — | Observed ×4 (not submitted) | | Copy findings |
| `/admin/content/[id]` ×4 items × 5 steps | → login | — | Observed at 390/1440 (item 0 also 360/768) | read-only; **no Continue/Save pressed** | **Fail** (F-03; F-04 and F-05 code) |
| `/admin/content/[id]/preview` ×4 | → login | — | Observed | overflow 56 px at 768 (F-16) | Fail |
| `/admin/content/<missing id>` | → login | — | Observed: not-found content, HTTP 200 | | Fail (F-18) |
| `/admin/media` | → login | — | Observed ×4 | filters; detail panel | Fail (F-10, D-06, small target) |
| `/admin/home` | → login | — | Observed ×4 | | Copy/model findings (F-12) |
| Writes: save, publish, unpublish, upload, replace, reorder, delete, video | — | — | **Blocked**: production writes forbidden; no isolated environment exists | | Blocked |
| Two admins / two tabs | — | — | **Blocked** (same reason) | | Blocked (F-05 code) |
| Session expiry / forged cookie / throttle | — | Code read; **not exercised** (would write throttle rows or require waiting 30 days) | — | | Not tested |

## 3. Content items
| Item | Type | Status | Read in full | Rendered | Notes |
|---|---|---|---|---|---|
| Varada (Home) | home | published unchanged | Yes | 4 widths | A5b §4 |
| First Days | story (slug `first-days`) | published unchanged | Yes (9 captions, no body text) | 4 widths | F-15 |
| The Day You Arrived | story | published unchanged, 22 blocks, 5 photos, 1 video | Yes | 4 widths | A5b §2–3 |
| Temporary Letter verification | letter | draft | Opened in editor | 390/1440 | F-10 |
| Temporary private video playback verification | story | draft | Opened in editor | 390/1440 | F-10 |

## 4. Viewport grouping and equivalence
- Family pages share a single header component and one breakpoint set. 360 and 390 behaved the same except for line breaks (no overflow at either). 768 is the tablet layout and exposed the only overflow (F-16).
- Admin routes share one shell. All four widths were captured for the seven core admin routes and for all five steps of one item. The other three items were captured at 390/1440 only, because they use the same template (heights were recorded for all).
- Landscape was checked on Home only (844×390): the photo starts at 108 px and is 263 px tall.

## 5. Platforms and blocked scope
| Platform / scope | Status | Reason |
|---|---|---|
| Chromium 1194 headless (Linux), emulated mobile (touch, `isMobile`) | Covered | — |
| Firefox, WebKit | **Blocked** | Engines not installed; installing them was not attempted |
| Real iPhone Safari, real Android Chrome, installed PWA | **Unverified** | No devices. Emulation does not prove device behaviour (keyboard overlap, safe areas, HEIC picker) |
| Video playback (Cloudflare Stream) | **Partly covered** | Hosts allowed on 24 Sep. The player, layout and token expiry were observed. Actual playback is **Unverified**: Playwright's Chromium lacks H.264, and Google Chrome's download host is blocked |
| Production writes and failure injection | **Blocked** by instruction | No isolated environment (A9) |
| Performance on real Indian mobile networks | **Unverified** | Bytes were measured; timings were taken on a data-centre link, not a throttled phone |

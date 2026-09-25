# A1 — Current-state reconciliation

[← Owner report](00-owner-report.md)

## 1. What was audited, and how sure we are that it is production

| Item | Evidence (24 Sep 2026) | Confidence |
|---|---|---|
| Workspace | Cloud container checkout `/home/user/pawpaw` (not `C:\dev\pawpaw`; that path doesn't exist here). Branch `claude/trusting-thompson-0sk7jl`. HEAD **`9acc56e8ef1ae807c66cdab575351b75beeea272`** (*Journey Build: make Pawpaw feel effortless and alive (#9)*, committed 6 Sep 2026 03:24 IST). One worktree. The clone is **shallow (50 commits, back to 16 Aug)**, so older SHAs quoted in the status docs can't be resolved here. The tree was clean before the audit. The only change the audit made is the new untracked `docs/audits/`, plus git-ignored `test-results/private-audit-2026-09-24/`. | Certain |
| Remote freshness | `git fetch origin main` on 24 Sep → `origin/main` = `9acc56e…` (same). | Certain |
| Your Windows checkout | Your orientation note said `C:\dev\pawpaw` sits at `4533cc6`, 57 commits behind, with modified and untracked files. **That machine isn't reachable from this container**, so those files were neither read nor touched. Any prior audit under `docs/audits/` there was not seen (§4). | — |
| Production | Vercel project `pawpaw` (team *nsujith-creator's projects*). `www.heyvarada.in` resolves to deployment **`dpl_3QDYvJ7C2oRfzoNyjq6xYkhhgrDF`**, state READY, created 5 Sep 2026 21:54 UTC, `githubCommitSha` **`9acc56e…`**, branch `main`, region **`iad1`**. `heyvarada.in` redirects (308) to `www`. Aliases also include `pawpaw-lemon.vercel.app`. | **High**: code identity is established from the platform's own deployment record, not assumed from `main` |
| What code identity doesn't cover | Content, photos and drafts live in the shared Supabase project and were **observed live**, not inferred. Environment variables were not read. No preview deployments were audited. | — |
| Historical visuals | `docs/visual-proof/*` are July concept boards, not screenshots. The `test-results/release-2-*-evidence/` folders cited by the status docs are **not in the repository** (ignored folder). They were not available. | — |
| Live wording vs your note | You saw family-login wording differ from your old checkout. The live page on 24 Sep matches `9acc56e` exactly ("A little world, growing one memory at a time.", "Made for family. No account ceremony."). | Certain |

## 2. Instruction conflicts and how they were resolved in this audit

| # | Source (date) | Rule as written | What actually exists | Conflict | Disposition proposed | Owner decision? |
|---|---|---|---|---|---|---|
| 1 | `DESIGN_SYSTEM.md` §2 (19 Jul) | "The approved pairing is locked and must not be reopened" (Fraunces 500 + Manrope) | Live | Your 24 Sep instruction reopens all aesthetic decisions | Current owner intent wins. Treat §2–§8 as history once a new direction is chosen | Choose direction (A7) |
| 2 | `PROJECT_BRIEF.md` quality gate; `PROJECT_STATUS.md` end | Numeric 10/10 gate; "anything below 10/10 is unfinished" | Used to "lock" Login/Home/First Days at 10/10 | `AGENTS.md` (30 Aug): "No numeric perfection score replaces concrete acceptance evidence"; your instruction says the same | Replace with journey acceptance criteria (A8). Retire the score | Confirm |
| 3 | `CLAUDE_PROJECT_INSTRUCTIONS.md` | "Do not reopen settled product or taste decisions" | — | Contradicts your 24 Sep instruction | Amend: taste decisions are reopenable by explicit owner instruction | Confirm |
| 4 | `PROJECT_STATUS.md` §1.1 | "3 of 3 manual-test rounds used; do not request manual testing" | — | A redesign cannot pass without you looking at it on your phone | Replace with: one owner phone review per representative slice and per stage | Confirm |
| 5 | `CLAUDE_PROJECT_INSTRUCTIONS.md` | "Use only Playwright and Context7 MCPs" | This audit also used **Vercel MCP (read-only)** for deployment identity, as your brief asked | Minor | Disclosed. No writes were made through any MCP | No |
| 6 | `PROJECT_BRIEF.md` §8–9 | "Video is excluded"; free tiers only | Live private video via **Cloudflare Stream** (`src/lib/video/cloudflare.ts`) | Paid service; current plan and cost **UNVERIFIED** | Record the service, its cost and owner approval in the brief, or remove video | **Yes**: confirm Stream plan and cost |
| 7 | `PROJECT_BRIEF.md` §3–4 | "No health or medical information" in the family archive | *The Day You Arrived* names LSCS, iron levels, bilirubin, phototherapy, vaccination | Rule and content disagree | Rewrite the rule to ban tracking, not narrative. Paru approves her medical detail (F-22) | **Yes** |
| 8 | `PROJECT_BRIEF.md` §8 | "Create or enforce a web-sized presentation copy" | Originals served as-is (2.7–3.2 MB) | Requirement not implemented | Stage 1 repair (F-01) | No |
| 9 | `PROJECT_BRIEF.md` §14–15 | Domain blocker: `varada.in` / `varadanair.in`; "Next action: Claude supplies Phase 1 declaration" | `heyvarada.in` live since July | Stale | Delete those sections | No |
| 10 | `README.md` | "Pawpaw's eight migration files"; "implementation has not begun and is not authorised by this run" | 15 migrations; Release 2, PR-004A/B, Stage 3/4, video and Journey Build are live | Stale | Rewrite README status paragraph | No |
| 11 | `PROJECT_STATUS.md` header | "Status date: 22 July 2026 … PR-004A" | At least 50 later commits, all dated 16 Aug–6 Sep (Stage 3/4 scenes, video, editorial composition, Journey Build), are not reflected in the headline sections | Stale "single source of truth" | Rewrite header, §9 and pending register | No |
| 12 | `PENDING_REQUIREMENTS.md` | "Last updated 21 July"; PR-003 *Planned — Blocked*; PR-004B, PR-011 *Approved — Pending* | Service worker, preview, replacement, chapter creation and video are live | Stale statuses | Update statuses; add this audit's items | No |
| 13 | `DESIGN_SYSTEM.md` §4 (19 Jul) | "Only delight, wonder, sleepy are approved; no other pose or asset" | Six further scene illustrations in production, approved separately by the owner on 16 Aug (`.build-governance/tasks/pawpaw-stage3-family-visuals.json`), with "legacy July illustration assets" explicitly left in place | Two approved character sets now coexist with different faces and ages. The design system was never updated | Retire both from family pages (D-02), or choose one and record it | **Yes** |
| 14 | `DESIGN_SYSTEM.md` §13; `PRODUCT_PHILOSOPHY.md` status | "Batch 1 … in the uncommitted working tree" | Released in July | Stale | Delete | No |
| 15 | `.build-governance/results/pawpaw-journey-build.json` | Result **partial**: AC-03/05/06 unverified at 360/390/768; lint failing | Deployed to production on 5 Sep | Shipped without the required phone-width review | This audit covers the phone widths (A2). Findings F-03 and F-16 are phone-width defects that review would have caught | No |
| 16 | `CLAUDE_PROJECT_INSTRUCTIONS.md` | "Verify mobile at 375 px" | Skills and `AGENTS.md` require 360/390/768/desktop | Different widths | Adopt 360/390/768/1440 | No |
| 17 | `AGENTS.md` "Journey authority" (30 Aug) | Journey outranks older briefs; remove privacy ceremony; keep machinery offscreen | Live UI shows "Private family …" labels and revision vocabulary | UI contradicts the current rule | Findings F-12, D-05 | No |
| 18 | `docs/visual-proof/README.md` | "Must not be silently redrawn, replaced …" | — | Superseded by your instruction | Archive with a note (A6 §4) | Confirm |
| 19 | `.build-governance/` open items | — | *editorial-chapter-composition*: **deployed, pending owner preview** (AC-03/04). *editorial-media-publish-validation-repair*: **pending owner publish**. *image-upload-runtime-repair*, *stage4-performance-repair*, *journey-build*: task status **in_progress**. *next-16-3-security-remediation*: **partial** (AC-03 fail, generated `next-env.d.ts` line) | Work reported as released still has open acceptance items | Close or re-scope each item before overhaul work starts, so old contracts don't govern new work | Confirm |
| 20 | `AGENTS.md` §G | Every owner-approved production bug gets a task result **and a decision-ledger entry** | `decision-ledger.jsonl` has **1 entry** (journey-build), while results exist for 11 tasks including production repairs | Ledger incomplete | Backfill or explicitly waive | Confirm |

## 3. Missing files and stale claims
- **`docs/audits/`**: the "earlier audit" you mentioned is **not in the repository** (not tracked at `9acc56e`, and nothing untracked exists in this clone). If it exists on your Windows machine, this audit could not read or reproduce its findings. Every finding here was established independently.
- `00_READ_ME_FIRST.md`: absent (already noted in the status file).
- `test-results/release-2-*-evidence/`: absent here (git-ignored).
- The README's CLI procedure says "eight Pawpaw migrations"; there are 15.

## 4. Supabase boundary (what was and wasn't touched)
- No Supabase query was run by this audit, and no MCP or SQL call was made. Everything about data came from what the running app showed to the family and admin accounts.
- Other applications' (QtPi Tracker, Paru Health) tables, buckets, policies and migration history were not inspected.
- The live test suites were **not run**. `tests/integration/*` and several `tests/e2e/*` create and delete users, content and storage objects in whatever Supabase project the environment points to, and there is no isolated project here (A9).

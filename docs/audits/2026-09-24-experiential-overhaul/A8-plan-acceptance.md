# A8 — Staged overhaul plan, acceptance matrix, document changes and gates

[← Owner report](00-owner-report.md)

**Principles.**
- The destination is one coherent redesign (the direction you choose, B recommended), delivered in journey-sized stages.
- Stage 1 fixes photo delivery whichever direction you choose.
- No stage deletes or rewrites family content without your explicit, item-by-item approval.
- Architecture changes appear only where a named failure needs them.
- **Before implementation:** read the Next.js documentation for the installed version (16.3.0), as your brief requires. Use the guides shipped with the installed package if present, otherwise the official docs for that version. Nothing below should be built from remembered framework conventions.

## Stage 0 — Prerequisites (no product change)
| Item | Why | Done when |
|---|---|---|
| **An isolated environment** | Every write, conflict, failure and upload test is blocked without one (A9) | **Corrected 24 Sep (review):** a Vercel preview cannot reach a database running on your PC, so pick one of two arrangements. **(a) Fully local:** local Supabase (`supabase start`, free, needs Docker) plus the app run locally (`npm run dev`); tests and your review happen on the same machine (phone review over the local network is possible but needs setup). **(b) Hosted:** a second, separate Supabase project with its own keys, used by preview deployments only. Its cost is **UNVERIFIED** (your Supabase organisation already hosts other apps, so the free-project allowance may be used up). Either way: seeded with **synthetic** fixtures; **no production data** copied without your approval. If you want real photos in the slice review, copy only the 20 published photos and 3 texts, with your written OK |
| Reconcile only the old governance items that govern the next change (A1 rows 15, 19, 20 where they apply) | An old contract must not contradict the work in hand | Those items marked closed, superseded or re-scoped. *(Corrected 24 Sep: unrelated ledger housekeeping never blocks a bounded repair)* |
| Your decisions from [A9](A9-limitations-decisions.md) | Direction, characters, medical detail, debris deletion, Stream cost | Recorded in `PROJECT_BRIEF.md` |
| Remove test debris from production (F-10) | Clean author workspace | **Only after your item-by-item approval** |

## Stage 1 — Photos that load fast and keep working, and video that still plays (behaviour only; the look is unchanged)
- **Surfaces:** Home carousel, First Days, story pages, admin thumbnails, Photos library.
- **Change:**
  - At upload and finalisation, generate derivatives with `sharp` (already a dependency, INR 0): 640 / 1280 / 2048 px long edge, WebP plus JPEG fallback, stored privately next to the original.
  - Backfill the 32 existing photos with a one-off script run in the isolated environment first.
  - Serve through one authenticated image route that checks the family session and **streams the image itself**. *(Corrected 24 Sep, second review: no redirect to a storage link, because a redirect hands the browser a storage address that keeps working for up to 5 minutes after Leave.)*
  - **Recommended default for keeping photos on the phone, in plain terms: after someone presses Leave, that phone shows no family photos, not even from its history or another open pawpaw tab.** For the other-tab part, Leave tells every open pawpaw tab to switch to the sign-in page (the browser's standard tab-to-tab message), and a tab brought back to the front checks the session before showing anything. `no-store` alone can't clear a photo already on screen in another tab. *(Added 24 Sep, third review.)* To deliver it, the image route tells the browser not to keep a copy (`no-store`). The cost: every visit downloads the photos again, but the smaller sizes make that about 1.5 MB for Home instead of 9 MB. The alternative, keeping photos for a few hours and wiping them on Leave, makes repeat visits faster. But it relies on a browser feature whose iPhone support is **UNVERIFIED**, and it does nothing on a phone where nobody pressed Leave. Switch to it only if the Stage 1 phone check on mobile data shows the default is too slow. You decide the privacy promise; the engineer delivers it.
  - Streaming photos through the app uses Vercel bandwidth and function time. For a family audience that is small, but the cost against your plan is **UNVERIFIED**; check after a week.
  - **Video (separate repair):** when someone presses play, the page asks the server for a fresh playback token (the server checks the family session first), so a page left open still plays.
  - `srcset`/`sizes` on every photo; preload only the next slide's 1280 variant.
- **Data preservation:** originals are never modified or deleted. A derivative failure falls back to the original.
- **Derivative storage (corrected 24 Sep):** store derivatives at predictable paths next to the original (for example `<original>@1280.webp`), so no database change is needed. Add a table column only if that proves insufficient.
- **Release/rollback:** review on the preview, then promote; rollback = promote the previous deployment in Vercel. The originals stay untouched, so the old code still works.
- **Why these mechanisms:** photo sizes at predictable paths (with the original as fallback), the S1 rows run on the preview before release, and rollback by redeploying the previous version. These are the simplest arrangements that meet the S1 rows. Add a database column or a feature switch only if a named row can't be met without it; leaving them out is not itself a quality goal.

| ID | Acceptance criterion (from journey) | Verification |
|---|---|---|
| S1-1 | J1.5: at 390 px on a cold cache, Home transfers ≤ 1.5 MB and First Days ≤ 2.5 MB before any scrolling | CDP byte count, same script as this audit (`page-weight.json`) |
| S1-2 | J3: repeat-visit photo bytes match the caching option you chose in Stage 1: under (i), ≤ the S1-1 cold-cache budget; under (ii), ≤ 300 KB within the cache lifetime | CDP, second navigation in the **same browser profile** (the method in `recheck.js`) |
| S1-3 | J1.6: after 10 min and after 60 min idle, Next advances 6/6 and every lazy photo on First Days and on the story (`figure img`, count > 0) renders | The idle script with the story selector corrected (the original counted 0 of 0 story images) |
| S1-4 | A photo that genuinely fails shows the designed "This photo didn't load. Tap to try again." and retry works | Block the route in the isolated env |
| S1-5 | No private photo is cached by the service worker; a logged-out request to the image route gets 302 to login or 401, never bytes | curl without a cookie; SW cache inspection |
| S1-5b | **Shared device:** (1) view photos, press Leave, then open a previously viewed photo's address in the same browser, and use Back: no photo appears. (2) Open two pawpaw tabs, press Leave in one, return to the other: it shows sign-in. (3) Repeat (2) after sending the browser to the background and bringing it back. In every case, no photo appears. Repeat on a real iPhone and Android phone. *(Achievable only with the recommended streaming, no-store design. If you choose the caching alternative, this row must be rewritten to what that design can promise.)* | Playwright (same profile) plus two real phones |
| S1-7 | **Video, on a real iPhone and a real Android phone:** (a) open the story and press play at once: it plays; (b) open it in a fresh tab, wait 10 minutes **without** pressing play, then press play: it plays; (c) play it, pause for 6 minutes, resume: it keeps playing | Manual on two phones (this audit's browser can't decode the video) |
| S1-6 | Next-slide reveal ≤ 1 s on emulated "Fast 4G" | Throttled CDP |

## Stage 2 — Representative slice of the chosen direction (owner review gate)
- **Surfaces:** Home, one story reading page (*The Day You Arrived*), the phone editor for that story, the family sign-in, and one not-found page. Built on the preview against the isolated environment. Production stays unchanged.
- **Includes:** new tokens (palette, type, spacing, one radius rule), new wordmark, the cut-paper shapes needed by these pages (B), and the copy from [A5](A5-copy-review.md) for these surfaces.

| ID | Criterion | Verification |
|---|---|---|
| S2-1 | Logo-off test: a reviewer shown the Home screenshot without the wordmark can name at least two things specific to Varada (e.g., nicknames, ducks/Noolukettu), not "a baby site" | You, plus one relative |
| S2-2 | Every imaginative element has a reason you accept: from her photos, a family joke, or a deliberate fantasy you chose. Nothing is presented as a real event that didn't happen | Checklist in the PR, reviewed by you |
| S2-3 | 360/390/768/1440 plus 200% zoom: 0 px horizontal overflow; no text over a face; touch targets ≥ 44 px | Playwright screenshots plus overflow script |
| S2-4 | Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 24 px) on every colour page, checked per colour | Computed contrast table |
| S2-5 | The full 22-block letter at 360 px reads continuously: no screen is only a title panel or spacing between two photos. Page length is recorded against today's page as a guide, not a pass/fail limit | Full-page screenshot plus your read-through on your phone |
| S2-6 | Reduced motion: the composition is complete; the signature motion is off | Emulated |
| S2-7 | **You review the slice on your own phone** and approve or redirect | Your written decision |

## Stage 3 — The writing surface and safe saving (admin)
- **Surfaces:** story editor, Home editor (merged), photo attach/caption, publish.
- **Change:**
  - A continuous editor over the same block schema: paragraph, heading, quote and media remain the storage.
  - Autosave (debounced) to the **server draft** (the family sees nothing until Update). **No copy on the device** (corrected 24 Sep): a local copy would be another place private text lives, with open questions about shared devices, sign-out and conflicts. Revisit only if server autosave demonstrably loses text on a bad connection.
  - A leave warning for unsaved text.
  - Version check on save.
  - Captions saved with the story.
  - Multi-photo upload. **Keep originals (corrected 24 Sep):** photos already go straight from the phone to private storage, not through the web server, so raise the 8 MB cap (for example to 25 MB) and make derivatives on the server (Stage 1). The earlier idea of resizing in the browser would have thrown the original away. Whether iPhones send HEIC or JPEG through the browser picker is **UNVERIFIED** (the installed image library cannot read HEIC).
  - One status band and one family action.
- **Data preservation:** existing `body_blocks` load losslessly. Blocks the new editor can't represent stay intact and are shown as locked (the current "protected block" behaviour, hidden from ordinary view). A migration is needed only for a `version` column if `updated_at` precision is insufficient (UNVERIFIED).

| ID | Criterion | Verification (isolated env) |
|---|---|---|
| S3-1 | J2.4: the letter reads as continuous text in the editor at 360/390; no sticky control covers any heading or field, including with the on-screen keyboard (real phone) | Screenshots plus your phone |
| S3-2 | J2.6, **truthful saving (rewritten again 24 Sep, third review):** the contract, shown in the editor's help: *"The editor shows whether your latest changes have been saved. It warns before you leave where the browser allows it. If the page is closed or the browser stops before a save succeeds, changes since the last successful save may be lost."* Checks: the status always reads **Saved**, **Saving…** or **Not saved · Retry** and matches the server; after a failed save, a stalled request or an expired session, the text stays in the open page, signing in again keeps it, and Retry saves it; the leave warning appears on desktop navigation and refresh (phones may not show it: switching apps and then closing the browser gives no warning, per MDN) | Scripted (block the network, stall a request, expire the session, close mid-typing) plus manual on your phone |
| S3-3 | J2.11: two tabs, save A then save B → B is told who changed it and when; B's text is still in the editor | Playwright, two contexts |
| S3-4 | J2.7: select 5 phone photos (incl. one > 8 MB JPEG) → all appear in place with progress; nothing rejected for size; the stored original is byte-identical to the file picked | Fixture photos plus a checksum |
| S3-5 | J2.8: a caption typed then "Update family page" → the caption is visible to family | Preview plus family view |
| S3-6 | J2.10: with no changes, the family action is disabled and says "Family sees this version" | UI state |
| S3-7 | Round-trip: every existing block type saves back byte-identical when untouched | Unit test on the three live items (copies) |
| S3-8 | Double-tapping Update creates exactly one revision | Two rapid clicks |

## Stage 4 — Family rollout
- **Surfaces:** sign-in (return to the deep link, F-06), Home, Stories (First Days listed with the stories, F-15; merged only if you choose; "Added" labels F-21 and age-at-the-time only if you choose), story pages (media column fix F-16, `<main>` F-17), 404/error/offline (F-18, F-20 copy), Leave label (F-08), history guard change (F-07), carousel dots (F-17), and all family copy from A5.
- **Data preservation:** First Days stays at `/first-days` with a redirect or alias; its slug and revisions are kept.

| ID | Criterion | Verification |
|---|---|---|
| S4-1 | Deep link → passphrase → requested page (story and First Days) | Playwright |
| S4-2 | Back from Stories to a long story restores scroll ±100 px; Back after Leave shows sign-in | Playwright (B6/B10 scripts) |
| S4-3 | Leave label reads exactly "Leaving" | DOM |
| S4-4 | Unknown story → HTTP 404 page inside the family shell with Home and Stories | curl status plus screenshot |
| S4-5 | Keyboard: the carousel is at most 3 tab stops: previous, next, and **one** stop for the position dots. Inside the dots, arrow keys move between photos (roving focus, so only the current dot is tabbable). Every page has one `<main>` | Axe plus a manual tab walk |
| S4-6 | All **interface** strings (buttons, labels, system states, errors) match A5 or your edits, with none of "ceremony", "backstage", "wander", "peek", "Private family". **Family-written text (stories, notes, captions) is excluded** | grep over the interface source files, not the built pages |
| S4-7 | 0 px overflow at 320–1440 and 200% on every family route | Script |

## Stage 5 — Admin rollout
- **Surfaces:** sign-in, Stories list (replaces Today and Memories; whole-row links F-09), Photos (simplified filters, one save), Home page (same editor), not-found inside the admin shell, admin error copy (F-20), video copy (no "Cloudflare", no "support").

| ID | Criterion | Verification |
|---|---|---|
| S5-1 | One word per thing (Stories / Photos / Home page / Show family / Update family page / Hide from family) across every admin screen | grep plus review |
| S5-2 | Every list row opens its editor | Click-through |
| S5-3 | "Needs attention" counts real issues only; zero when none | With and without fixtures |
| S5-4 | No revision numbers, slugs, MIME types, byte sizes or "JSON" visible in routine flows | grep plus review |

## Stage 6 — Documents that must change so the old design can't return

**Sequencing (corrected 24 Sep):** these edits are not left until the end. Each document changes **in the stage that makes its old rule wrong**: `PROJECT_BRIEF.md`, `CLAUDE_PROJECT_INSTRUCTIONS.md` and the medical rule in Stage 0; `DESIGN_SYSTEM.md` and `PRODUCT_PHILOSOPHY.md` in the same change that the Stage 2 slice is approved (marked *draft until rollout*); status documents at each stage close. A requirement is marked **Released** only when its acceptance rows have recorded evidence, not when code exists for it.
| Document | Change |
|---|---|
| `PROJECT_BRIEF.md` | Replace the 10/10 gate with "journey acceptance plus owner phone review". Replace §5 (creative direction) with the chosen direction's thesis. Rewrite the medical rule (tracking vs narrative). Record Cloudflare Stream (or its removal). Delete §14–15 (stale domain and Phase 1 action) |
| `docs/DESIGN_SYSTEM.md` | Rewrite: new tokens, type roles, photo rules (no baked frames, no nested cards), artwork rule matching your character decision (D-02) and the chosen direction (no blanket "only photographed objects" or "≤ 3 per page" rule unless you approve one), copy rules (A5 §9, as review prompts for interface text), one radius, motion (one signature), accessibility. Mark the July system **superseded 24 Sep 2026** |
| `docs/PRODUCT_PHILOSOPHY.md` | Keep values. Replace the "Selected visual direction" section. Replace "illustration is first-class" with "imagination comes from her real objects" if B is chosen |
| `CLAUDE_PROJECT_INSTRUCTIONS.md` | Taste decisions are reopenable by explicit owner instruction. Viewports 360/390/768/1440. MCP list updated (Vercel read-only allowed for deployment identity) |
| `docs/PROJECT_STATUS.md` | New header (date, HEAD, production deployment). Replace "manual rounds 3/3" with the slice-review gate. Summarise 16 Aug–24 Sep work |
| `docs/PENDING_REQUIREMENTS.md` | PR-003/004/011 → Released (with the Stream note). PR-007–010 (character expansion) → **Dropped** (if you retire the characters), with the reason. Add F-01…F-25 items as approved or pending |
| `docs/visual-proof/` | Move to `archive-2026-07/`; README says superseded |
| `README.md` | Status paragraph; migration count 15 |

## Production authorisation gates
1. **Stage 1** may deploy once **every Stage 1 row passes (S1-1 to S1-7, including S1-5b and the real-phone video checks in S1-7)** on the preview, **and** you approve the photo quality on your phone. *(Corrected 24 Sep, third review: the gate had omitted S1-5b and S1-7.)*
2. **Stages 2–5** don't deploy until you approve the Stage 2 slice. After that, each stage deploys only when its criteria pass on the preview, after a 5-minute phone check by you.
3. No stage deletes content. Debris removal (F-10) and caption or letter edits happen only through your explicit per-item approval, done by you or with you in the admin.
4. Every stage produces a task result and a decision-ledger entry (`AGENTS.md` §G).

## Cost and dependencies
| Item | Purpose | Licence | Cost | Burden | Why existing capability isn't enough |
|---|---|---|---|---|---|
| Bricolage Grotesque, Literata (B) / Newsreader, Instrument Sans (A) / Young Serif, Atkinson Hyperlegible, DM Mono (C); Noto/Anek Malayalam | Type | SIL OFL | INR 0 (self-hosted via the existing `next/font/google`) | None | Replaces Fraunces/Manrope; same mechanism |
| `sharp` derivatives | F-01 | Apache-2.0 (already installed) | No new tool, but **not zero running cost**: extra storage (32 photos × 3 sizes ≈ 20–40 MB today, estimated) and function time when each photo is processed. Both are **UNVERIFIED** against your Supabase and Vercel plans; check after the backfill | Low | Already present, unused for derivatives |
| Test environment | Stage 0 | Apache-2.0 CLI | (a) fully local: INR 0; (b) a second hosted Supabase project: **UNVERIFIED** | (a) Docker on your PC, **may need help once**; (b) a second set of keys to manage | No isolated environment exists |
| Cut-paper SVG shapes (B) | Artwork | Owned | INR 0 if hand-drawn in code; **UNVERIFIED** if you hire a freelancer (one-off) | Low | Only if you retire the characters or choose B |
| Cloudflare Stream (existing) | Video | Proprietary | **UNVERIFIED**: confirm the current plan on your Cloudflare dashboard | Existing | Already live; needs recording in the brief |

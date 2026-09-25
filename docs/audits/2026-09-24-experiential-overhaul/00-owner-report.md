# Pawpaw experiential audit and overhaul brief — 24 September 2026

For Sujith. The audit covered production **www.heyvarada.in** (commit `9acc56e`), signed in as family and as admin. It only looked: nothing was saved, uploaded or published.

> **Revised 24 Sep after two external reviews.** Claims were narrowed, four things were re-tested, factual errors were fixed, and withdrawn rules were removed from every file. What changed and why: [A10-review-response.md](A10-review-response.md).

```
BUILDING: nothing. This is an audit and proposal; no product code, content, settings or data changed.
FILES TO CREATE: docs/audits/2026-09-24-experiential-overhaul/* (this report + A1–A10); private evidence in test-results/private-audit-2026-09-24/ (git-ignored)
FILES TO MODIFY: none
DEPENDENCIES: none added (INR 0). Proposals use free OFL fonts and the already-installed sharp
BLOCKERS: no isolated test environment (write journeys blocked); Chromium only (no H.264, so video playback unverified), no real phones
```

## 1. Verdict

**Product: FAIL** against your brief and against two core journeys.
**Audit coverage: PARTIAL.** Every family and admin page was observed at 360/390/768/1440. Every write, failure and conflict path is blocked until an isolated environment exists. Video playback, Safari, Firefox and real phones are unverified. The two verdicts are separate: the coverage gaps don't soften the product verdict. Every Fail below was observed or read directly in the code.

**Most consequential finding.** The photographs are the reason the site exists, and they are delivered badly:
- They are sent as **3 MB originals**. Home costs **9.4 MB** on a phone and First Days **11.3 MB** (measured).
- They are downloaded again on repeat visits: both tested visits in the same phone browser fetched all **9.1 MB** of Home photos, none from cache (re-tested 24 Sep, `data/recheck.json`). Tapping Next to a photo that isn't preloaded: the photo loaded 0.6–2.4 s after the tap and was fully shown after 1.3–3.1 s, even on a data-centre connection (`data/carousel-recheck.json`).
- **After 4–6 minutes on an open page they stop working** (re-tested 24 Sep). At 4 minutes everything worked. At 6 minutes Home's Next button did nothing, First Days showed 2 of 10 images broken, and the story showed **3 of its 5 photos** as empty boxes with text. The video's playback link was refused by Cloudflare after 5½ minutes (HTTP 401). Whether that stops a delayed first play on a phone is likely, but unverified.

This is fixable without changing the look (Stage 1). It should be fixed first whatever you decide about design.

**On your judgement that it feels "generically AI-produced": you're right, and the audit can show why.**
- *The layout is one template.* Family sign-in, admin sign-in and every error screen share the same composition: a big serif headline, a cream card, pastel blobs and a painted baby. Remove the name and it is any baby site.
- *The copy quotes the build instructions back to your family.* "No account ceremony" and "The machinery can stay backstage" echo the build instructions ("remove visible privacy ceremony", "keep implementation complexity backstage"). The rest of the interface speaks in one cute register: pages "playing hide-and-seek", the internet that "wandered off", "Pawpaw tripped over its own shoelaces".
- *There are two painted children.* Two approved illustration sets show two different faces, both about 9–12 months old, while Varada was about 2 months.
- *Two Home photos appear reprocessed.* Their rounded proof-board frame is baked into the pixels, and their painterly finish sits close to the illustrations, which blurs the line between memory and imagination that your own rules require.

What is *not* generic: your Home note, *The Day You Arrived*, the kinship words, "Mol aanu", "Pupu's 1 Month". The redesign should be built from those.

## 2. Current-state reconciliation — [A1](A1-reconciliation.md)
- **Production = `9acc56e`**, the same commit as this checkout (Vercel deployment `dpl_3QDY…`, 5 Sep, region `iad1`). High confidence, from the platform record. Your Windows checkout (`4533cc6` plus local files) wasn't reachable and was not touched.
- **Conflicts resolved in favour of your 24 Sep instruction:**
  - the Fraunces/Manrope and cream "locks";
  - the 10/10 gate, which `AGENTS.md` already rejects;
  - "don't reopen taste decisions";
  - "no more manual testing".
- **Stale or contradictory records:**
  - `PROJECT_STATUS` is headed 22 July; `PENDING_REQUIREMENTS` 21 July; the README says "eight migrations" (there are 15) and "implementation has not begun".
  - The brief bans video and medical content, yet both are live.
  - The brief requires web-sized photos; they aren't.
  - Two character sets were approved at different times and never reconciled.
  - The 5 Sep release was closed as **partial** (phone widths never checked).
  - `docs/audits/` isn't in the repository.

## 3. Coverage — [A2](A2-coverage-register.md)
- **Files:** all 266 tracked files inventoried. **Not everything was read in full** (corrected 24 Sep): every route, action, component and library file was read; CSS only where a finding needed it; tests inventoried, not read; migrations mapped through the code that uses them. Of 42 documents, 8 were read in full, 4 long ones by section, and 29 governance files by outcome. See A2 §1.
- **Routes:** 6/7 family routes observed live (the offline page was read in source only) and 10/10 admin routes observed, plus two admin error/not-found states. **Content:** 3/3 published items read in full; 2 test drafts opened. **Photos:** 20/20 published photos inspected; 12 unused library photos seen as thumbnails only. **Artwork:** all 9 illustrations and 6 icons.
- **Blocked:** writes (production-only), Firefox/WebKit/real devices. Video: the player, layout and link expiry were checked; playback is unverified because this browser can't decode H.264.

## 4. Journeys — [A3](A3-journeys.md)
- **Relative following a link:** loses the destination at sign-in, waits on heavy photos, finds them broken after an interruption, and Back loses their place. Leave works well.
- **You or Paru editing on a phone:** the story appears as 22 separate form boxes (a 13,390 px page). The sticky buttons cover headings. From the code (not yet tested, because that needs saving): unsaved text and captions can be lost on navigation, and two editors can silently overwrite each other. Preview works well.
- Clear removals: the five-step wizard for editing, the JSON editors, count cards and the file-type filter. **Your choice, not defects:** whether First Days stays separate (it must at least be listed with the stories) and whether the illustration picker goes (it depends on the character decision).

## 5. Findings — [A4](A4-findings.md)
**High:**
- F-01 heavy photos
- F-02 photos expire
- F-03 block-form editor
- F-04 unsaved work lost
- F-05 silent overwrites
- D-01 template composition
- D-02 two inconsistent character sets
- D-03 boxed photos
- D-05 cute or leaked copy

**Medium:**
- F-06 deep link lost
- F-07 Back loses position
- F-08 "Leavingâ€¦" garbled text
- F-09 dashboard rows don't open
- F-10 test debris in production, including an "Outlook Signature" image
- F-11 "Share" offered when nothing changed
- F-12 builder vocabulary
- F-13 five names for the same things
- F-14 no passphrase help
- F-15 duplicate chapters and photos
- F-16 overflow at 768 px
- F-17 accessibility (no `<main>`, six tab stops, 3.91:1 contrast)
- F-18 404 without navigation
- F-19 one-photo upload
- F-20 untrue error copy
- F-21 nothing marks what's new
- F-26 video taller than a laptop screen and off the text column
- F-22 medical detail vs your rule
- D-04 reprocessed photos
- D-06 cute admin

**Low:** F-23 callback redirect pattern · F-24 focal points · F-25 US hosting region.

**Kept on purpose:** the specific privacy checks that were run all passed (Leave then Back shows sign-in; pages are `no-store`; noindex; the service worker caches no private content). That is **not** a full security assessment. Preview is faithful, and the keyboard, reduced motion and phone widths mostly pass.

## 6. Copy and assets — [A5](A5-copy-review.md), [A6](A6-assets.md), private A5b
- **Copy:** every interface string has a rewrite or deletion. Main moves: one name per thing (Stories, Photos, Home page, Update family page); no slogans or personified errors; "Don't have the passphrase? Ask Sujith or Paru."
- **Your writing** (private file `test-results/private-audit-2026-09-24/A5b-family-writing-review.md`):
  - Your Home note is the most alive text on the site. Keep it, label it "A note from acchan", and fix only four typos.
  - *The Day You Arrived* is strong. The proposed edits fix the she/you drift, five stock or awkward lines, and the summary. The letter stops before the name is found. Paru's medical details and her hospital photo need her consent.
  - A complete proposed version sits next to the original. The original is unchanged in production.
- **Assets:**
  - Replace home-1 and home-5 with camera originals.
  - Keep all the published photos: there are no exact duplicates (corrected 24 Sep). Vary size and order where similar frames sit together.
  - Decide about the characters: keep one consistent set, or retire both (D-02; either is legitimate).
  - A seven-item photo brief lists what's missing: her with each named family member, wide "place" frames, and the Noolukettu ceremony.

## 7. Three directions — [A7](A7-directions.md) · visuals: `test-results/private-audit-2026-09-24/proposals.html`
- **A · Kasavu notebook:** the family notebook with her Noolukettu border, a kinship glossary and her names in type. Calm; the closest to beige editorial.
- **B · Picture-book spreads (recommended as the starting point):** a flat colour page facing each real photo. Cut-paper shapes of things in her photos (ducks, butterfly, marigold). Big friendly type (Bricolage Grotesque) with a reading serif (Literata).
- **C · Height chart:** everything hangs on a ruler of her age. The smartest structure; it needs dates you don't have yet.

B, plus C's "age at the time" line, changes the most. **But none of the boards yet shows the imaginative, transformed experience you asked for** (corrected 24 Sep). They are static, compare unequal pages, and never show the whole letter or a working editor. The rose card also fails its own contrast rule (3.85:1). The next proof is the full letter in B on a phone plus a clickable editor, before any code commits to a direction (A7). **Your choice is required.**

## 8. Plan — [A8](A8-plan-acceptance.md)
- **Stage 0:** isolated test environment and your decisions.
- **Stage 1:** fast, non-expiring photos, with no visual change.
- **Stage 2:** a representative slice (Home, the letter, the phone editor), which **you review on your phone**.
- **Stage 3:** the writing surface with autosave and conflict protection.
- **Stage 4:** family rollout.
- **Stage 5:** admin rollout.
- **Stage 6:** rewrite the documents so the old system can't return.

Each stage has numbered acceptance tests, a rollback and a production gate. No stage deletes content without your per-item approval. Added cost: INR 0 (the Cloudflare Stream bill is existing and unverified).

## 9. What I need from you — [A9](A9-limitations-decisions.md)
1. Pick A, B, C or B + C's age line.
2. Characters: keep one consistent set (her real age or a clearly imaginary older Varada), or retire both.
3. Approve or edit the letter, note and caption changes. Paru to approve her medical lines and the hospital photo.
4. Send camera originals for the Noolukettu and ducks photos.
5. Confirm deleting the test drafts and test photos.
6. Confirm your Cloudflare Stream plan and cost.
7. Choose the test environment: fully local on your PC (Docker; may need a technical helper) or a separate hosted Supabase project (cost unverified). A Vercel preview can't reach a database on your PC.
8. Choose how photos may be kept on a device (A8 Stage 1): not at all, or for a few hours and wiped on Leave.

Still unverified: video playback itself. On your phone, do two separate checks:
1. Open the story and press play straight away.
2. Open it fresh in a new tab, wait 6 minutes **without pressing play**, then press play.
3. Play it, pause for 6 minutes, then resume.

Don't reuse the tab from check 1: once a video has started, it may keep working, which would hide the problem. My hypothesis is that check 2 fails (the link it would use was refused after 5½ minutes); your phone decides.

---
**Inspected:** production family and admin at 4 widths, plus landscape, reflow at 720 CSS px (how Chrome lays out a 1440 window at 200% zoom; text-only zoom was not tested), keyboard, reduced motion, idle at 4 and 6 minutes (plus the first run's 5½+), Back/Forward and Leave; source as stated in A2; the documents listed in A2; 20 photos; 9 illustrations.
**Checks run:** Playwright/Chromium crawls; CDP byte and LCP measurement; contrast calculations; video player and link-expiry checks; Vercel deployment and runtime-error reads (none in 7 days).
**Not run:** the repository's test suites. They write to the shared Supabase project.
**Created:** this folder (untracked) and `test-results/private-audit-2026-09-24/` (git-ignored).
**Untouched:** all product code, content, settings and data; no commit or push.
**Resume point:** [README.md](README.md).

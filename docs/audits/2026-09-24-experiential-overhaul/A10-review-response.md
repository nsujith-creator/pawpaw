# A10 — Response to the external review (24 Sep 2026, evening)

[← Owner report](00-owner-report.md)

An external review of this audit was pasted in on 24 Sep. Every point was checked against the audit's own scripts and data. Where a claim could be settled cheaply and safely, it was **re-tested** (read-only; sign-ins only). This file records what changed.

**Verdicts are unchanged:** product FAIL, audit coverage PARTIAL. What changed is how strongly several claims are stated, plus the parts of the plan that were wrong.

## 1. New evidence (re-tested 24 Sep, `data/recheck.json`, `data/editor-height.json`)

| Question the review raised | Test | Result | Effect on the report |
|---|---|---|---|
| Is "re-downloaded on every visit" measured, or inferred? | Same browser profile (with a real disk cache), visit Home and First Days twice | Home: **9,078 KB of photos on the first visit and 9,078 KB on the second**, none from cache. First Days, fully scrolled: 14,225 KB and 14,225 KB | Now **Observed** for an immediate repeat visit. Later visits (next day) are an inference from the same mechanism: a new signed URL each time |
| The story's idle check counted 0 of 0 images | Story photos counted with `figure img` | See the idle rows below | Selector fixed in `family-states.js` |
| Is "five and a half minutes" a measured threshold? | Fresh pages left untouched for exactly 240 s and 360 s, then used | **240 s:** First Days 10/10, story 5/5, Home Next advanced 1→5 of 6. **360 s:** First Days 8/10, story **2/5**, Home Next stuck at 1 of 6 | Wording changed to "somewhere between 4 and 6 minutes, matching the 300 s link lifetime". The original run waited longer than 330 s |
| Was the 13,390 px editor measured with panels forced open? | Story step at 390 px, panels as the page opens them | **13,390 px normal**, 13,390 px with all panels open (7 panels, none open by default) | Figure stands; now stated as the normal state |
| Did the video test show decoder failure, or just a generic error? | Already in `data/video-check.json` | `canPlayType` H.264 = "", `MediaSource.isTypeSupported` H.264 = false, HLS unsupported. After play: `readyState 0`, no video bytes fetched | Missing decoding is the **likely** cause, stated as such. The player's internal error log wasn't read |

## 2. Accepted and corrected

| Review point | Where | Correction |
|---|---|---|
| "All source read" overstated A2 | 00 §3, footer | Replaced with what was actually read in full, by section and by summary |
| "The privacy model works" | 00 | "The specific privacy checks that were run all passed; not a full security assessment" |
| Owner summary states code-only risks as fact | 00 §4 | Unsaved-work and overwrite risks marked "from the code, not yet tested" |
| "200% zoom" wording | 00, A2 | Called a reflow test at 720 CSS px (how Chrome lays out a 1440 window at 200%). Text-only zoom not tested |
| Admin crawl opened all panels | A2 | Re-measured; the editor figure is unchanged (above) |
| Video: "stops working after five minutes" too categorical | 00, A4 F-02 | Now: the page's embedded link was accepted at once and refused (401) after 5½ min. The manifest and player-page requests were tested. Delayed first play on a real device is **unverified**. Continuing an already-playing video was **not tested** |
| "The same fix covers both" photos and video | A4 F-02 | Separate requirements: photos through the image route; video through a fresh playback token issued when play is pressed. Each verified separately |
| F-26: height alone isn't a defect | A4 F-26 | Re-scoped to Low: misalignment with the text column. Control reachability untested |
| Phone check was leading and conflated scenarios | 00 §9, A9 | Two separate checks; delayed first play in a fresh tab; hypothesis labelled as a hypothesis |
| Handover incomplete ("everything" was wrong) | Deliverables | Screenshots, the published photos with manifests, and the prototype HTML sources are now in three extra archives (README lists them). Scripts no longer depend on a session file in this container: each signs in fresh (`login.js`) and writes relative to its own folder |
| Character rules too rigid (exact age, never beside photos, illustrator only, photo-derived imagination only) | A4 D-02, A7, A8 S2-2 | Inconsistency is the defect; age is secondary; an imaginary older Varada is legitimate; a controlled generation process is an option; fantasy and family jokes are valid imagination as long as nothing poses as a real event |
| Reusing a photo across differently purposed stories isn't a defect | A4 F-15, A3 | Only near-duplicates within one sequence are flagged. First Days: list it; merging is your choice |
| B has unproven weaknesses | A7 | Rose contrast **3.85:1** (fails its own rule), a butterfly on the medical letter's opening, familiar children's devices, no full letter, toolbar over the writing area in all admin boards, unequal comparison. B is recommended as a **starting point**; the next proof is the full letter and a clickable editor |
| A's and C's specific weaknesses | A7 | Added: A opens on text before any photo on phones; C wastes the right side on desktop and squeezes photos on phones |
| Copy rules turn judgment into filters | A5 §9 | Rewritten as prompts for **interface** text only; never applied to family writing |
| "Anything you saved before is safe", "it's safe to leave", "Pull down to refresh" | A5 | Replaced with text that claims only what the screen can know |
| "flooded with relief", the new three-part summary, "One foot, in a hand" | A5b | Withdrawn or made "your call"; keeping the original is always valid |
| Preferences presented as settled (merge First Days, remove picker, "new" labels, autosave) | A3, A4, A8 | Marked as your choices where the evidence doesn't prove necessity |
| Unexplained thresholds: "20+ stories" (A5) and "> 60 photos" (A4 D-06) | A4, A5 | Both removed. They had no evidence behind them |
| "A steady trickle" of new photos (A6 brief #7) | A6 | Marked optional, no schedule; a gap in the archive, not an obligation |
| `Cache-Control: private, max-age=86400` changes the privacy model | A8 Stage 1 | Now an owner decision between no-store and short caching wiped on Leave. New shared-device test S1-5b; iPhone behaviour unverified |
| Vercel preview can't reach local Supabase | A8 Stage 0 | Two workable arrangements: fully local, or a separate hosted project (cost unverified) |
| In-browser resize discards originals | A8 Stage 3 | Dropped. Photos already upload directly to storage, so raise the cap and derive sizes on the server. S3-4 checks the original is byte-identical |
| Local draft copy is another private store | A8 Stage 3 | Dropped in favour of server autosave to the draft |
| 1.3× page-length limit | A7, A8 S2-5 | Withdrawn; replaced by "reads continuously" plus your read-through |
| "≤ 3 tab stops" and "dots are buttons" contradict | A8 S4-5 | One tab stop for the dots, arrow keys inside (roving focus) |
| Cost understated; schema change and per-page flags unjustified | A8 | Storage and function cost named (unverified). Derivatives at predictable paths, no schema change. No feature flags: preview → promote, roll back by promoting the previous deployment |
| Documents updated too late | A8 Stage 6 | Each document changes in the stage that makes it wrong. "Released" needs recorded acceptance evidence |

## 3. Not accepted, or accepted only in part

| Review point | Response |
|---|---|
| The butterfly motif breaks B's own rule | Partly. The letter does include the "Butterfly Season" photoshoot photo, so the source rule held. The tone question beside a medical passage is valid and is now flagged |
| The 200% check isn't real zoom | In Chromium, 200% page zoom on a 1440 window gives exactly a 720 CSS px layout viewport at DPR 2, which is what was emulated. So the reflow result is sound. What wasn't tested is text-only zoom and the browser's zoom UI. Wording narrowed accordingly |

## 4. Still open
- Video playback on a real phone (two checks, 00 §9).
- Every write, conflict and failure journey (needs the Stage 0 environment).
- The creative gap: no board yet shows the full, warm, imaginative experience. That is the next piece of work, and it needs your direction choice first.

## 5. Second external review (24 Sep, late): findings and fixes

The second review read all eight archives and found the first round of corrections applied **inconsistently**: withdrawn rules survived in other files. It also found new factual errors. All points were checked; **every one was accepted**, and two were re-tested (read-only; sign-ins only).

**Re-tested**
| Question | Result |
|---|---|
| Were all six Home photos really captured at every width? | **No.** The first crawl's fixed 900 ms wait recorded slides 3 and 5 as the previous photo, so home-3 and home-5 were never captured as displayed. Re-captured waiting for each slide: **6 distinct photos at all 4 widths** (`data/carousel-recheck.json`, `family/home-slide*-recheck.png`). For a photo that isn't preloaded, it loaded **0.6–2.4 s** after the tap and was fully shown after **1.3–3.1 s**, even on a data-centre connection (third-review re-run, screenshots after animations finish) |
| Did the "normal state" editor screenshot show the normal state? | **No.** It was taken after the panels were opened. Retaken before opening (`admin/editor-item0-story-390-normal-full.png`). Height unchanged: 13,390 px |

**Factual corrections**
| Wrong claim | Correction | Where |
|---|---|---|
| `firstdays-4` = `story-3`; three duplicates to resolve | Different frames from the same shoot, checked side by side. firstdays-2/3 are different moments (awake, then eyes closing). **No exact duplicates exist**; nothing needs dropping | A4 F-15, A6, A5b, A9, 00 |
| Lockout copy "Wait 15 minutes" | The throttle counts over 15 minutes, blocks for 30, and also blocks when the check itself fails. Copy now gives no fixed time | A5 |
| "pawpaw doesn't keep photos on this phone" | True only under the recommended no-caching design; reworded | A5 |
| Type filter: "only one kind of story in practice" | The admin offers five kinds; the filter decision now follows the naming decision (F-13) | A5 |
| "Every string reviewed" | The 565 source candidates were used to find strings, not each reviewed | A5 |
| The player "loads with a poster" | The before-play screenshot already shows an error; a visible poster was not confirmed | A4 F-26 |
| Going Back in the wizard loses text | It keeps the text (shared component state); leaving the editor or refreshing loses it | A4 F-04 |
| The 200 on an unknown story means not-found handling is missing | The route calls `notFound()`; the 200 is most likely response streaming. Investigate first | A4 F-18 |
| Region: "move the functions" | An investigation (database location and measured latency), not a change | A4 F-25 |
| "Every visit"; exact 240/360 s thresholds | "Both tested visits"; the failure falls between the two tested conditions, with approximate labels | 00, A4 |
| The main zip "has 72 entries" (said in chat) | 67 entries including folders, 63 files. The count had included the listing's header lines | chat only |

**Withdrawn rules that had survived elsewhere, now removed**
- **"Wrong age"**, "a real illustrator" and "never beside a photograph" in A6. A6 now follows D-02: keep one consistent set or retire both.
- **"Only objects in this story's photos; ≤ 3 per page"** in A7 and A8. The artwork rule now follows your character and direction decisions.
- **"Keep in one place only"** in A6 and "choose which duplicate to drop" in A9.
- **"First Days merged"** in A8 Stage 4. It is now listed with the stories, and merged only if you choose.
- **The 1.3× length limit** in A4 F-03.
- **S4-6's word ban over all built pages.** It now covers interface strings only; family writing is excluded.
- **"Local Supabase plus a preview"** in A9. It now gives the two real options.

**Safeguards rewritten so they can be met**
- *(Superseded by §6.)* **Saving (A8 S3-2):** the old "always saved or offered back" was impossible without a device copy. It is now three truthful states (Saved / Saving… / Not saved · Retry), a leave warning, text kept in the page after a failed save or an expired session, and a stated limit: text typed in the second before a crash, or offline and never retried, can't be recovered.
- *(Extended in §6.)* **After Leave (A8 Stage 1, S1-5b):** a redirect to a signed storage link would keep working for up to 5 minutes after Leave, so the recommendation is now concrete. Photos are **streamed through the app with no copy kept**, and the plain-language promise is "after Leave, this phone shows no family photos". The cost: about 1.5 MB re-downloaded per Home visit. S1-5b now states it holds only under that design.
- **Video acceptance added (A8 S1-7):** on two real phones, play at once; a delayed first play after 10 minutes in a fresh tab; and resume after a 6-minute pause.
- **Mechanism choices explained:** photo sizes at predictable paths, preview verification and redeploy rollback are the simplest arrangements that meet S1. Leaving out a database change or feature flags is not a goal in itself.
- **Governance housekeeping** is no longer a universal Stage 0 prerequisite: only items that govern the change in hand.

**Scripts:** `shot.js` wrote to `/tmp`; it now writes beside the renders. `media-grab.js` had been left collecting only the story photos; it now collects all 20. That fix was **not re-run**, because the archived photos were already captured. `editor-height.js` now takes its screenshot before opening panels. New: `carousel-recheck.js`.

**Still true after both reviews:** the boards are unchanged and are not the transformation you asked for. The next creative proof is the full letter, a real photo sequence, phone reading, a working editor, and failure states.

## 6. Third external review (24 Sep, late): five remaining points, all accepted

| Point | Fix |
|---|---|
| The new carousel screenshots caught photos mid-fade (the 520 ms reveal), so they looked washed out. Times measured "loaded", not "fully shown" | Re-run: screenshots now wait until every animation finishes. Both times are recorded: loaded **0.6–2.4 s**, fully shown **1.3–3.1 s** (includes a 150 ms settle margin) for slides 3–5. All 6 photos at all 4 widths, full colour (`data/carousel-recheck.json`) |
| The Stage 1 deploy gate listed S1-1…S1-6 and skipped the new video checks | The gate now requires every Stage 1 row, S1-1 to S1-7, including S1-5b and the real-phone video checks (A8 gates) |
| Saving still over-promised: phones don't always fire a leave warning, and a stalled save or expired session can lose more than one second of writing | S3-2 now states the reviewer's contract in the editor's help: *changes since the last successful save may be lost if the page closes or the browser stops before a save succeeds*. The leave warning is "where the browser allows" (MDN: switching apps and closing gives none). Checks cover stalled requests, expired sessions and re-sign-in keeping the text. A4 F-04 matches |
| "After Leave, no photos" didn't cover a photo already on screen in another tab | Plan adds: Leave tells every open pawpaw tab to switch to sign-in, and a tab brought back to the front re-checks the session. S1-5b adds two-tab and background-then-return checks. This is a gap in the proposed design, **not** a reproduced production defect |
| A4 F-15 still said to drop firstdays-2/3 as a same-moment duplicate | Now a pacing choice: awake vs eyes closing, vary size or order, nothing needs removing |

**Status of everything above:** the 1.5 MB Home figure, the saving contract, the after-Leave behaviour and the video checks are **proposals and acceptance targets**, not achieved results. Nothing has been built or tested against them.

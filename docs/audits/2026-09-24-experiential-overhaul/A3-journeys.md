# A3 — Expected versus observed journeys

[← Owner report](00-owner-report.md) · Evidence classes as in [A4](A4-findings.md). Production is observed only; every write step is marked **Blocked**.

## J1 · Invited relative, first visit from a shared link (phone)
**Actor:** grandparent or aunt on an Android or iPhone, on mobile data. **Goal:** see Varada's photos and read what Sujith wrote. **Entry:** a WhatsApp link to a specific story.

| # | Step | Expected | Observed | Class | Result |
|---|---|---|---|---|---|
| 1 | Tap link `/chapters/the-day-you-arrived` | Sign-in page that says whose pages these are and who to ask for the passphrase | Sign-in page; slogan headline; no "who to ask" | Observed | Partial (F-14, D-05) |
| 2 | Enter passphrase | Keyboard opens when the field is tapped; clear error if wrong | Field autofocuses on load; a wrong passphrase gives "…did not open the door. Have another go." (code) | Observed / Code | Partial (F-17) |
| 3 | Submit | Lands on **the story they were sent** | Lands on **Home** | Observed | **Fail** (F-06) |
| 4 | Orient on Home | Her name, a photo, what's here, where the stories are | Photo in nested frames, title, painted baby, the note labelled "A little about this little person", link "Open her stories" | Observed | Partial (D-01, D-03) |
| 5 | Browse photos | Swipe/arrows; the next photo appears within about 1 s on mobile data | Each Next waits for a ~3 MB PNG; ≈ 9.4 MB on first view | Observed (bytes) / Unverified (real-network timing) | **Fail** (F-01) |
| 6 | Interrupted for 5+ minutes, returns | Carousel continues | **Next does nothing**; counter stuck at "1 of 6"; no message | Observed | **Fail** (F-02) |
| 7 | Find the story | Stories list with the story, dates, what's new | *Chapters* page lists 1 story; *First Days* only in the top nav | Observed | Partial (F-15, F-21) |
| 8 | Read the story | Calm column; photos in place; video plays | Good column and rhythm; video offset left of the column; overflow at 768; video **Blocked** here | Observed / Blocked | Partial (F-16) |
| 9 | Go back to the list, then back again | Returns to the same place | First Days reloads at the top | Observed | **Fail** (F-07) |
| 10 | Leave on a shared phone | Private pages gone; Back doesn't reveal them | Pass; the button shows "Leavingâ€¦" | Observed | Pass with defect (F-08) |
| 11 | Revisit next week | Cookie still valid (30 days); sees what's new | Cookie 30 days (Observed); no "new" signal; photos re-download in full | Observed | Partial (F-01, F-21) |

## J2 · Sujith or Paru on a phone: edit a story, add a photo, share it
**Actor:** admin, Android/iPhone, sometimes interrupted. **Goal:** fix a sentence, add a photo with a caption, and update the family page. **Entry:** `/admin/login`.

| # | Step | Expected | Observed | Class | Result |
|---|---|---|---|---|---|
| 1 | Sign in | Email + password → the story list | "Make the next page worth finding." hero + card; lands on Today | Observed / Code | Pass with copy findings |
| 2 | Understand state | "What's shared / what isn't" at a glance | Counts 2 / 3 / 32; "2 unpublished drafts" are test debris; badges "published + newer draft" | Observed | Partial (F-10, F-12) |
| 3 | Open the story | Tap the row | On Today, **only Home rows open**; must go via Memories → "Open editor →" | Observed | **Fail** (F-09) |
| 4 | Read what's there | The story reads as the story | 22 separate block cards; 13,390 px page at 390 | Observed | **Fail** (F-03) |
| 5 | Fix one sentence | Tap and type | Find the right card, scroll inside a 5-row box, type | Observed (read-only) | Fail (F-03) |
| 6 | Get interrupted, tap the nav or Back | Work kept, or a warning | No guard; unsaved text lost | Code-supported | **Fail** (F-04) |
| 7 | Add a photo | Pick 1+ photos from the phone; they appear in the story; caption them in place | Step 4 "Add moments": one file at a time; alt text required before upload; 8 MB cap; then place it via the Write step's dropdown and "Move earlier/later" | Code / Observed UI | Blocked (write) / Fail (design) (F-19) |
| 8 | Write a caption | Saved with everything else | Separate "Save words" button; Continue doesn't save it | Code-supported | Fail (F-04) |
| 9 | Preview | Exactly what family sees | Works: `/preview` renders the family template with a banner | Observed | **Pass** |
| 10 | Share | One clear action; says what changed | "Share this new version" shown even when nothing changed; message says "Revision N published" | Observed / Code | Partial (F-11, F-12) |
| 11 | Paru also editing | Told before overwriting | Silent last-write-wins | Code-supported | **Fail** (F-05) |
| 12 | Verify the family result | Refresh family page shows it | Family pages are `force-dynamic`, so they fetch fresh content on navigation (Code). The admin note "an already-open page will not update by itself" is accurate but unnecessary | Code | Pass (copy finding) |

**Field and data logic (J2).**

| Area | Parent / context | Dependent | Rule | Current | Result |
|---|---|---|---|---|---|
| Story kind | Type chosen at creation | Required fields (letter: author/recipient/written date; moment: event date) | Show required fields only for that kind; lock the type after save | Implemented (disclosure opens for letter/moment; type locked) | Pass |
| Title → address | Title | Slug | Auto-generate until touched; lock after first share | Implemented, **but exposed** as "Chapter address /chapters/…" | Pass (behaviour) / Fail (exposure F-12) |
| Draft → photos | Saved draft | Upload, preview, publish | Unlock after first save | Implemented by auto-save on Continue | Pass (but forces a save to see photos) |
| Photo placement | Attached photos | Inline placement blocks | Only attached, not already placed | Implemented (placed options disabled) | Pass |
| Caption source | Photo caption vs per-story override | Family caption | Override wins | Implemented | Pass (two caption concepts is complex; hide the override) |
| Publish → family | Draft vs active revision | Family view | Family sees the active revision only | Implemented (revision model) | Pass |
| Concurrency | Loaded version | Save | Reject a stale save | **Not implemented** | Fail (F-05) |
| Duplicates | Photo library | Same photo in two stories | Allowed; shown as "In N memories" | Implemented; similar frames from the same shoot appear in First Days and the letter (no exact duplicates) | Owner decision (F-15) |

## J3 · Returning users
| Actor | Expected | Observed | Result |
|---|---|---|---|
| Family, next visit | Sees what's new since last time; photos come from cache | No "new" labels; every photo re-downloaded (new signed URL each time) | Fail (F-01, F-21) |
| Family, long-open tab | Keeps working | Photos stop working after 5 min | Fail (F-02) |
| Admin, resume editing | Opens where they left off, with work intact | Step comes from `?step=`; an unsaved local draft is not kept | Partial (F-04) |
| Anyone, a link to removed content | Clear "not here" with a way back | Designed 404 without nav; HTTP 200 on unknown story slugs | Fail (F-18) |

## Functions: keep, simplify, combine, move or remove
| Function | Recommendation | Reason |
|---|---|---|
| Separate *First Days* top-level route | **Owner choice** (corrected 24 Sep): at minimum, list it on the Stories page. Merging it is an option, not a necessity | It is missing from the story index (F-15). A photo sequence and a letter can legitimately cover the same days |
| Five-step authoring wizard | **Remove for editing**; keep a short "New story" sheet (kind + title) | Editing is writing, not a sequence (F-03) |
| Visual scene picker (painted Varada) | **Depends on your character decision** (A9 #2) | Remove if the characters are retired; if one set is kept, keep a simpler picker for it |
| Advanced JSON editors (story and Home) | **Remove from author UI** | Expert fallback that exposes internals (F-12) |
| Separate Home editor model | **Combine** with the story writing surface | Two editing models for one family (F-12) |
| Today dashboard with count cards | **Simplify** into the Stories list with "not shared yet" chips | Counts are decoration. The real task is "continue a story" (D-06) |
| Photo library filters (type, sort) | **Simplify**: drop the file-type filter; keep sort and "not used yet" | Parents don't filter by file type (D-06). No story/photo count threshold is proposed |
| Chapter address (slug) editing | **Move backstage** | Auto-generated (F-12) |
| Revision numbers in UI | **Move backstage** | Keep in data; say "the version from 16 Aug" |
| Private video | **Keep** (repair expiry; confirm cost, A1 row 6) | Real family value; the first video of her |
| Install button / update prompt | Keep | Quiet, only when relevant |
| Leave | Keep (fix the label) | Shared-device privacy works |
| **New capabilities (separate from repairs):** "Added {date}" labels; her age on each story (B + C); multi-photo upload; autosave; conflict check | Proposed | Each serves a named journey step above. No feeds, reactions, notifications, trackers or public sharing proposed |

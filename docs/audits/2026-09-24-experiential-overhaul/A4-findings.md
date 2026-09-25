# A4 — Prioritised findings

[← Owner report](00-owner-report.md)

**Evidence classes.** *Observed*: seen or measured in production (www.heyvarada.in, deployment `dpl_3QDY…` = commit `9acc56e`) on 24 Sep 2026 in headless Chromium 1194 (Linux), phone-sized windows emulated. *Code-supported*: established from source at `9acc56e` but not exercised. *Owner-reported*: from Sujith's brief. *Unverified*: plausible, not established.

**Severity.** Critical: data loss or corruption, a privacy breach, or a materially wrong action. High: a core journey is blocked or badly degraded. Medium: the journey still works but causes confusion, rework or avoidable risk. Low: limited effect.
**Design-failure tag** marks findings that are about authorship or genericness rather than malfunction. Taste recommendations are kept separate from proven defects.

Private evidence lives in `test-results/private-audit-2026-09-24/` (git-ignored). The paths below are relative to that folder.

---

## Proven malfunctions and journey defects

### F-01 · High · The photographs are delivered as 3 MB originals, and downloaded again on repeat visits
- **Journey:** Family visits Home or First Days on a phone.
- **Evidence (Observed):** Measured with Chrome DevTools Protocol at 390 px, logged in, cold cache: **Home transferred 9.4 MB** (3 photographs of 3.1, 3.1 and 2.8 MB: the current slide plus the two preloaded neighbours). **First Days transferred 11.3 MB** before scrolling finished. **The Day You Arrived transferred 2.2 MB** (the video was excluded because this container blocks Cloudflare). Largest-contentful-paint was 3.7 s for Home and 3.9 s for First Days on a data-centre link. Media responses carry **no `Cache-Control`**. The admin page shows the Home files as `image/png · 3.1 MB` (see `data/page-weight.json`, `data/admin-facts.json`).
- **Repeat visit (Observed, re-tested 24 Sep):** in one browser profile with a working disk cache, Home was visited twice: **9,078 KB of photos on both tested visits, none served from cache**. First Days, fully scrolled: **14,225 KB both times** (`data/recheck.json`). Next-day visits weren't tested; the mechanism below predicts the same.
- **Why it keeps happening (Code-supported):** `src/lib/media/private-url.ts` signs a new 5-minute URL on every request, so a returning visitor never gets a cache hit. `upload-form.tsx` sends the file as-is: no client-side presentation copy is made, although `PROJECT_BRIEF.md §8` requires one.
- **Consequence:** Each Home visit costs a grandparent on Indian mobile data roughly 9–15 MB. At a realistic 5 Mbit/s that is about 15 s before the neighbouring photos are ready. Every tap on Next waits for a full 3 MB download ("Bringing the next memory into view…").
- **Recommendation:** At upload time, generate stored derivatives with the `sharp` dependency that is already installed: about 640, 1280 and 2048 px on the long edge, WebP/JPEG at ~80 quality. Serve them with `srcset`. Keep originals private and untouched. Deliver through one authenticated image route. Whether the browser may keep photos between visits is **your decision** (A8 Stage 1): `private` caching keeps a copy on the device that later viewers of that browser could see. Even with no caching, the derivatives alone cut Home from about 9 MB to about 1.5 MB. The private proof shows this is achievable: the same 20 photos re-encoded at 1100 px/q80 weigh **69–141 KB** each, against 2.8–3.2 MB now.
- **Retest:** at 390 px on a cold cache, Home transfers ≤ 1.5 MB and First Days ≤ 2.5 MB before scrolling. Repeat-visit bytes as set by your caching choice (A8 S1-2). No visible quality loss on a 3× phone screen.
- **Effort / dependencies:** Medium. No new dependency or service. No database change if derivatives are stored at predictable paths (A8 Stage 1).

### F-02 · High · Photos stop working after 4–6 minutes on an open page
- **Journey:** Family opens Home or a chapter, is interrupted, comes back and continues.
- **Evidence (Observed):**
  - **Threshold (re-tested 24 Sep, `data/recheck.json`):** fresh pages were left untouched and then used. **After 240 s everything worked:** First Days 10/10 images, the story 5/5 photos, and Home's Next went 1 → 5 of 6. **After 360 s:** First Days **8 of 10**, the story **2 of 5** (three show raw description text in an empty box, `family/story-390-after-idle-360s.png`), and **Home's Next stayed at "1 of 6"** after 4 taps. The failure falls between the two tested conditions, consistent with the 300 s link lifetime. The labels are approximate: pages were opened one after another and checked one after another after the wait, so each image's exact age differs by some seconds.
  - The first run (`data/family-states.json`) waited **at least** 330 s, not exactly 5½ minutes, because other checks ran before the wait. Its story check counted 0 of 0 images (a selector bug, since fixed). Its Home and First Days results match the re-test.
  - Failed images show the browser's broken-image rendering with raw alt text, not the designed "Photograph temporarily unavailable" state.
  - **Video (Observed at the network level only):** two requests were tested with the playback token embedded in the page: the player page (the iframe address) and the video manifest (`…/manifest/video.m3u8`). Both returned **HTTP 200 immediately** and **HTTP 401 after 330 s** on the same open page. The token's own lifetime is 296 s (`data/video-token-check.json`). The token is created by the server when the page is rendered (`cloudflare.ts`); the page has no code to fetch a new one. **Inference, not observation:** a relative who opens the story and first presses play after about 5 minutes will likely get an error, unless the player already loaded what it needs. Continuing a video that is already playing was **not tested**. Real-device behaviour is **unverified** (this browser can't decode H.264, F-26).
- **Cause (Code-supported):** signed URLs expire after 300 s (`private-url.ts`, and `cloudflare.ts` for video). Lazy-loaded images request them after expiry. The carousel's `onerror` silently clears the pending state (`home-carousel.tsx`).
- **Consequence:** A relative who reads slowly or returns to an open tab finds a broken or frozen archive and cannot tell why.
- **Recommendation:** two requirements, verified separately. **Photos:** the authenticated image route from F-01 (checks the session, issues a fresh signed URL or streams the file), or re-sign on `error` with one quiet retry. **Video:** issue a fresh playback token when play is pressed (or re-render the player on error). The two share a goal, not an implementation. If renewal fails because the session ended, send the visitor to sign in and bring them back to the same place.
- **Retest:** idle 10 min on Home, First Days and a story, then navigate. Every photo appears, Next advances every time, and the video manifest request returns 200 at the moment of pressing play.

### F-03 · High · Writing a story on a phone means managing a stack of form blocks
- **Journey:** Sujith or Paru edits *The Day You Arrived* on a phone.
- **Evidence (Observed, 390 px):** the Write step renders **22 separate block cards**, and the page is **13,390 px tall** (`admin/admin_content_item0_step_story-390-full.png`). Each paragraph is a 5-row scrolling box inside a card, with *Move earlier*, *Move later*, a *Block type* select and *Remove block…*. Headings need a separate *Heading level: Heading 2/Heading 3* select. The **sticky Back/Save here/Continue bar covers the step heading and intro** on the Write, Add moments and See & share steps. The step strip is clipped ("Giv…").
- **Consequence:** A letter that took real feeling to write cannot be read back as a letter while editing. Reordering means repeated taps. On a phone, the author sees fragments. This is the core authoring journey, and it is shaped around the database's `body_blocks` array.
- **Recommendation:** One continuous writing surface: plain paragraphs, a heading toggle, a quote toggle, and photos placed where the cursor is, with the caption edited in place. Store the same validated blocks behind the scenes. Remove the step wizard for editing existing stories. Keep a single visible save state ("Saved just now") and one family action ("Update the family page").
- **Retest:** at 360/390 px, the full story reads as continuous text. No control overlaps any heading or field, including with the keyboard open. Moving a photo two paragraphs up takes ≤ 3 taps. *(The earlier 1.3× length limit is withdrawn; page height alone isn't a usability measure.)*

### F-04 · High · Unsaved writing and captions can be lost without warning
- **Evidence (Code-supported; not exercised because production writes are forbidden):** `chapter-editor.tsx` has no `beforeunload` or route-change guard. *Back to content*, the sidebar links, browser Back and *Open family preview* (a plain link) all leave the editor without saving. Going *Back* to an earlier step does not save, but the typed text stays in the open page (the steps share one component's state), so that alone doesn't lose it; leaving the editor or refreshing does. Photo captions and descriptions are saved only by their own *Save words* / *Save description* buttons (`attachment-list.tsx`). *Continue* and *Save here* do not save them, so a typed caption is lost on navigation.
- **Consequence:** Real, realistic data loss for a phone author who is interrupted, which on a phone is the normal case.
- **Recommendation (corrected 24 Sep):** autosave to the server draft, a visible saved / saving / not saved state, a warning before leaving while anything is unsaved, and captions saved with the story. See A8 S3-2 for what this can and can't recover: anything typed since the last successful save can be lost if the page is closed or the browser stops before a save succeeds.
- **Retest (in the isolated environment):** the checks in A8 S3-2.

### F-05 · High · Two tabs or two admins silently overwrite each other
- **Evidence (Code-supported):** `saveChapter` updates `content_items` without any version or `updated_at` precondition (`src/app/admin/content/actions.ts`). There is no conflict message anywhere.
- **Consequence:** Sujith and Paru, or one person with two tabs, can wipe each other's paragraphs without knowing.
- **Recommendation:** Send the loaded `updated_at` (or a version number) with each save. Reject a stale save with "Paru changed this 3 minutes ago — review her version". Keep the rejected text in the editor for copying.
- **Retest:** in the isolated environment, open two tabs, save in A, then save in B. B is told and loses nothing.
- **Not tested:** no isolated environment exists yet (see limitations).

### F-06 · Medium · A shared link to a story loses its destination at sign-in
- **Evidence (Observed):** an unauthenticated visit to `/first-days` goes to `/family-login`. After the passphrase, the visitor **lands on `/`, not `/first-days`** (`data/family-log.json`). The deep link `/chapters/<slug>` behaves the same. `loginViewer` always calls `redirect('/')`.
- **Consequence:** Links sent on WhatsApp ("read the story I wrote") drop relatives on Home, with no clue where the story is.
- **Recommendation:** Preserve a same-origin return path (validated to begin with a single `/`).
- **Retest:** the deep link → passphrase → the requested story opens.

### F-07 · Medium · Back always reloads and loses your reading position
- **Evidence (Observed):** First Days was scrolled to 2,500 px, then the visitor went to Chapters and pressed Back. **First Days reloaded at scroll 0** (`data/family-states.json` B6). `private-history-guard.tsx` forces `location.replace` on every back/forward traversal of a private page.
- **Consequence:** Browsing between Stories and a long chapter keeps throwing the reader back to the top.
- **Recommendation:** Keep the protection that matters: after *Leave*, a Back must not show private content (currently passes, B10). Otherwise allow the back/forward cache. For example, hide and reload only when a "left" flag is set, or when a lightweight session check fails.
- **Retest:** Back returns to the same scroll position within ±100 px. Back after *Leave* still shows the sign-in page.

### F-08 · Medium · "Leavingâ€¦" — garbled text on the Leave button
- **Evidence (Observed):** the button's text while leaving was `Leavingâ€¦` (B8). Source: `src/components/home/leave-button.tsx:43` contains a double-encoded ellipsis.
- **Recommendation:** Use the real "…" character, or better, "Leaving".
- **Retest:** the DOM text while leaving is exactly the intended string.

### F-09 · Medium · Dashboard lists memories you cannot open
- **Evidence (Observed + Code):** on Today → *Recently updated*, only the Home row has an *Edit* link (`src/app/admin/page.tsx:278`). The story, letter and First Days rows are dead ends.
- **Recommendation:** Every row opens its editor. Make the whole row the link.

### F-10 · Medium · Test debris in the live archive and the author's lists
- **Evidence (Observed):** drafts titled *Temporary Letter verification* and *Temporary private video playback verification* appear in Today and Memories. They produce the only "Needs attention: 2 unpublished drafts". Unattached media includes captions `ssss`, `caption`, `caption2`, `ALT2PHOTO`, `A quiet afternoon nap` and an image captioned **`Sujith Outlook Signature`** (an unrelated work e-mail asset stored in Varada's photo shelf).
- **Consequence:** The author's workspace is cluttered with fake work. "Needs attention" is meaningless.
- **Recommendation (owner decision, not done in this audit):** delete these items after confirming none is real. Future verification should run only in an isolated environment.

### F-11 · Medium · "Share this new version" is offered when nothing changed
- **Evidence (Observed):** *The Day You Arrived* shows *Status: published unchanged*, yet the See & share step offers **Share this new version** (`admin/admin_content_item0_step_review-390-full.png`). Whether publishing an identical draft creates a duplicate revision is **Unverified**.
- **Recommendation:** When the draft equals the family version, say "Family is seeing this version" and disable the update action.

### F-12 · Medium · Builder vocabulary leaks into the author's screens
- **Evidence (Observed):** "Selected revision 1 published 16 Aug 2026", "Revision N published for the family", "A new immutable revision was published", "Structured copy", "Block 1", "Advanced: edit validated blocks as JSON", "Protected Level 1 heading block", "Media placement", "Position 1 of 6 · image/png · 3.1 MB", "safe filename", "Chapter address /chapters/ … permanently locked", "Changes appear on the family page after it is refreshed — an already-open page will not update by itself".
- **Recommendation:** See [A5](A5-copy-review.md). Keep implementation terms off the author's screens unless one is needed for a decision.

### F-13 · Medium · The same things have different names
- **Evidence (Observed):** family nav *Chapters*; admin nav *Memories*; editor *Delete chapter*, *Chapter type*, *Back to content*; library title *Memories* with eyebrow "Every page you've begun". Photos are called *Photo shelf*, *Photograph desk*, *Your visual memory box*, *Media Library* (in success messages) and *Media files* (counts). The Home page is *Welcome page* (nav), *Shape the welcome page*, *Home page editor* and *Home*. Publishing is *Share with family*, *Share this new version*, *Publish* (Home editor), *published*, *Take out of family view* and *Unpublish*. **"pawpaw"** is both Varada's nickname ("The first hours and days of Pawpaw") and the site's name. The browser tab says *Varada's World* while the installed app says *Pawpaw*.
- **Recommendation:** One word per thing, used everywhere: **Stories** (family and admin), **Photos**, **Home page**, **Show family / Update family page / Hide from family**. The site name is covered as an owner decision in [A5](A5-copy-review.md).

### F-14 · Medium · A relative who forgets the passphrase has nowhere to go
- **Evidence (Observed/Code):** the family sign-in page gives no hint of who to ask. The throttle message "Too many failed attempts. Please try again later." gives no time.
- **Recommendation:** "Don't have the passphrase? Ask Sujith or Paru." Give the throttle wait in minutes.

### F-15 · Medium · Two chapters cover the same days; the index hides one
- **Evidence (Observed):** *First Days* (9 photographs, captions only, no words) and *The Day You Arrived* (the written account) cover the same first days and **share photographs**: `firstdays-4` and `story-3`, and `firstdays-8` and `story-4`, are **different frames from the same photoshoot**, not identical files (corrected 24 Sep after side-by-side review; the earlier "=" was wrong). *First Days* has its own top-level nav slot, but it is **not listed** on the *Chapters* page, which shows a single card.
- **Recommendation (corrected 24 Sep):** the defect is discoverability: list First Days on the Stories page. Whether it stays separate, merges into the letter, or keeps its own nav slot is **your choice**. A photo may appear in both a letter and a visual chronology. Similar frames side by side (firstdays-2 awake, firstdays-3 eyes closing) are a **pacing choice**, not redundancy: vary their size or order if you like; nothing needs removing. *(Corrected 24 Sep, third review.)*

### F-16 · Medium · Inline media breaks the reading column and overflows
- **Evidence (Observed):** on the story page at 1440 px, the inline video sits at x≈88 while the text column starts at x≈344. At **768 px the page scrolls sideways by 72 px** (the culprit element is `figure.chapter-renderer_figure`, right edge at 840 px). At an effective 200% zoom it also overflows by 72 px. The same page in admin preview overflows by 56 px at 768 px.
- **Recommendation:** Media never wider than the viewport minus the gutters. Offsets only where there is room.
- **Retest:** 0 px horizontal overflow at 320–1440 px and at 200% zoom.

### F-17 · Medium · Accessibility defects (measured, not scanner-only)
- *Code-supported:* chapter pages have **no `<main>` landmark** (`ChapterRenderer` renders an `<article>` directly).
- *Observed:* the carousel's six position dots are **six separate tab stops** with `role="tab"` and no tab panel. Keyboard users tab through 6 dots to reach *Next*. The gallery section's focus outline is 1 px, while every other control has 3 px.
- *Observed:* the family and admin sign-in fields **autofocus**, which opens the phone keyboard over the welcome on arrival. Unverified on a real phone.
- *Observed:* "Made for family. No account ceremony." is 12 px `#8C7E6D` on `#FFFEF8`, **contrast 3.91:1** against the 4.5:1 required.
- *Observed (Chromium/Linux only; Unverified on phones):* letter-spaced uppercase labels render with **gaps after "T"**: "A LIT TLE ABOUT THIS LIT T LE PERSON", "A T INY WRONG TURN", "AUT HOR'S ST UDIO", "WRIT ING DESK".
- *Passes (Observed):* arrow keys move the carousel. Focus rings are visible elsewhere. Reduced-motion sets transitions to 0 s. There is no horizontal overflow at 320–390 px, and the sign-in pages work at 200% zoom.

### F-18 · Medium · The 404 page abandons both family and admin
- **Evidence (Observed):** `/no-such-page` and `/admin/nope` show the same family "This page is playing hide-and-seek" card, with **no header, no Leave, no admin navigation**. An admin who mistypes a URL is offered *Browse Chapters*. `/chapters/not-a-real-memory` returns **HTTP 200** with the not-found content (a soft 404).
- **Status code (corrected 24 Sep):** the story route does call `notFound()`. The 200 is most likely because the page streams its response before the not-found is decided. Investigate that before choosing a fix; don't assume the handling is missing.
- **Recommendation:** Give the family and admin their own not-found pages inside their shells. Return a 404 status where the framework allows it.

### F-19 · Medium · Uploading from a phone is constrained and one-at-a-time
- **Evidence (Code-supported; not exercised):** 8 MB cap, JPEG/PNG/WebP only, no browser-side resize (contrary to brief §8), one photo per form submission. Photo alt text is mandatory before upload can start. Photos cannot be added until the draft exists.
- **Unverified:** whether iPhone HEIC photos are converted by Safari's picker in this flow, and how often modern phone JPEGs exceed 8 MB.
- **Recommendation:** Pick several photos at once. Resize in the browser to ≈ 2048 px before upload, so large phone photos never hit the cap. Allow alt text afterwards and flag it as missing rather than blocking.

### F-20 · Medium · The admin error screen can say things that aren't known
- **Evidence (Code-supported):** `src/app/admin/error.tsx` tells the author "That didn't save the way it should. Your page has not been published or deleted." for *any* rendering error, including a page that simply failed to load. `video-actions.ts` tells the author to "contact support", but no support exists.
- **Recommendation:** Say what is known: "This page didn't load. Nothing you saved earlier is affected." Remove "contact support".

### F-21 · Medium · Returning family can't see what's new
- **Evidence (Observed):** the Stories index shows no dates and no "added" signal. Home shows "Written 19 July 2026", although *The Day You Arrived* was published on 16–17 Aug.
- **Recommendation:** Optional, your choice: a quiet "Added 16 Aug" on each story card, newest first. This is not a notification or an engagement feature, and it does not create any obligation to add photos on a schedule.

### F-22 · Medium · The story contains medical detail, against the product's own rule
- **Evidence (Observed):** *The Day You Arrived* mentions Paru's LSCS, iron levels and anaesthesiologist, and Varada's bilirubin, phototherapy and first vaccination. `PROJECT_BRIEF.md §3/§4` excludes "health or medical information" from the family archive. It is also Paru's medical detail, shared with every passphrase holder.
- **Recommendation (owner decision):** Keep the narrative. Only Sujith and Paru can decide the medical specifics, so Paru should approve her part. Rewrite the rule so it bans *tracking* (feeds, weights, doses, measurements) rather than *narrative mention*, so the rule and the content stop contradicting each other. See [A5b private letter review](../../../test-results/private-audit-2026-09-24/A5b-family-writing-review.md).

### F-26 · Low · The story video sits outside the reading column on desktop
*(Re-scoped 24 Sep after review: the misalignment is the finding; the height alone is not a defect.)*
- **Evidence (Observed, 24 Sep, after the video hosts were allowed):**
  - At **1440×900** the portrait player starts at **x = 88** while the text column starts at **x = 344**, so it breaks the reading line, the same pattern as F-16 (`data/video-check.json`, `family/video-1440-before-play.png`).
  - It is **512×910 px**, slightly taller than the 900 px window. Portrait video can reasonably need a scroll; whether the play control and progress bar stay reachable while watching was **not tested** (playback didn't run here).
  - At 390 px it is 366×651 px and fits.
  - **No autoplay** (pass). The player reports a poster image, but in this browser its window already showed an error before play (`family/video-390-before-play.png`), so a visible poster was **not** confirmed. It fetches about 412 KB before anyone presses play.
  - Its accessible name is the caption "Hi, I'm half an hour old 🐣👼".
- **Not verified:** actual playback. This browser reports **no H.264 decoding** (`canPlayType('video/mp4; codecs="avc1.42E01E"')` returns empty, `MediaSource.isTypeSupported` returns false and HLS is unsupported; `data/video-check.json`). After pressing play the player reported `readyState 0` and fetched no video bytes, and Cloudflare showed "An unknown error occurred". Missing decoding is the **likely** cause; the player's own error log was not read. This is a test-environment limit, **not evidence of a production fault**. Check on a phone.
- **Recommendation:** align the player with the text column. Optionally cap it near the window height. Give the iframe a descriptive title ("Video: the first video of Varada").
- **Retest:** at 1440×900 the player is aligned with the text, and its controls are reachable while it plays.

### F-23 · Low · Open-redirect pattern in the admin e-mail callback
- **Evidence (Code-supported):** `src/app/auth/callback/route.ts` redirects to `${origin}${next}` with an unvalidated `next`. A value like `@evil.example` would produce a URL on another host. Exploitation requires a valid one-time code. Not tested.
- **Recommendation:** Accept only a `next` that starts with a single `/`. Tracked separately from the overhaul.

### F-24 · Low · Focal points are stored but can't be set
- **Evidence (Code-supported):** the `focal_x/focal_y` columns exist, and there is no control for them. The brief lists focal points as an admin capability. Primary views use whole-photo `contain`, so the practical harm is small.
- **Recommendation:** Drop the requirement unless a cropped layout needs it. Direction B's story covers are the only such case.

### F-25 · Low · The hosting region is far from the family
- **Evidence (Observed):** production functions run in **`iad1` (Washington, D.C.)**. Every private page is dynamic and `no-store`, so each navigation makes a trans-oceanic round trip. The family is in India.
- **Recommendation:** an investigation, not a change: find where the Supabase project sits and measure page latency from India. Move the function region only if the measurements show it helps. The Hobby-plan configurability is **UNVERIFIED**.

---

## Experiential (art direction, copy, imagery) — design-failure findings

These are judgements. The evidence is screenshots and exact text, so you can check the reasoning.

### D-01 · High · design failure · The governing idea is a template, not Varada
- **Evidence (Observed):** family sign-in, admin sign-in and every error/404/loading screen share one layout: a big serif headline, a cream background, soft pastel circles, one rounded white card, and a painted baby beside it (`family/login-1440-fold.png`, `admin/login-1440-full.png`, `family/no-such-page-390-fold.png`). Home is a rounded photo inside a white panel inside a pink-bordered card, beside a title and a painted baby (`family/home-1440-full.png`).
- **Anti-slop tests:**
  - *Logo-off:* remove "Varada" and "pawpaw" and it could be any baby site.
  - *Noun-swap:* swap "baby" for "puppy" or "wedding" and the layout survives untouched.
  - *Screenshot-memory:* what remains is "cream, big serif, cartoon baby".
  - *Component-library:* the same card component everywhere.
- **What is specific and good:** Sujith's own note, the kinship words (amma, acchan, acchachan, acchamma, Ammayi, Sreemaman), "Mol aanu.", the Noolukettu, and "Pupu's 1 Month" on the cake. The design currently treats these as content poured into a generic container rather than as the source of the design.
- **Recommendation:** Rebuild from these specifics ([A7](A7-directions.md)).

### D-02 · High · design failure · The illustrations are two different children
- **Evidence (Observed):** six "scene" illustrations (`src/assets/varada/*-alpha.png`: artist, wave, explorer, festive, gardener, reader) show a watercolour-pencil **9–12-month-old sitting child** with short hair and no bindi. The three "approved" expressions (`public/illustrations/varada/*.png`) show a glossier, larger-eyed **crawling baby with a bindi and headband bows**. These are two faces, two rendering styles and two ages, against the rule "one coherent recurring face". Both sets were approved at different times: the three in July, the six on 16 Aug (Stage 3), and the July set was deliberately left in place, so the inconsistency is a record-keeping outcome, not a rogue asset. Varada was about 2 months old in the published material. The illustrations are shown as decoration with quips attached ("She's keeping an eye on the next chapter.", "We kept your place warm."). An empty lilac circle stands where a scene would be on the story page.
- **Also:** the painterly, softened look of the enhanced Home photographs (D-04) sits close to this illustration style, which blurs the line between memory and imagination that the product requires.
- **Weight of the evidence (corrected 24 Sep):** the core defect is **inconsistency**: two faces, two styles. The age gap is secondary: an imaginary, older Varada can be a deliberate choice. Neither a character beside a photo nor a recurring illustration is wrong in itself.
- **Recommendation (your choice, A9 #2):** either (a) keep **one** character, redrawn so every scene shows the same child in one style (by an illustrator, or by a tightly controlled generation process you approve), and decide whether she is her real age or a clearly imaginary older self; or (b) retire the characters and carry imagination another way. Direction B's cut-paper objects from her photographs are one way, not the only one: family jokes and deliberate fantasy are equally legitimate, as long as nothing pretends to be a real event. See [A6](A6-assets.md).

### D-03 · High · design failure · Photographs are framed, boxed and shrunk
- **Evidence (Observed):**
  - **Home 1440:** a single photo at 547 px inside three frames. `home-1` and `home-5` carry **rounded corners and a peach border baked into the pixels** (they were cut from a proof board), then sit inside a white rounded panel inside a pink rounded card. That leaves white bars left and right and an empty right column under the character.
  - **First Days 1440:** a 9,650 px zig-zag in which each photo takes about half the width, the other half is blank, and 15 px grey captions hold the only words.
  - **The Day You Arrived:** the one page where words and photos work together.
- **Recommendation:** Photos lead, full width on phones and large on desktop, with no nested frames. Replace the two baked-frame files ([A6](A6-assets.md)).

### D-04 · Medium · Two Home photos look generatively reprocessed
- **Evidence (Observed pixels; cause Unverified):** `home-1` and `home-5` are exactly **1254×1254**, the same output size as the AI character art, and show painterly smoothing, glowing highlights and a baked-in rounded frame. The brief permits enhancement that does not change factual content. This audit **cannot tell** whether content was altered.
- **Recommendation:** Replace them with the camera originals, lightly corrected. The owner has them.

### D-05 · High · design failure · Interface copy speaks in one cute register and leaks its own design brief
- **Evidence (Observed):**
  - "No account ceremony." echoes AGENTS.md's "Remove visible privacy ceremony".
  - "The machinery can stay backstage." echoes the design skill's "keep implementation complexity backstage".
  - The interface narrates its own philosophy to relatives.
  - A single whimsical voice runs through every state: "This page is playing hide-and-seek.", "Pawpaw tripped over its own shoelaces.", "The internet wandered off.", "Nothing has wandered off.", "Another is already peeking around the corner.", "We kept your place warm.", "Psst. The stories are just through here."
  - "small", "little" and "tiny" appear 14 times in the visible text of six family pages, two of them in Sujith's own story text.
  - Captions are built as triads and wonder-endings: "drowsy, curious, impossibly small", "flowers, butterflies, and wonder", "One small foot, one entire new world", "The quiet profile of a two-day-old dream".
- **Recommendation:** Full rewrite table in [A5](A5-copy-review.md). Plain, warm, specific interface voice. Family authors keep their own voice.

### D-06 · Medium · design failure · The author's studio is cute where it should be calm
- **Evidence (Observed):**
  - Admin labels such as "Your desk is ready.", "Your writing desk", "Opening your desk…", "Photo shelf / Photograph desk / Your visual memory box", "Give it a little mood — A small visual hello" and "Keeping it safe…".
  - Stat cards lead the phone dashboard ahead of the primary action.
  - Photos on phone show six filter controls, including image file type, before the first photo.
- **Recommendation:** Admin should share the family look but talk plainly. The primary action comes first. Keep the filters that match how parents look for photos (not used yet, newest), and drop the file-type filter. *(Corrected 24 Sep: the earlier "> 60 photos" threshold had no evidence behind it.)*

---

## What works and should survive
- Privacy boundary: after *Leave*, Back shows the sign-in page, not private content (Observed B10). Protected responses are `private, no-store` with `noindex` (Observed). The viewer cookie is `httpOnly`, `Secure`, `SameSite=Lax`, 30 days (Observed).
- Draft/published separation with a real family preview, and "Nothing is visible to family until…" messaging in admin (Observed).
- Keyboard carousel, reduced-motion respect, visible focus rings, and no horizontal overflow on most pages at 320–390 px (Observed).
- The Day You Arrived's editorial rhythm: headings, "Mol aanu." set as a pull line, inline photographs (Observed).
- Sujith's Home note: the most human thing on the site (see A5b).

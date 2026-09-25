# A5 — Copy review: every visible interface string

[← Owner report](00-owner-report.md) · Family writing (Sujith's note, *The Day You Arrived*, photo captions) is reviewed privately in `test-results/private-audit-2026-09-24/A5b-family-writing-review.md`.

**Method.** Strings were collected in two ways:
- From the live DOM of every crawled page at four widths (`data/family-facts.json`, `data/admin-facts.json`).
- From the source (`data/copy-raw.json`, 565 candidate strings with file:line).

The strings in the tables below were reviewed in context against the humantalking pattern catalogue. *(Corrected 24 Sep: the 565 source candidates were used to find strings; they were not each reviewed individually. Any rewrite below that names an action or state, such as "Try again" or "Saved just now", needs that behaviour built first; A8 lists them.)* "Sounds AI" is a diagnosis of the pattern, not a claim about who wrote it.

**What the interface voice should be.** Plain, warm and exact. It is the voice of whoever runs the house, not of a mascot. It names real things: Varada, stories, photos, the passphrase, Sujith and Paru. It never talks about its own design ("ceremony", "machinery", "backstage"). It doesn't personify pages or the internet. It keeps "small", "little" and "tiny" for things that are actually small. Family authors keep their own voices; the interface does not imitate them.

**Legend.**
- **K** = keep.
- **R** = replace with the proposal.
- **D** = delete.
- **P** = pattern diagnosed: T = template/slogan ending, W = whimsy personification, L = leaked design-brief vocabulary, M = mechanical triad, I = implementation vocabulary, V = vague/unhelpful, X = inconsistent naming, F = false or unverifiable claim.

## 1. Identity (browser, app, brand)

| Where | Current (exact) | P | Proposal | Why |
|---|---|---|---|---|
| `<title>` all pages (`layout.tsx`) | Varada's World | X | **pawpaw — Varada's family pages** (per-page: "The Day You Arrived · pawpaw") | Tab title, app name and wordmark disagree today. Per-page titles help with tabs and history. |
| meta description | A private family archive. | V | Varada's family pages. | Only seen when a link is shared. Avoid the "archive" register. |
| Manifest name/short_name | Pawpaw / Pawpaw | X | pawpaw / pawpaw | Matches the wordmark. |
| Wordmark (family) | pawpaw ♥ (aria-label "Pawpaw" / "Pawpaw home") | X | **pawpaw** (aria-label "pawpaw, home") | The heart adds nothing. The label should say where the link goes. |
| Wordmark (admin) | pawpaw / AUTHOR'S STUDIO | X | pawpaw · **studio** | "Author's studio" appears twice on every admin page. |
| Offline page `<title>` | Pawpaw is waiting for the internet | W | You're offline · pawpaw | Plain. |

**Owner decision:** "pawpaw" is Varada's nickname, coined by acchan, and also the site's name. Keep it as the name of the place (recommended: it is specific and his). Then write "Varada" whenever the text means her, as in the story summary below.

## 2. Family sign-in (`/family-login`)

| Location | Current | P | Proposal |
|---|---|---|---|
| Kicker / display line | A little world, growing one memory at a time. | T, W | **D.** Replace the headline slot with the name: "Varada". |
| Whisper (desktop) | Psst. The stories are just through here. | W | D |
| Eyebrow | The family door | W | D |
| h1 | Come on in. | K | **Come in** (the h1 becomes "Varada's family pages", and "Come in" is the button) |
| Intro | One familiar phrase, then it's all photographs, small adventures, and Varada. | M, W | Enter the family passphrase to see her photos and stories. |
| Label | Family passphrase | K | Family passphrase |
| Button / pending | Open Varada's world / Opening the door… | W | **Come in** / Checking… |
| Footer | Made for family. No account ceremony. | L, T | **Don't have the passphrase? Ask Sujith or Paru.** (A real recovery path; also fixes the 3.91:1 contrast.) |
| Error: empty | Pop in the family passphrase first. | W | Enter the family passphrase. (Native "Please fill out this field." fires first today, so this rarely shows.) |
| Error: wrong | That passphrase did not open the door. Have another go. | W | That passphrase isn't right. Check the spelling and try again. |
| Error: throttled | Too many failed attempts. Please try again later. | V | Too many tries for now. Try again later, or ask Sujith or Paru for the passphrase. *(Corrected 24 Sep: "Wait 15 minutes" was wrong. `throttle.ts` counts failures over 15 minutes, then blocks for 30, and also reports "blocked" when the check itself fails. A fixed time is only truthful if the screen is told the real remaining time.)* |
| Error: unavailable | Login is temporarily unavailable. Please try again later. | K | Signing in isn't working right now. Try again in a few minutes. |

## 3. Family shell, Home, Stories, story, First Days

| Location | Current | P | Proposal |
|---|---|---|---|
| Nav | Home · First Days · Chapters · Leave | X | **Home · Stories · Leave** (First Days joins Stories, F-15) |
| Leave pending | Leavingâ€¦ | bug | Leaving |
| Leave (a11y) | — | — | aria-label "Leave pawpaw on this device" |
| Home eyebrow | Home | I | D (the nav already says Home) |
| Home dateline | Written 19 July 2026 | K | Written 19 July 2026 · V was 7 weeks old. (Keep the dateline; move the age from the removed sentence here, as released in PR-005.) |
| Character note | She's keeping an eye on the next chapter. | W | D (the character itself is retired, D-02) |
| Story label | A little about this little person | T | **A note from acchan** (true authorship; see A5b) |
| Invitation | The next small adventure is already waiting. / Open her stories → | T | **Read her stories →** |
| Carousel pending | Bringing the next memory into view… | W | (Remove the need, F-01.) If still needed: "Loading photo…" |
| Carousel a11y | "Varada photo gallery", "Previous photo", "Next photo", "Photo 1"…, "1 of 6" | K | Keep, with "Photo 3 of 6: {caption}" on the dots. |
| Degraded | Some photos could not be loaded right now. The written Home content is still available. | I | Some photos didn't load. [Try again] *(corrected 24 Sep: "Pull down to refresh" assumed a gesture not every browser or installed app offers; the button retries)* |
| Empty Home | Varada's world is being prepared. Come back soon. | W | Nothing here yet. Sujith and Paru are putting the first photos up. |
| Home error | Varada's page could not be loaded right now. Please try again. | K | This page didn't load. Try again. [Try again] |
| Chapters eyebrow | Private family archive | L | D (privacy ceremony; the passphrase already did the job) |
| Chapters h1 / lede | Chapters / Published stories, photographs, letters, and moments kept for Varada and her family. | M, I | **Stories** / D. "Published" is admin vocabulary. |
| Card type | STORY / LETTER / GALLERY / MOMENT | K | Keep, as small labels. |
| Card CTA | Open this memory → | W | D (the whole card is the link) |
| Card metadata | By {author} · For {recipient} · {event date} | K | Add "Added 16 Aug" (F-21). |
| Empty Chapters | No other chapters are published yet. Read First Days. | I | No stories yet. |
| Story eyebrow | Private family story / letter / gallery / moment | L | Story · Letter · … (drop "Private family") |
| Story "Written" line | Written {date} | K | Keep. |
| Story degraded | Some photographs could not be loaded right now. The written chapter remains available. | I | Some photos didn't load. The story is all here. [Try again] |
| Video unavailable | Video temporarily unavailable | K | This video didn't load. [Try again] |
| Story ending | ✦ Keep wandering. / One memory ends. Another is already peeking around the corner. / Choose another chapter / Return Home | T, W | **Next story: {title} →** · All stories · Home |
| First Days eyebrow | Private family chapter | L | D |
| First Days ending | And that was only the beginning. / There are more small days, big feelings, and family stories waiting nearby. / Find another chapter / Back to Home | T, M | Next story · All stories · Home |
| First Days warning | Some photographs could not be loaded right now. Their places and captions remain in the chapter. | I | Some photos didn't load. [Try again] |
| Photo unavailable | Photograph temporarily unavailable | K | This photo didn't load. Tap to try again. |
| Chapter load error | This chapter could not be loaded safely. Please try again. | I | This story didn't load. [Try again] |

## 4. Family states (loading, error, 404, offline, install)

| Location | Current | P | Proposal |
|---|---|---|---|
| Global loading | Just a moment / Finding the next page… / The story is on its way. Nothing has wandered off. | W, F | Visual skeleton only. Announce "Loading" to screen readers. |
| Archive loading | Opening Varada's world… / The door is open. Her photographs are settling into place. | W | Same as above. |
| Archive error | A small wobble / This page needs one more try. / Nothing has been changed or lost. We can fetch the memory again, or wander back Home. | W, F | This page didn't load. [Try again] [Home] ("Nothing has been changed" is true for family readers but reads as a promise the page can't check. Delete it.) |
| Global error | Pawpaw tripped over its own shoelaces. / Your memories are still safe. Try this page once more, or step back into the archive. | W, F | Something went wrong on our side. [Try again] [Home] |
| 404 | A tiny wrong turn / This page is playing hide-and-seek. / The link may be old, or the memory may still be getting ready. Let's head somewhere familiar. / We kept your place warm. | W, F | **This page isn't here.** The link may be old, or the story may have been taken down. [Home] [All stories] |
| Offline page | A small pause / The internet wandered off. / Pawpaw keeps family pages and photographs off the device when you're offline. Reconnect, then we'll carry on exactly where you were. / Nothing was changed while the connection was away. | W, F, L | **You're offline.** pawpaw needs a connection to show her pages. [Try again] *(Corrected 24 Sep: "doesn't keep photos on this phone" is only true under the no-caching option in A8 Stage 1.)* (Drop "exactly where you were" and "Nothing was changed"; neither is guaranteed.) |
| Offline banner | Offline — saving, publishing, and uploads need a connection. | I | Family: "You're offline." Admin: "You're offline. Changes will save when you're back." (Only if autosave queues; otherwise "…can't be saved until you're back online.") |
| Install | Install Pawpaw / On iPhone or iPad: Share → Add to Home Screen. / A new version is ready | K | Add pawpaw to your home screen / (keep the iOS hint) / **Update pawpaw** |

## 5. Author's studio: sign-in, shell, Today

| Location | Current | P | Proposal |
|---|---|---|---|
| Sign-in eyebrow / h1 | Pawpaw author's studio / Make the next page worth finding. | T | pawpaw studio / **Sign in to edit Varada's pages** |
| Sign-in lede | Write the memory. Choose the moments. See it exactly as family will. The machinery can stay backstage. | M, L | D |
| Card eyebrow / h2 / intro | Your writing desk / Welcome back. / Sign in and Pawpaw will take you to the next useful thing. | W, V | D / **Sign in** / D |
| Button / pending | Open the studio / Opening your desk… | W | Sign in / Signing in… |
| Errors | Add your email and password to open the studio. / Those details did not open the studio. Check them and try again. / This account does not have a writing desk in Pawpaw. / That sign-in link expired or was already used. Sign in here instead. | W | Enter your email and password. / That email and password don't match. / This account can't edit pawpaw. / That link has expired. Sign in with your password. |
| Nav label / items | Write / Today · Memories · Photo shelf · Welcome page · Sign out | X, W | (no label) **Stories · Photos · Home page · Sign out**. Today merges into Stories; see plan. |
| Current cue | Current | K | Keep a visual cue, and keep `aria-current`. |
| Nav footer | Your desk is ready. | W | D |
| Today h1 / eyebrow / lede | Today in Pawpaw / Author's studio / Pick up a memory, begin a new one, or simply see what the family can already enjoy. | W | Stories (list view). No lede. |
| Counts | 2 Drafts · 3 Published · 32 Media files | I | D as cards. Show "2 not shared yet" as a filter chip. |
| Panel | What would you like to remember? / A few honest lines are enough. Photographs, mood, and sharing come when you are ready. / Begin a memory | W | **New story** (button only) |
| Quick links | Shape the welcome page · Return to a memory · Find a photograph | W, X | D (nav covers them) |
| Needs attention | Needs attention / N attached photo(s) missing alt text / N unpublished draft(s) / Nothing needs attention. | K | **3 photos need a description** · **2 stories not shared yet** (each is a link). Hide when there are none. |
| Filters | All statuses / Unpublished draft / Published and unchanged / Published with newer private draft / All types / home / story… / Apply / Clear | I | Chips: **All · Not shared yet · Shared · Changed since sharing**. Keep a kind filter only while the kinds (Home, Story, Gallery, Letter, Moment) remain distinct in the product; decide with F-13 naming. *(Corrected 24 Sep: "only one kind of story in practice" contradicted the five kinds the admin offers.)* *(Corrected 24 Sep: the earlier "until there are 20+ stories" threshold had no evidence behind it.)* Filter instantly; no Apply button. |
| Row badges | unpublished draft / published + newer draft / published unchanged | I | **Not shared yet** / **Changes not shared** / **Shared** |
| Row meta | Updated 17 Aug 2026, 12:38 am / Published 17 Aug 2026, 1:19 am / 5 photos | K | Edited 17 Aug · Shared 17 Aug · 5 photos |
| Row action | Edit (Home only) | bug | Whole row opens the editor (F-09). |
| Empty | Nothing saved yet. / No content matches these filters. Clear filters. | I | No stories yet. [New story] / No stories match. [Show all] |
| Admin loading | Author's studio / Setting out your writing desk… / Bringing your drafts, photographs, and next useful action into place. | W | Skeleton only. |
| Admin error | Author's studio / That didn't save the way it should. / Your page has not been published or deleted. Try the action again; if it still misbehaves, return to the studio. / Studio dashboard | F | **This page didn't load.** [Try again] [Stories] *(corrected 24 Sep: "Anything you saved before is safe" removed; the error screen can't know that)* |

## 6. Memories library and editor

| Location | Current | P | Proposal |
|---|---|---|---|
| Library eyebrow / h1 / lede | Every page you've begun / Memories / Find an old thread, continue a draft, or begin something new for Varada. | W, X | **Stories** (no eyebrow, no lede) |
| Library CTA | Create a memory | X | New story |
| Type guidance notice | Choose Story for words, Gallery when photographs lead, Letter for something she may read one day, or Moment for a dated milestone. Write, add moments, preview, then share when it feels right. | M | Show one line of guidance next to the type picker when creating: Story · Letter · Photos · Moment. |
| Row CTA | Open editor → | I | (whole row) |
| New eyebrow / h1 / lede | A new page for Varada / Begin a memory / Start small. A title and a few true words are already enough. | W | **New story** |
| Edit eyebrow / h1 / lede | Your {type} / Shape this memory / One useful decision at a time. Save whenever you like; family sees nothing new until you share it. | W | The story's own title is the heading. The status line (below) replaces the lede. |
| Back link | Back to content | X | ← Stories |
| Steps | Shape it / Write it / Give it mood / Add moments / See & share (+ notes: What is this memory? · Tell it in your voice · A small visual hello · Photographs and video · Preview, then publish) | W | **D (no wizard for editing).** A new story opens straight into the writing surface; details sit in a "Details" sheet. |
| Status line | Status: published with newer private draft / Selected revision 1 published 16 Aug 2026. | I | **Family sees the version from 16 Aug. Your newer changes aren't shared yet.** or **Family sees this version.** or **Not shared with family yet.** |
| Step headers | Step 1 of 5 / Shape the memory / Give it a name and just enough context. Everything else can wait. (and similar for steps 2–5) | W | D |
| Field: type | Chapter type + guidance per type | X | Kind of story: Story / Letter / Photos / Moment. Guidance: "A letter shows who wrote it and who it's for." "A moment needs the date it happened." |
| Field: title error | Give this memory a title so Pawpaw can keep it safe. / Start with a title. Everything else can wait. | W, F | **Add a title.** (A title isn't what keeps it safe.) |
| Address | Chapter address · set automatically / /chapters/ / Lowercase letters, numbers, and hyphens; 3–80 characters. It locks after first publication. / This address is permanently locked… / First Days keeps its canonical /first-days family route. | I | **D from the UI.** Generate it automatically. Show only if a collision happens: "Another story already uses this link; we added '-2'." |
| Summary | Introduction (optional) | K | Short introduction (optional). Shown under the title and on the story card. |
| Context disclosure | Add date, people or place / optional / Letter details / needed before sharing / Moment date and details | K | Details: when, who, where |
| Field labels | Event date · Event date precision (Exact day / Month only / Year only) · Approximate event date · Authored date · Family-facing author · Recipient · Place · Relationship context | I | **When it happened** (day / month / year only, "about") · **Date written** · **Written by** · **Written for** · **Where** · Drop "Relationship context" unless you can say what it is for (no current use found in family pages beyond one plain line). |
| Context help | These are family facts. Leave them blank when unknown; administrator identity is never used as the family author. | I | Leave anything you're not sure of blank. |
| Write step | Structured copy / Build the chapter with headings, paragraphs, quotations, and placements for attached photos or videos. / Block N / Move earlier / Move later / Block type / Heading level / Heading 2 / Heading 3 / Paragraph / Quotation / Attribution (optional) / Remove block… / Add heading / Add paragraph / Add quote / Place an attached photo or video / Choose attached media / Add to story / …already placed / Add it, then use Move earlier or Move later… | I | **Replaced by a writing surface** (F-03): toolbar **Heading · Quote · Photo · Video**. Photos appear where the cursor is. Drag or "Move up/down" on the photo only. |
| Advanced JSON | Advanced: edit validated blocks as JSON / Advanced JSON can represent media placements… / Validate and apply JSON / Cancel advanced editing / Protected {…} block. This valid advanced block is preserved exactly… | I | **D from author UI.** Keep as a hidden developer route if needed. |
| Confirms | Remove this non-empty copy block? / Changing this quote type removes its attribution. Continue? / Remove this placement from the story? The photo or video stays safely attached to the chapter. | I | Replace with **Undo** after removal ("Paragraph removed · Undo") instead of `window.confirm`. |
| Scene step | Give it a little mood / Optional. Choose the small Varada who feels at home beside this memory. / Just the story · No illustration · Let the photographs and words lead. / Artist… | W | Retired with the characters (D-02). Direction B's equivalent is "Page colour", suggested from the cover photo. |
| Media step | Add the moments you can see / Photographs and video belong to the story. Add only what earns its place. / In this memory / Upload a photograph / Upload a video / Making room for your photographs… / Pawpaw is keeping the draft and opening its photo shelf. | W | Photos are added from the writing toolbar. The attached list lives in a "Photos in this story" sheet. |
| Review | See it. Then share it. / Preview is the family's view. Publishing is the only action here that changes what they can see. / {title} · N story blocks · N photographs · Yes/No illustration / Open family preview / Share with family / Share this new version / Take out of family view / Save this first draft / Saving keeps this private. Preview shows the family view. Sharing publishes a lasting version. / A Letter needs its author, recipient, and written date before it can be shared. | I, W | Top bar: **Preview** · **Show family** (first time) / **Update family page** (changes pending) / disabled "Family sees this version" (no changes). Overflow menu: **Hide from family…** Letter rule shown only on failure: "A letter needs 'Written by', 'Written for' and 'Date written' before you share it." |
| Footer | Back / Save here / Saving… / Continue / Keeping it safe… / Keeping your changes safe… | W | **Saved just now** / Saving… / **Not saved — try again** (autosave) |
| Success | Private draft saved. Any published family version is unchanged. / Revision N published for the family. / A new immutable revision was published for the family. / Chapter unpublished. Revision history and the private draft were preserved. / Draft chapter deleted. Its photographs remain in Media Library. | I | Saved. / **Family can now see this.** / **Hidden from family.** You can share it again any time. / **Story deleted.** Its photos are still in Photos. |
| Errors (save) | Please correct the marked fields. / The draft could not be saved. Please try again. / Something went wrong while saving. Please try again. / The private draft was saved, but publication failed. The family version was not changed. / Could not verify publication history. Please try again. / Could not check the chapter address. Please try again. / Could not verify the attached photographs. Please try again. / That slug is already used by another chapter. / The slug is locked… / HTML is not permitted. / Keep this field to N characters or fewer. | I | Keep the truthful meanings, in plain words: "Couldn't save. Check your connection and try again — your text is still here." / "Saved, but sharing failed. Family still sees the earlier version." / Slug errors disappear with automatic addresses. / "Please keep this under N characters." |
| Delete | Delete chapter / Deleting removes this chapter and its photo associations. The photo files remain in Media Library. / Delete chapter… / Confirm deletion of "{title}". Type the exact title as the second confirmation. / Exact chapter title / Delete this chapter / Cancel | X | **Delete story…** → "Delete '{title}'? Its photos stay in Photos." [Delete] [Cancel]. (Typing the title is heavy for a never-shared draft; keep it only for shared stories, which currently cannot be deleted anyway.) |

## 7. Photos (Photo shelf) and Home page editor

| Location | Current | P | Proposal |
|---|---|---|---|
| Photos header | Your visual memory box / Photo shelf / Choose a photograph, give it useful words, and add it to a memory. One photograph at a time. / 32 of 32 files | W, X | **Photos** · 32 |
| Filters | Search photos or usage / All image types / JPEG / PNG / WebP / Attached and unattached / Attached / Unattached / Newest first / Oldest first / Apply / Clear / Search covers alt text, caption, safe filename, and attached content titles. | I | Search · **Not in a story yet** chip. Drop file-type and sort until needed. |
| Tile | In N memory/memories / Not used yet / Preview resting / Preview unavailable / Untitled photograph | W | In "{story title}" / Not in a story yet / (drop "Preview resting") / Photo didn't load |
| Detail | Added {date} · 69 KB / Appears in {title} / What is happening in this photograph? / A short, natural description helps anyone who cannot see the image clearly. / Caption (optional) / Save words / Add this photograph to / Choose a memory… / Add to memory / Begin and save a memory before adding this photograph to it. / Remove this photograph forever / This removes the original from every memory. It cannot be undone. / Yes, delete forever / Keep it | W, I | Added {date} · In "{title}" / **Description (for people who can't see it)** / **Caption (shown under the photo)** / Add to a story… / **Delete photo…** → "Delete this photo from pawpaw and every story it's in? This can't be undone." [Delete] [Cancel]. One save for both fields. |
| Attached list | Position 1 of 6 · image/png · 3.1 MB / Words beneath this photograph (optional) / Save words / ↑ Move earlier / ↓ Move later / Set as cover / More photo options / Describe the photograph for anyone who cannot see it clearly / Save description / Remove from this memory / Replace photograph… / Delete from Pawpaw forever… | I | Photo 1 of 6 / Caption / Description / Move up / Move down / Use as cover / ⋯ Replace… · Remove from story · Delete photo… (one save). |
| Messages | Photograph detached. The file remains in Media Library. / Photograph order updated. / Photograph details updated. / Chapter cover updated. / Photograph permanently deleted. / Something went wrong. Please try again. / That did not work this time. Nothing else was changed—please try once more. | X | Removed from this story (still in Photos). / (no toast for reorder) / Saved. / Cover changed. / Photo deleted. / "Couldn't do that. Check your connection and try again." |
| Upload | Photo (JPEG, PNG, or WebP, max 8 MB) / Alt text for screen readers (required) / Describe what is in the photo / Alt text is read aloud by screen readers for accessibility. It is not normally displayed on the page or when hovering the photo. / Caption shown with the photo (optional) / A line the family will see under the photo / Upload photo / Preparing… / Uploading… / Finishing… / Photo saved and attached to {target}. It becomes visible to family only while that content is published. / Save the content first, then upload to attach the photo automatically. / Unsupported file type. Use JPEG, PNG, or WebP. / File exceeds 8 MB limit (got N MB). / No file selected. / The upload did not complete. Check your connection and try again. / Upload failed before it completed… / Could not start the upload… | I | **Add photos** (multi-select) → per-photo progress "2 of 5 uploaded". Description is asked after upload, as a gentle nudge. "Added to this story. Family will see them when you update the family page." Errors: "This file isn't a photo pawpaw can use (try JPEG or PNG)." Size errors disappear with in-browser resizing. |
| Replacement | Explicit replacement / Replace photograph in {title} / Current photograph / Proposed photograph / Choose a proposed photograph / Choose from Media Library / Upload new photograph / Eligible unattached photograph / No eligible unattached photographs are available. Upload a new one instead. / Replace this photograph in this chapter? / The new photograph keeps this exact position. The previous file remains in Media Library and stays attached anywhere else it is used. / Confirm replacement / Photograph replaced. The previous file remains in Media Library. / (+ errors) | I, X | **Replace photo** · Current · New · [Choose from Photos] [Upload] · "The new photo takes this one's place. The old one stays in Photos." [Replace] · "Replaced." |
| Video | Video (MP4, MOV, or WebM; up to 2 GB) / Caption (optional) / A line the family will see with this video / Videos stay private, have no autoplay, and can publish only after processing is complete. / Upload video / Preparing private upload… / The upload paused or failed. Choose the video again to resume. / Check status / Video is ready to publish. / The video is still being prepared. / Remove private video / Remove this private video? This cannot be undone. / Private video removed. / Cloudflare could not remove the private video. Nothing was changed. / The video was removed from Cloudflare but could not be detached. Please contact support. / Private video upload is not configured yet. | I, F | Add video · "Videos take a few minutes to be ready. You can keep writing." (Check status automatically.) Remove "Cloudflare" and "contact support": "Couldn't remove the video. It may still show on the family page. [Check the story] [Try again]" *(corrected 24 Sep: "it's safe to leave" claimed a state the screen can't know after a partial failure)* |
| Home editor | Home page editor / Home / Changes appear on the family page after it is refreshed — an already-open page will not update by itself. / Status: Published / Title / Your words / Write normally. Leave a blank line between paragraphs. You can save with an empty body. / Advanced: edit blocks as JSON / Save draft / Publish / Unpublish / Attached photos / Uploading or attaching a photo saves it in Admin immediately. The family sees photos only after the Home page is published — use the Publish button above. / Draft saved. / Published. The family page is live. / Unpublished. The family page now shows the waiting message. / Please enter a title before saving. / The advanced JSON is not valid JSON… / Content is not valid… / This content has heading, quote, or media blocks. The simple editor keeps only paragraph text… / Cannot switch… / Continue with plain text / Keep the JSON editor / Use the simple text editor | I | **Same writing surface as stories.** Status: "Family sees this version" / "Your changes aren't shared yet". Actions: **Update family page** / Hide from family… Drop the refresh note by making family pages fetch fresh content on navigation (they already do: `force-dynamic`). Drop the JSON mode. |

## 8. Accessibility names worth fixing
- Carousel dots: "Photo 1" → "Photo 1 of 6". Use buttons, not `role=tab` (F-17).
- Chapter scene images: `alt=""` + `aria-hidden` is right while decorative. Retire them with the characters.
- Admin dashboard thumbnail fallback alt: "First attached photo for {title}". Keep the real description when one exists.
- "Remove this photograph forever" is a `<summary>` 17 px tall at 1440 px, below the 44 px minimum. Make it a button with a 44 px target.

## 9. Patterns to watch for (for DESIGN_SYSTEM.md)
*(Corrected 24 Sep: these are review prompts for **interface** text written by builders and agents, not bans, and they never apply to the family's own writing or captions. The problem they catch is repetition and a voice nobody in the family uses, not any single device. "Come on in", a heart beside her name or an occasional joke are fine.)*
1. No UI line that describes the product's own design or philosophy.
2. Watch for one whimsical device repeated across every system state (pages "playing hide-and-seek", the internet "wandering off"). One joke is charm; the same joke on every error screen is a template.
3. Watch for machine-made captions built on the same triad or wonder-ending shape. A family-written caption can be sentimental, repetitive or silly: that's the family's voice.
4. Watch for "small", "little" and "tiny" piling up in interface text.
5. No "Private family …" labels. The privacy is real; the label adds nothing.
6. One name per thing, as in the §1 and §5 tables.
7. No claim the software can't check ("Nothing was changed", "exactly where you were", "Your memories are still safe").

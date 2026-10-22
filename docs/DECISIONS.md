# Pawpaw decision ledger

Newest first. Each production fix records its cause, the fix, how it was verified, the data check, and what it still cannot do. No private family content, photo addresses, identifiers or credentials here.

## 2026-10-23 · Her days keeps itself up to date, and every photo gets a line in Sujith's voice

**Asked by Sujith:** photos he sends to one folder should turn up on heyvarada.in by themselves, and every photo, old and new, should carry a line that sounds like a father or a friend talking, not a caption bot.

**Decisions (approved by Sujith):**
- **Source:** a "Her days" folder in his Google Drive, shared with Pawpaw's own Google helper (read-only).
  - From the phone: Google Photos → Share → Drive → Her days. That share is the only manual step.
  - Pawpaw looks in the folder once a day at 5 a.m. India time, whenever someone opens her days (at most every 15 minutes), and while the desk is open.
  - History comes straight out of the album's Takeout zip in Drive, read a piece at a time; nothing is unzipped and the zip isn't changed. Google's own record of when each photo was taken, and any description he wrote, come with it.
  - This replaces the Photos Picker from 22 October. Nothing from the Picker had come in yet.
- **Lines:** Claude drafts, Sujith decides on the desk: keep, write his own, ask for another, or none.
  - Nothing drafted reaches the family until he keeps it. A photo shows straight away, and its line follows later.
  - The 15 story photos with lines written by an earlier AI pass are queued to be redrafted. The old line stays up until he picks a new one. His own five lines are untouched.
  - The model gets his five lines as the voice, her names and her people, and the photo's date and age. It's told not to describe the photo or invent places, events or people.
- **Dates:** the camera's clock wins, then Google Photos' record, then the time hidden in the photo, then the file name, and last the day it reached the folder (sent for a look). Pixel file names are UTC and are read that way.
- **Duplicates:** a photo that is in both the album and the folder (same file name, taken within two minutes) goes on once.

**Data:** additive migration `her_days_folder_and_lines`.
- Widens the allowed sources and date kinds on the Her days tables.
- Adds columns to `import_items`.
- Adds `caption_drafts` and `her_days_state` (service role only).
- Adds `take_her_days_turn`, so only one look runs at a time.
- Applied 23 October; nothing outside Her days changed.

**New running costs (flagged):**
- Anthropic API, pay as you go: about $0.012 a photo, roughly ₹1,000 once for the album, then a few rupees a week. It needs Sujith's own key; drafting stays off until it is added.
- Google Cloud service account: free.
- Vercel daily schedule: included in Hobby.
- **Storage:** the album is about 993 files. At about 0.5 MB a photo with its resized copies, that's roughly half of Supabase's free 1 GB. After that there's room for about 900 more photos, around a year at 15 a week. Then it's Supabase Pro ($25 a month), or smaller copies.

**Recovery:**
- Every file is written down before it's copied.
- A look cut short is picked up by the next one.
- A failed file is tried twice more on later looks, then listed on the desk as "Didn't come through".
- Videos go on once they're ready to play.

**Verified:** 36 Her days unit tests, including one that runs from start to finish against a fake Drive: a folder photo, an album photo and a twin go in, the twin goes in once, and a second look adds nothing. ZIP64 reading, sidecar matching, the line flow and the desk decisions are also covered. Screens checked at 360, 390, 768 and 1440 px. Typecheck, build and the full unit suite (315) pass.

**Limits:**
- Nothing arrives until it's shared to the folder.
- Videos over 500 MB, or too slow to send within one look, end up under "Didn't come through".
- The full-year 2026 Takeout zip is deliberately not read, so photos that aren't hers stay off.
- Lines need the Anthropic key.
- Claude, ChatGPT and Instagram exports are still to come.

## 2026-10-22 · Her days: every photo on her chart, brought in from Google Photos

**Asked by Sujith:** carry the growth timeline into heyvarada.in so new photos keep appearing as she grows, without scripts or rebuilds.

**Decisions (approved by Sujith):**
- **Source:** Google Photos through Google's Photos Picker.
  - Since 31 March 2025, Google lets apps read only photos the person picks (or photos the app uploaded itself), so fully automatic detection of new photos isn't possible.
  - What's automatic: copying, India-time dating, de-duplication, placing on her days, video preparation.
  - What stays manual: one tap and a pick in Google Photos, as often as wanted.
  - History comes in the same way, from the album. The Takeout archives stay untouched as a backup.
- **Publishing:** picking a photo is the approval; it goes straight on, and any photo can be hidden from the desk.
  - Waiting for review instead: photos with no date, a date before her birth or in the future, WhatsApp copies (their date may be when they arrived), and screenshots.
- **Design:** a quilt of her days (mockup C) on top; a tapped week opens as her height chart (mockup A).
- **Storage:** imported photos are kept at 1600 pixels (about 0.3 MB plus resized copies), to stay inside Supabase's free 1 GB for roughly the next 1,800 photos. Pawpaw is not the photo backup; Google Photos is.

**Data:** three new tables (`timeline_media`, `import_runs`, `import_items`) and one function, `claim_import_items`, which is service-role only. Additive; nothing existing changed.

**Recovery:**
- Every picked item is written down before it's copied.
- Items stuck mid-copy are handed out again after 10 minutes.
- Failures keep a plain-language reason and can be retried while Google's links last (about an hour).
- Picking the same photos again is always harmless.

**Limits:**
- Nothing arrives until someone picks it.
- Google's sign-in client must be set up once.
- Videos over 500 MB are skipped with a reason.
- Photos dated before her birth stay off the quilt.
- Family quotes aren't pulled out of stories automatically.
- Claude, ChatGPT and Instagram writing need one-time exports first; not built yet.

## 2026-09-25 (evening) · Everything deletable and editable (PRs #16–#20)

**Asked by Sujith:**
- every story and photo can be removed, published or not;
- her names and her people are editable;
- maushi removed; Raghu is also "nunnumaman";
- her people shown one at a time, so nobody comes last;
- names animate on every device;
- ages counted in days up to 28.

**Decisions:**
- **Published history stays locked** against edits.
  - Two service-role functions can remove it on purpose: `delete_story_everywhere` and `delete_photo_everywhere`.
  - They work through a transaction-local flag that the history triggers honour.
  - A story delete also removes videos that belong nowhere else.
  - A photo delete strips the photo from every draft and version, then removes the file and its resized copies.
- **Deleting is safe against other tabs.** It first saves, then checks the words' fingerprint, so a version the author hasn't seen is never deleted.
- **Her names and her people live in `family_lists`**, edited from Desk → Names.
  - Saves are conditional on the last saved time.
  - If the saved lists can't be read, the desk refuses to edit, so the starting lists can never overwrite them.
- **Her people rotate from a random start** each visit, with Pause, and tapping a name shows the next. Names under her name cycle even with reduced motion; that setting only drops the fade.
- **Fixed site text:** `docs/COPY.md` maps every piece to its file. The audit reports are now kept in the repo.

**Production fixes found by the live check:**
1. **Pause didn't hold.**
   - Cause: pressing Pause during a fade let that change finish.
   - Fix (#18): pausing cancels the change in progress.
   - Verified: live check; the person stayed put for 6s after pausing.
2. **Pause button out of line.**
   - Cause: on wide screens the button escaped the section's column.
   - Fix (#19): wrapped the section.
   - Verified: screenshot at 1440px.
3. **Bars and footer at the page edge.**
   - Fix (#20): they share the content column.
   - Verified: measured left edges of 120px at 1440px and 40px at 1000px on Home, the desk and the editor.

**Data:**
- The two August test drafts were deleted through the editor.
- Afterwards: 0 test items, 0 orphaned revisions, 0 orphaned videos; 6 stories, all on her page.

**Limit:** a file that can't be removed from storage after a delete is reported, not queued for retry.

## 2026-09-25 · Picture-book overhaul goes live (PRs #10–#14)

**Decision:** Direction B with elements of C, white reading pages, one shared story renderer for the family and the preview, and one continuous editor that saves itself. Approved by Sujith for the full scope.

**Platform decisions:**
- **Photos:** served through `/p/<sealed address>`. Access is checked, each photo is resized once and kept, and the address is the same every time, so a family member's own browser keeps photos (`private`, 30 days).
- **Videos:** get a playback link only when someone presses play.
- **Functions:** run in Mumbai (`bom1`), next to the database.
- **Story colours:** kept in `visual_scene` (an additive migration).
- **Editor safety:**
  - a fingerprint of the words stops a save that would overwrite a change made elsewhere;
  - words are kept in the browser until the server has them;
  - a signed-out editor never navigates away.

### Production fixes found by the live check (PR #11)

1. **Copybook lines struck through notes on Home.**
   - Cause: the guide lines were drawn at fixed heights on each row, so a wrapped row put a line through the note.
   - Fix: each name carries its own line.
   - Verified: screenshots at 390px and 1440px.
   - Data: none touched.
   - Limit: none known.
2. **Home photo strip stretched on phones.**
   - Cause: the image's height attribute overrode the 4:5 crop.
   - Fix: `height: auto`.
   - Verified: screenshot at 390px.
   - Data: none touched.
3. **Desktop sections out of line with the opening spread.**
   - Fix: one shared column.
   - Verified: screenshot at 1440px.
4. **Stories list flagged First Days as "changes not up yet" when nothing had changed.**
   - Cause: the list compared timestamps, and a photo change moves the timestamp.
   - Fix: compare words, cover and photos with what the family sees.
   - Verified: database comparison showed First Days identical to its live version.
   - Data: none touched.

### Speed fix (PR #13)

**Photos re-downloaded on every visit.**
- Cause: each page render sealed photo addresses with a random value, so the browser could never reuse a photo.
- Fix: steady addresses and private browser caching.
- Verified: unit test that the same photo gives the same address and different photos give different ones.
- Limit: a photo a device has already seen stays in that device's browser cache for up to 30 days after Leave.

### Content (25 Sept)

- **Published:** She Arrives, My Pawpaw and The Hours of Varada (15 July, 6 weeks), and The Baby in the Glass (16 weeks).
  - They were entered through the editor, with the text read from files.
  - Verified identical to the source by a hash of every block.
- **Corrected** "Ammama" to "Acchamma" in The Day You Arrived and the Home note.
- **Dated** The Day You Arrived and First Days to 29 May (day 0).

### Known limits

- Two test drafts from August verification runs remain. They were published once, and published history can't be deleted by design.
- Alt text for newly uploaded photos is a generic line until a caption is added.
- Preview deployments can't be opened from the build sandbox (the network policy blocks `*.vercel.app`), so checks run against production with a rollback ready.

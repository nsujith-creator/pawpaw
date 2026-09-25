# Pawpaw decision ledger

Newest first. Each production fix records its cause, the fix, how it was verified, the data check, and what it still cannot do. No private family content, photo addresses, identifiers or credentials here.

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

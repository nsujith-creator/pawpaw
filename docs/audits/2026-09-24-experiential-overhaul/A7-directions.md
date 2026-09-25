# A7 — Three art directions and a recommendation

[← Owner report](00-owner-report.md)

**What was made.** For each direction there is a **static HTML composition** of:
- the same **family slice**: Home opening, Sujith's note, Stories list and the opening of *The Day You Arrived*;
- the same **admin slice**: editing *The Day You Arrived* on a phone.

All use real published text and real photographs. They are rendered with Chromium at **390×844 and 1440×900** (full page and first screen).

These are **static compositions, not interactive prototypes**. Nothing in the app was changed, no dependency was added, and nothing was published. Fonts load from Google Fonts at render time only (OFL, free).

**Where to look (private, contains family photos):**
- `test-results/private-audit-2026-09-24/proposals.html` — one page with all 24 renders side by side.
- Sources: `test-results/private-audit-2026-09-24/proto/{a,b,c}-{family,admin}.html`
- Renders: `test-results/private-audit-2026-09-24/proto/render/`

**How the three differ.** They are not colour variants: each changes the page structure, navigation model, type system, photo treatment and the source of imagination.

| | A · Kasavu notebook | B · Picture-book spreads | C · Height chart |
|---|---|---|---|
| Governing idea | The family's own notebook, edged with the gold border of her Noolukettu cloth | Every memory is a picture-book spread: a flat colour page facing a real photograph | The archive is measured in her age, like pencil marks on a door frame |
| Where imagination comes from | Her many names and the family's kinship words, set as typography | Flat cut-paper shapes of things **actually in her photos** (ducks, balloon, butterfly, marigold, flower crown, cake candle) | Pencil ticks, crayon highlights, graph paper, ages as the headline |
| Structure | Margin column (dates, ages) + reading column + photo column; stories as a table of contents | Two-page spreads (desktop), page-by-page (phone); stories as book covers | One vertical ruler; memories hang at the age they happened; stories open from the ruler |
| Navigation | Home · Stories · Photographs · Leave | Home · Stories · Leave | Her chart · Stories · Leave |

---

## Direction A — Kasavu notebook
*Renders:* `proto/render/a-family-{390,1440}-{fold,full}.png`, `a-admin-…`

- **Composition:**
  - A thin double gold band (the kasavu border) opens every page and separates sections.
  - Desktop: a three-column page. A narrow margin holds the date and her age ("Written 19 July 2026 · V was 7 weeks and 2 days old"), the centre column holds her name and acchan's note, and a matted photo sits on the right.
  - Phone: name → note → photo (full-bleed) → who's who → stories.
  - Stories are a table of contents: title, author, photo count and a one-line italic summary.
- **Palette roles:**
  - Cotton `#FBF8F1`: page. Kajal ink `#1D1A2B`: text.
  - Kasavu gold `#C28E2C` / `#E6C275`: borders, labels, signature only, never body text.
  - Rose `#C8416B`: her nicknames only.
  - Swaddle teal `#0F6E6A`: links and focus.
- **Type roles:**
  - Newsreader (display 400 at 8.5 rem; reading 1.2 rem/1.72; italic for names and signatures).
  - Instrument Sans for labels and UI (500/600).
  - Noto Serif Malayalam for the Malayalam kinship words (`lang="ml"`).
- **Photo treatment:** one photo per spread, matted in white with a hairline border, whole-image `contain`, full-bleed on phones. No rounded corners.
- **Artwork language:** none beyond the kasavu band and typographic play with her names. The characters are retired.
- **Sample copy:** "A note from acchan" · "Who's who in these pages: amma (അമ്മ) — mother, Paru; acchan (അച്ഛൻ) — father, Sujith …" · "Stories".
- **Interaction character:** quiet, fast page loads, and no motion except a 120 ms focus/press response. Reading-first.
- **Family ↔ admin:** the same paper, gold rule and serif writing surface. The admin looks like writing in the notebook.
- **Why it's Varada's:** the kasavu band comes from her Noolukettu. The kinship glossary uses this family's words (who amma, acchan, acchachan, acchamma and maushi are). Her five names are set as a line of their own.
- **Removes:** cream-card template, pastel blobs, characters, whimsy copy, the landing-page hero.
- **Risks:**
  - It is the closest to "tasteful beige editorial", the thing you said you don't want. Childlike energy depends entirely on type and names; there is little delight for a child.
  - The Malayalam glosses must be checked by the family.
  - *(Added 24 Sep after review)* On a phone the long note and the name glossary come **before the first photograph**, so the page opens on text.
  - *(Added 24 Sep, second review)* The prototype keeps acchan's note saying "the 1st pic is V on her noolukettu day" while showing a different photo first. Moving photos means re-checking the words next to them (A5b §4).
- **Asset needs:** the camera originals for the Noolukettu photos; one photo per named family member (A6 brief #3).

## Direction B — Picture-book spreads *(recommended)*
*Renders:* `proto/render/b-family-{390,1440}-{fold,full}.png`, `b-admin-…`

- **Composition:**
  - Desktop: each page opens as a spread, with a **flat colour page** on the left carrying her name or the story title in big friendly type plus one or two cut-paper shapes, and the **photograph on white** on the right.
  - Below the spread: acchan's note in a comfortable reading column, then the Stories shelf as book covers (photo top, colour band with title below).
  - A story opens with its own spread (colour page + key photo); the letter then reads as a normal column with photos placed inline at column width. "Mol aanu." is set as a large coloured line with its English meaning beneath.
  - Phone: the spread becomes colour page → photo → text, one after another.
- **Palette roles:**
  - Paper `#FFFCF6` behind all reading and controls; ink `#22163A` for text.
  - Colour pages sampled from each story's cover photo, clamped to a small set: duck yellow `#FFC93C`, swaddle teal `#0E7C74`, flower-crown rose `#E4486E`, sky `#2F6F9F`, leaf `#5AA05A`. Text on them is ink or white, chosen per colour for ≥ 4.5:1.
  - **Correction (24 Sep):** the prototype breaks this rule. White on rose `#E4486E` is **3.85:1**, and the rose book card uses small white text at 92% opacity. Either darken the rose to about `#C8325A` (5.2:1 with white) or put ink text on it. Leaf `#5AA05A` with white also needs checking before use.
  - The colour fills whole pages. It is never a tint behind body text.
- **Type roles:**
  - Bricolage Grotesque 800 for names, titles and labels (tight −0.05em at display sizes): a friendly grotesk with irregular, hand-set shapes that looks drawn rather than corporate, and has optical sizes for small labels.
  - Literata 400 for reading (1.06–1.2 rem / 1.65–1.7): a serif built for long reading on screens, and good on phones for older eyes.
  - Anek Malayalam or Noto Sans Malayalam when Malayalam appears.
- **Photo treatment:** whole-photo, on white with a soft shadow, never cropped on the reading page. Covers on the Stories shelf may crop (4:3) with a focal point, the one place focal points earn their keep (F-24). Rounded corners are dropped; the two baked-frame files are replaced (A6).
- **Artwork language:**
  - Flat cut-paper shapes with a 2–3 px offset "paper shadow", 1–3 per colour page. In this prototype they are drawn from objects in her photos: the duck and balloon for Home, a butterfly for the photoshoot pages, and later a marigold, a candle, a kasavu stripe. That is a **starting source, not a rule** (corrected 24 Sep): family jokes and deliberate fantasy are equally valid, as long as nothing pretends to be a real event.
  - The prototype's *Day You Arrived* spread uses a butterfly. The letter does include the "Butterfly Season" photoshoot photo, but a butterfly on the opening of a letter that goes through surgery, low iron and phototherapy is a tone choice that needs your eye, not an automatic fit. The same goes for the duck, balloon and star: familiar children's devices. They are hers here, but the prototype doesn't yet show anything no other baby site could have.
  - Hand-authored SVG, a few paths each, no gradients. They are obviously paper, never Varada, so fantasy is clearly separated from memory.
- **Sample copy:** "Varada's family pages" · "Varada — also pawpaw, pupu, chakku, chundaramutthu and shanku" · "A note from acchan" · "Stories" · "Next: Seeing You →".
- **Interaction character:**
  - On desktop a story is one scroll, with spreads at chapter breaks.
  - One signature motion: when a story opens, its cut-paper shape slides 12 px into place over 240 ms. It is immediate under reduced motion.
  - Buttons are ink pills; the current nav item is filled.
- **Family ↔ admin:**
  - The admin uses the same paper and fonts, with the colour chosen in the editor ("Page colour", suggested from the cover photo).
  - The writing surface is one continuous page with the story's own typography (F-03).
  - A single status band says what family can see.
- **Why it's Varada's:** the ducks and gold are hers (the home-5 photo), the butterfly and flower crown are from her photoshoot, and teal is the hospital swaddle she was wrapped in. Every colour and shape can be traced to a photograph of her. Her five nicknames are the hero line.
- **Removes:** the painted-baby characters, cream-and-card template, pastel blobs, nested frames, whimsy system copy, the step wizard. (Whether First Days keeps its own nav item is your call, F-15.)
- **Risks:**
  - (i) Flat colour pages can **overpower a quiet photograph** if the sampled colour is loud. Mitigation: clamp to the palette and let the author pick.
  - (ii) The **motif library needs discipline**: few shapes per page, each with a reason (from her photos, a family joke, a deliberate fantasy), one drawing style. Without that it becomes sticker-scrapbook. *(Corrected 24 Sep: the earlier "≤ 3, photographed objects only" was a starting guess, not a rule.)*
  - (iii) Bricolage at 800 weight can feel shouty for sad passages (*The Blue Light*). Mitigation: a quieter colour page and no motif when the author chooses "No picture".
  - (iv) Phones get tall pages. That's acceptable because it reads as a book, but test with the 22-block letter.
- **Asset needs:** camera originals for home-1 and home-5; about 8 cut-paper SVG shapes (duck, balloon, star, butterfly, marigold, flower crown, candle, kasavu stripe), hand-drawn in code or by an illustrator. Cost: owner time or a small one-off freelance job, **UNVERIFIED** amount, well under the INR 10,000 monthly ceiling.

## Direction C — Height chart
*Renders:* `proto/render/c-family-{390,1440}-{fold,full}.png`, `c-admin-…`

- **Composition:**
  - Graph-paper page. A 3 px graphite ruler runs down the left, and each memory hangs off a crayon-red tick labelled with her age ("7 weeks · 19 Jul", "1 month", "28 days · named", "2 days", "1 hour", "0 · born").
  - The top reads "*Varada*, so far", with her name highlighted in yellow.
  - Photos are white-bordered prints in a sideways strip. Stories open from their tick.
  - Phone: the ruler narrows to a 4.6 rem gutter.
- **Palette roles:**
  - Graph-paper white `#FDFDF8` with `#DDE8F3` rules; graphite `#34343C` text.
  - Crayon red `#E0452B` for age ticks only, highlighter yellow `#FFE066` for her name and the current nav, and a single link blue `#2D6CDF`.
- **Type roles:**
  - Young Serif for titles: soft, chunky, children's-book warmth.
  - **Atkinson Hyperlegible** for all reading, chosen for grandparents on phones, since it was designed for low-vision legibility.
  - DM Mono for ages and dates.
- **Photo treatment:** small tilted prints in strips (a ±1° tilt), with a big print for key moments.
- **Artwork language:** none but the ruler, ticks and highlighter. Imagination comes from the height-chart idea itself.
- **Sample copy:** "Varada, so far" · "7 weeks and 2 days of her, marked here as the family writes them down." · "Her chart starts here."
- **Interaction character:** scrolling down goes back in time. The newest mark is on top. A future "jump to age" index can be added.
- **Family ↔ admin:** the admin's first question is "Where does this sit on her chart?" The event date places the story and the age is calculated.
- **Why it's Varada's:** it organises the archive by *her* age, the one axis that will still make sense in 20 years, and makes chronology (a stated permanent foundation) the navigation.
- **Removes:** everything A and B remove, plus the Stories-as-list mental model.
- **Risks:**
  - Needs a **birth date and an event date on every item**. Today most items have none, and the birth date would have to be entered. This audit did not invent one.
  - With about 7 weeks of material, the ruler is short and front-loaded.
  - Desktop leaves a wide empty right side unless a second column is designed (visible in the render).
  - Door-frame height marks are a shared cultural image rather than hers alone.
  - *(Added 24 Sep after review)* At 1440 the right side of the page is largely unused. On a phone the ruler takes width from the photos, and the photo strips are cut off at the edge. A story that spans several days has to be pinned to a single age mark.
- **Asset needs:** dates for every story and photo; otherwise none.

---

## Recommendation: **B — Picture-book spreads**, borrowing one element from C

**What B has not yet proven (added 24 Sep after review).** Take this as a recommendation of the most promising **starting point**, not a finished destination:
- The boards are **not an equal comparison**. B was shown with a story spread and an excerpt; A and C mostly with Home and an index. None was tested on the same reading task.
- **No direction shows the whole letter.** On a phone, B's title panel → photo → text rhythm could get long and repetitive over 22 blocks. That is unknown until the full letter is built.
- **No admin board proves the editor.** All three admin mock-ups show the toolbar over the writing area, and a static image can't show keyboard, scrolling, photo placement, saving or recovery.
- **The photo treatment is unproven**, because the two baked-frame photos (home-1, home-5) are still in the boards until the originals arrive.
- **It isn't yet the transformed, imaginative experience you asked for.** It's a clearer structure and a braver palette.

**The next useful proof** (not built): the complete *Day You Arrived* in B at 360 px and 1440 px, plus a clickable phone editor for the same letter, both on synthetic or approved copies. Build it before any code is committed to the direction.


**Why B.**
1. It changes the energy most: stronger colour, larger photographs and a clearer reading structure. Its imaginative layer can't be mistaken for a real memory. (Corrected 24 Sep: this is not a claim that characters or fantasy are wrong; see D-02.)
2. It changes every axis you listed: composition (spreads), imagery (cut paper instead of painted babies), colour (flat, photo-derived pages instead of cream), typography (Bricolage + Literata instead of Fraunces + Manrope), reading rhythm (spread → column → spread), copy (plain interface, family voices kept), navigation (Home · Stories · Leave) and interaction (one writing surface).
3. It is cheap to keep consistent: the rules fit on one card, and new stories add one colour and at most three shapes.

**Borrow from C (small, compatible):** show her age at the time on every story card and spread ("2 days old"), calculated from one birth date the owner enters once. This makes chronology visible without making the ruler the whole design.

**Challenging B's weakest assumptions.**
- *"Sampled colour flatters the photograph."* Not always. A saturated page next to a sleepy, low-contrast photo can make the photo look dull. **Test** with home-6 (green towel) and story-5 (strawberry blanket) in the slice before committing.
- *"Cut-paper shapes read as imagination, not decoration."* Only if each one has a reason: from the story, a family joke, or a deliberate fantasy. Without a reason, they drift into stickers.
- *"Bricolage is playful but not childish."* At 800 weight and large sizes it is, but it may look like a toy brand on the admin screens. The admin uses the 600 weight at smaller sizes. Confirm on your phone.
- *"Family will scroll long spreads on phones."* Test it: the slice must include the full 22-block letter at 360 px, and you read it through on your own phone. (The earlier fixed 1.3× length limit is withdrawn: it would penalise meaningful photographs.)

**Your decision is still needed.** Choose A, B, C, or B + the C age line. Nothing is adopted until you say so.

## How the experience changes (B), in plain terms
- **Signing in:** the page says whose pages these are and who to ask for the passphrase. One button. No slogans.
- **Home:** her name, big, on a duck-yellow page, with her five nicknames. A real photo of her with the ducks next to it. Then acchan's note, labelled as his. Then her stories as covers. Photos appear in about a second on a phone, and they still work if you leave the tab open.
- **Reading a story:** a title spread in the colour of that day (teal for the hospital swaddle), then the letter as a calm column, with photos where they belong and "Mol aanu." set big with its meaning. At the end, "Next: …", not a slogan.
- **Writing (Sujith or Paru on a phone):** open the story and it looks like the story. Type anywhere; paragraphs are just paragraphs. Tap *Photo* to put a picture where the cursor is and write its caption right there. It says "Saved just now". When ready, tap **Update the family page**. If Paru changed it in the meantime, you're told before anything is overwritten.

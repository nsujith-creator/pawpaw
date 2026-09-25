# Pawpaw Design System

**Status:** Live on heyvarada.in since 25 September 2026.
**Direction:** B (picture-book spreads) with selected elements of C (the height chart), chosen by Sujith.
**Replaces:** the 19 July 2026 system (painted characters, cream paper). Git history keeps that version.

## The idea

Her pages are a picture book about a real child. A whole page of flat colour faces a real photograph. Words sit on white paper. Her stories hang on a height chart at her age when each one happened.

## Colour

| Token | Hex | Use |
|---|---|---|
| paper | #ffffff | Every reading page. Never beige or cream. |
| paper-2 | #f5f6f9 | Quiet panels on the desk. |
| ink | #22163a | Text, pills, rules. |
| ink-2 | #4a3f5c | Captions and secondary text. |
| graphite | #34343c | The height-chart line. |
| crayon | #c23a22 | Age ticks and errors (5.35:1 on white). |
| duck | #ffc93c | Colour page with ink text. |
| teal | #0e7c74 | Colour page with white text. |
| rose | #c8325a | Colour page with white text. |
| sky | #2f6f9f | Colour page with white text; focus ring. |
| night | #22163a | Colour page with white text. |

Each story has one of the five page colours (duck, teal, rose, sky, night). It appears on the story's opener, its chart cover, and as a 4px line down the side of the words. The author picks it in the editor; otherwise it comes steadily from the story's address.

## Type

- **Bricolage Grotesque** (500–800): titles, labels, buttons, captions.
- **Literata** (400/500, italic): the words of every story and note.
- **Baloo Chettan 2** (600–800): Malayalam, rounded. Used for her names and her people.

## Pages

- **Home:**
  - a spread: വരദ on duck yellow, facing her photo;
  - her stories on the height chart, with acchan's note beside it;
  - her names on teal, on copybook lines. Each name carries its own writing line, so nothing crosses a note when a row wraps;
  - her people on sky;
  - an ink footer.
- **A story:**
  - a colour page with the age, author, title and summary, facing the cover photo;
  - the words on white beside the story colour. Said lines are large display type in the story colour, and lines over 40 characters are smaller;
  - photos placed in the words where they belong; the rest follow, paced wide, pair, inset and small;
  - it ends with "Next on her chart".
- **States** (not found, error, empty): one whole colour page with a plain sentence and one or two pills.
- **Sign in:** a duck cover with വരദ; one field.

## Layout

- Phones first. A 16px side gutter; 44px minimum touch targets.
- From 900px wide, spreads and sections share one column, `min(1200px, 100% − 80px)`, so every left edge lines up.
- Photos are never cropped on story pages. The Home strip and chart covers crop to fixed shapes.

## Motion

Two things move on Home, both slowly and one item at a time:

- the "also pawpaw, pupu…" line under her name cycles through her other names;
- her people show one person at a time, starting from a random person each visit so nobody always comes last. Pause stops it; tapping the person shows the next.

Both keep cycling under reduced motion; that setting only drops the fade. The full lists are always there for screen readers.

## Words on screen

Sujith's voice: plain, warm, a little wry, lower-case where he writes lower-case. Say what happened and what to do next. No system whimsy, no revision numbers, addresses or storage words on screen.

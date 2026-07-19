# Pawpaw Design System

**Status:** Approved Release 2 visual foundation

**Approved by:** Sujith, 19 July 2026

**Applies to:** the private family archive, family login, Admin, and future Pawpaw interfaces only when separately authorised for implementation

**Implementation state:** Batch 1 family-surface implementation and automated evidence gate are complete in the uncommitted working tree; explicit product-owner visual review remains. Batch 2 is unauthorised.

This is the canonical visual system for Pawpaw. It translates [PRODUCT_PHILOSOPHY.md](PRODUCT_PHILOSOPHY.md) into approved visual rules and must be read with the repository's privacy, truth, accessibility, and release boundaries. Approval of this foundation does not authorise UI coding, new routes, new content types, production changes, or deployment.

Documentation alone is not a visual 10/10. The visual decisions below are approved because Sujith approved the supplied proof artefacts, not because this prose describes them.

## Approved visual-proof index

- [Visual-proof pack and approval boundaries](visual-proof/README.md)
- Typography: [desktop](visual-proof/typography-desktop.png), [375px mobile](visual-proof/typography-mobile-375.png), and [six-photo stress test](visual-proof/typography-six-photo-stress-test.png)
- Colour: [A4 palette PNG](visual-proof/colour-palette-a4.png), [A4 palette PDF](visual-proof/colour-palette-a4.pdf), [photo context](visual-proof/colour-photo-context.png), and [375px mobile](visual-proof/colour-mobile-375.png)
- Character: [Varada character system](visual-proof/varada-character-system.png)
- Page concepts: [Home](visual-proof/home-chapter-concept.png), [Her Story chapter header](visual-proof/her-story-chapter-header-concept.png), and [Admin dashboard](visual-proof/admin-dashboard-concept.png)

## 1. Canonical visual direction

> Pawpaw is a cinematic, illustrated storybook of Varada's real life—built around truthful photographs, chapters, chronology and family voices, but animated by vivid colour, humour, expressive characters, contemporary energy and childlike imagination.

This is **Direction B-led with selected Direction C energy**, not a 50/50 hybrid.

Direction B supplies:

- “The Book She Lives In”;
- cinematic illustrated-storybook structure;
- truthful photographs;
- chapters, chronology, authorship, and family voices;
- distinct chapter worlds;
- adaptability from infancy through adulthood.

Direction C contributes:

- vivid, controlled colour and immediate joy;
- humour and expressive character reactions;
- playful annotations and occasional restrained sticker-like details;
- bold scale and controlled asymmetry;
- contemporary energy and newborn baby-girlish personality.

The permanent guardrails are privacy, truth, dignity, accessibility, photograph integrity, authorship, chronology, readable hierarchy, secure publishing, and operational clarity. They protect the imaginative experience; they do not require a sombre visual mood.

**Binding principle:** Joy does not conflict with truth. Colour does not conflict with dignity. Illustration does not conflict with privacy.

## 2. Typography

The approved pairing is locked and must not be reopened during implementation planning:

- **Display and chapter typography:** Fraunces, weight 500.
- **Body and interface typography:** Manrope.
- **Malayalam fallback:** Noto Sans Malayalam only where Malayalam appears.
- Every Malayalam element uses `lang="ml"`.

Georgia and system sans are fallback fonts only, not Pawpaw's intended identity:

```css
--font-display: "Fraunces", Georgia, "Times New Roman", serif;
--font-body: "Manrope", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-malayalam: "Noto Sans Malayalam", "Manrope", sans-serif;
```

Typography rules:

- Use Fraunces 500 for display names, chapter titles, major story headings, and selected quotations.
- Use Manrope for family prose, captions, metadata, navigation, forms, controls, and Admin.
- Use weight, scale, position, and space before adding colour.
- Long reading text stays between `58ch` and `72ch`, with about `66ch` as the default.
- Body text remains left aligned; do not centre paragraphs longer than two short lines or justify text.
- Avoid ultra-light body text, faux handwriting for body copy, decorative uppercase, and more than three active weights in one composition.
- The approved Batch 1 implementation loads these faces with the installed `next/font/google` integration, emits self-hosted build assets, and makes no runtime request to Google Fonts. The production build and computed browser-family checks are recorded in `docs/PROJECT_STATUS.md`.

Approved evidence: [desktop](visual-proof/typography-desktop.png), [375px mobile](visual-proof/typography-mobile-375.png), and [six-photo stress test](visual-proof/typography-six-photo-stress-test.png).

## 3. Colour

Warm cream is the foundation, not Pawpaw's full personality.

### Foundation tokens

```css
--color-canvas: #FFF8EE;
--color-surface: #FFFDF7;
--color-surface-deep: #F7F1E4;
--color-paper: #FFFEF8;
--color-ink: #2A1F14;
--color-ink-secondary: #5C4E3D;
--color-ink-muted: #8C7E6D;
--color-border: #E0D5C4;
--color-border-strong: #C4B8A6;
```

### Chapter tokens

```css
--color-home-primary: #E8526A;
--color-home-soft: #FCEAED;
--color-home-on-soft: #8B1A2F;

--color-story-primary: #9B5FC0;
--color-story-soft: #F2EBF8;
--color-story-on-soft: #4E1A6E;

--color-letter-primary: #4590CC;
--color-letter-soft: #E6F1FA;
--color-letter-on-soft: #1A4878;

--color-gallery-primary: #E35F45;
--color-gallery-soft: #FDEEE9;
--color-gallery-on-soft: #7A2C15;

--color-moment-primary: #359575;
--color-moment-soft: #E5F4EF;
--color-moment-on-soft: #185C40;

--color-neutral-primary: #5F5E8A;
--color-neutral-soft: #EEEEFC;
--color-neutral-on-soft: #2A2950;
```

### Semantic-state tokens

| State | Strong | Soft | On-soft |
|---|---|---|---|
| Success | `#23633B` | `#E5F2EB` | `#0F3D22` |
| Warning | `#7A5511` | `#FEF6E4` | `#4A3208` |
| Error | `#B33535` | `#FDEAEA` | `#6E1A1A` |
| Information | `#315F7A` | `#E4EEF5` | `#163347` |

Colour rules:

- Show at most two chapter accents in one viewport.
- Chapter colours never replace semantic colours.
- Never use colour as the only status cue.
- Do not create a pink-only identity or uncontrolled rainbow.
- Do not hardcode implementation colours outside approved tokens.
- Butter is illustration-only. Berry and plum are reserved for depth moments.
- Stable neutral surfaces remain behind reading text and operational controls.
- `--color-ink-muted` is for metadata at a suitable size, not body copy; implementation must verify contrast in context.
- Automatic photo-derived ambient colour uses the approved bounded OKLCH contract: surface lightness `0.92–0.95`, surface chroma no more than `0.06`, accent lightness `0.52–0.64`, accent chroma no more than `0.14`, surface alpha `0.16–0.24`, accent alpha `0.12–0.18`, and Home rose fallback `#FCEAED`.

Approved evidence: [A4 palette PNG](visual-proof/colour-palette-a4.png), [A4 palette PDF](visual-proof/colour-palette-a4.pdf), [photo context](visual-proof/colour-photo-context.png), and [375px mobile](visual-proof/colour-mobile-375.png).

## 4. Character and illustration

The approved foundation is [the Varada character system](visual-proof/varada-character-system.png).

The three approved expressions are:

- delight;
- wonder;
- sleepy.

The isolated delight, wonder, and sleepy production assets are approved. No other expression, costume, age, pose, family character, or production asset is approved by this milestone.

The character grammar is:

- clearly illustrated and never photorealistic;
- warm, painterly, and vector-friendly;
- soft rounded forms, large expressive eyes, and rosy warmth;
- one coherent recurring face and set of proportions;
- controlled accessories and restrained, safe Indian visual cues;
- affectionate, curious, expressive, and professionally art-directed;
- never naughty-looking, mocking, generic, stock-like, or visually inconsistent.

The illustrated Varada is inspired by Varada but is never documentary evidence. She may accompany, react to, annotate, or frame memories, but never replaces a real photograph, represents a real event, covers Varada's face, or obscures important photographic detail. She may age with Varada only after later approval while retaining recognisable core traits.

Approval of the character foundation is not permission to mass-generate inconsistent character assets.

## 5. Home

[The approved Home concept](visual-proof/home-chapter-concept.png) governs the family-facing photographic opening. It must not be replaced by the Her Story chapter-header composition.

Required behaviour and composition:

- distinct desktop and 375px mobile compositions;
- one active real Varada photograph at a time;
- all six supplied photographs remain valid carousel slides;
- preserve the whole photograph and default to `object-fit: contain`;
- no autoplay;
- visible previous and next controls and visible position indication;
- the approved Home rose colour family;
- approved illustrated Varada around or beside the photograph, never covering the photograph or Varada's face;
- Fraunces 500 for the title and Manrope for family prose;
- a photographic carousel inside an illustrated storybook world;
- a complete static and reduced-motion composition.

Controls, captions, and decorative layers must not cover faces or essential detail. The carousel must support keyboard and touch operation while keeping stable dimensions across portrait, landscape, and square photographs.

## 6. Text-led chapter headers

[The approved Her Story chapter-header concept](visual-proof/her-story-chapter-header-concept.png) governs text-led chapter opening pages. It does not govern Home.

Required behaviour and composition:

- distinct desktop and deliberately recomposed 375px mobile layouts;
- Story orchid palette;
- strong, readable hierarchy for chapter label, title, and metadata;
- approved character confined to a dedicated illustration zone;
- no illustration covering words;
- no nested “warehouse crate” mobile composition;
- a clear reading surface after the chapter event;
- a complete final composition without animation.

These rules do not authorise new routes, content types, chapter templates, or production content.

## 7. Photography

Real photography is Pawpaw's documentary and emotional centre.

A documentary photograph may be manually or AI-assistedly enhanced without ceasing to be documentary. Permitted presentation edits include exposure and white-balance correction, colour correction, contrast adjustment, denoising, sharpening, mild deblurring or resolution enhancement, straightening, deliberate cropping, and minor cleanup that does not change the factual content of the scene. These edits do not require an “AI-generated” label.

A photograph ceases to qualify as unaltered documentary evidence when an edit invents, removes, composites or materially changes a person, expression, body, clothing, object, background, location, event or other factual content. Such altered imagery must not be presented as an unchanged real photograph.

Sujith explicitly approved the six mildly enhanced Home photographs as final presentation assets. Pawpaw may use similarly enhanced genuine photographs in future; untouched camera originals are not required as website presentation assets. Pawpaw remains a presentation archive rather than the sole master-photo backup. Full-frame presentation, privacy, dignity, alt-text and no-face-obstruction rules remain unchanged.

- Preserve the whole photograph by default.
- Use `object-fit: contain` for primary family views.
- Never make a decorative crop the only family view.
- Never place illustration, text, gradients, or controls over faces or important detail.
- Admin identification thumbnails may use `cover` because they are secondary references, not the sole family view.
- Captions provide visible context; alt text provides equivalent non-visual meaning. They remain distinct fields.
- No autoplay.
- Preserve stable media dimensions and support mixed portrait, landscape, and square sets.
- Decorative duplicates use empty alt text and are hidden from assistive technology.
- Photo palettes may affect only bounded ambient layers under the approved OKLCH contract and must not control readable text or semantic states.

## 8. Admin

[The approved Admin dashboard concept](visual-proof/admin-dashboard-concept.png) defines Admin as **the author's studio**.

Admin shares Fraunces, Manrope, foundation tokens, and Pawpaw's craft, but operational clarity comes before decoration:

- use the Admin neutral blue-grey palette;
- display real counts only; never invent analytics or proof;
- manage recent content through list-first records, not a wall of generic statistic cards;
- make “Continue editing” and “Needs attention” the primary hierarchy;
- keep draft, published, warning, error, and information states explicit and semantically distinct;
- use a desktop sidebar and a 375px single-column mobile composition;
- keep navigation targets at least 44px;
- use the character only in restrained low-risk empty, success, or decorative contexts;
- never place the character around destructive actions, errors, security controls, or dense data management.

Admin remains separate from the family experience. It may be calmer, but it must not become anonymous grey SaaS or sacrifice clarity for storybook decoration.

## 9. Components and states

This foundation governs existing component roles; it does not approve new screens or content types.

### Layout, spacing, and surfaces

- Reading width: `44rem`; general content and Admin width: `72rem`; dialog width: `32rem`.
- Use a 4px spacing base: `.25rem`, `.5rem`, `.75rem`, `1rem`, `1.25rem`, `1.5rem`, `2rem`, `2.5rem`, `3rem`, `4rem`, and `6rem`.
- Prefer relationships over arbitrary gaps: labels stay close to fields, headings to supporting copy, and captions to their photograph.
- Reading surfaces stay clear and opaque enough for stable contrast.
- Avoid making every container a rounded floating card or nesting cards without a scanning need.
- Use one coherent radius and border hierarchy; do not add neon glows or decorative glass effects that weaken contrast.

### Navigation, controls, and forms

- Family navigation is stable and named in family language; no feeds, reactions, discovery, or engagement counts.
- Admin navigation keeps Dashboard, Content, Media, Home page, and Sign out clear and discoverable.
- Use `aria-current="page"` plus a non-colour cue.
- Keep one primary forward action per region; separate destructive actions visually and semantically.
- Use result verbs such as “Publish”, “Move to Media Library”, and “Delete permanently”.
- Disabled controls remain legible and explain why when necessary.
- Pending controls retain context and prevent duplicate submission.
- Forms use persistent labels; placeholders are supplementary.
- Associate help and errors programmatically, preserve input after recoverable failures, and never validate only by colour.
- Raw JSON remains an expert fallback, not the normal authoring experience.

### Empty, loading, success, and error states

- Empty states say what is absent and identify the next valid action without invented sentiment.
- Loading states preserve dimensions, prevent duplicate actions, and announce important completion.
- Success states report only confirmed results.
- Errors say what failed, what did not change, and what the operator can do next without exposing secrets or internals.
- Character illustration is excluded from destructive, error, security, and dense operational states.

## 10. Responsive behaviour

- Support 320px reflow, the approved 375px composition, tablet, desktop, wide desktop, 200% zoom, large text, long titles, long filenames, empty data, and mixed photo orientations.
- Reference breakpoints remain: compact phone `0–479px`, large phone `480–767px`, tablet `768–1023px`, desktop `1024–1279px`, and wide `1280px+`.
- Gutters remain `1rem` at 320–479px, `1.25rem` at 480–767px, and `1.5–2rem` above 768px.
- Increase outer space on wide screens rather than reading-line length.
- Mobile compositions are deliberately recomposed, not merely shrunk.
- Stack cramped filters and actions, separate destructive controls, turn dense rows into labelled record blocks, and prevent sticky UI from hiding focus or headings.
- All essential destinations and Sign out remain discoverable without relying on hidden horizontal scrolling.
- The approved Home, Her Story, and Admin proof files are composition evidence; implementation still requires browser verification in a separately authorised phase.

## 11. Motion and reduced motion

Motion may explain change, maintain spatial continuity, or add brief delight. It must not manufacture emotion, delay access, or compete with reading and photography.

- No autoplay carousel or video.
- No scroll hijacking, continuous movement, full-screen flashes, or animation that gates content.
- Static composition must remain complete without animation.
- `prefers-reduced-motion: reduce` removes nonessential movement and loops while preserving all meaning, controls, and hierarchy.
- Fast control feedback is `120ms`; bounded ambient transitions are `240ms` with `cubic-bezier(0.2, 0.8, 0.2, 1)`; reduced motion makes nonessential transitions immediate at `0ms`. Character animation, autoplay and continuous ambient movement are not authorised.

## 12. Accessibility

Target WCAG 2.2 AA throughout implementation.

- Use landmarks, one logical page `h1`, ordered headings, semantic controls, and explicit state announcements.
- Provide complete keyboard operation and visible focus.
- Keep touch targets at least 44px.
- Support 320px reflow and 200% zoom without horizontal page scrolling.
- Keep reading measures, line heights, and text contrast comfortable.
- Use meaningful alt text and hide decorative images from assistive technology.
- Never rely on colour alone for meaning.
- Add `lang="ml"` to Malayalam elements and verify Malayalam rendering when used.
- Preserve reduced-motion support and a complete static state.
- Privacy guards, authentication boundaries, and logout behaviour must not be weakened by visual implementation.

## 13. Batch 1 implementation proof state

The visual direction, font method, ambient contract, motion contract, three character assets and Batch 1 boundary are approved. The uncommitted Batch 1 working tree now has production-build and computed-font proof, pure ambient boundary/contrast tests, active-photo and reduced-motion browser proof, keyboard/touch/focus/44px-target/320px-reflow/375px-layout/200%-zoom checks, Wonder placement proof, degraded-media prose retention, and a complete six-photo screenshot/behaviour set under `test-results/release-2-family-evidence/`.

The locked production crops are all genuine landscape rectangles at 454–455 x 330 pixels. Their modest extracted resolution is a known non-blocking presentation limitation. No square or portrait fixture was manufactured because that would violate the approved exact pixel bounds; future higher-resolution or differently oriented genuine files may replace them through the ordinary Media Library without changing Home behaviour or design.

Automated evidence completion is not self-approval. Sujith's explicit visual review remains required before Batch 1 receives the project's final 10/10 visual approval. Batch 2 remains unauthorised.

## 14. Explicit anti-patterns

Reject:

- quiet or editorial-only identity;
- cream-and-ink-only identity, beige minimalism, sombre literary memorial treatment, premium cookware, or generic lifestyle branding;
- sterile luxury, generic SaaS, or dark cosmos as the default;
- uncontrolled sticker collage, uncontrolled rainbow, or pink-only identity;
- generic baby-site styling, nursery clip art, random emoji as the icon system, or copyrighted character imitation;
- inconsistent AI illustration or any illustration presented as documentary truth;
- literary seriousness overwhelming Varada's baby world;
- illustration treated as optional decoration or used to replace real photographs;
- crop-only primary family views or decoration over faces;
- invented counts, fake analytics, false success, or automatic closing of unresolved Admin work;
- a wall of statistic cards, nested-card mobile layouts, hidden essential navigation, or tiny touch targets;
- autoplay, continuous motion, full-screen flashes, and motion-dependent composition;
- hardcoded colours outside approved tokens or chapter colours used as semantic states;
- unapproved motion values, ambient-colour bounds, character variants, screens, components, content types, or production behaviour.

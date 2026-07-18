# Pawpaw Design System

**Status:** Release 2 design-foundation proposal for product-owner approval

**Applies to:** family archive, family login, Admin, and future Pawpaw interfaces

**Implementation state:** specification only; no UI or CSS changed in this milestone

This system translates [PRODUCT_PHILOSOPHY.md](PRODUCT_PHILOSOPHY.md) into interface rules. Existing values are recorded where useful, but this document does not claim the current interface already meets the target.

## 1. Design principles

1. **Memory first:** photography and family words carry the emotion; the interface supplies context and recedes.
2. **Private by feel and function:** entering Pawpaw feels like entering a trusted family place, not a profile or feed.
3. **Truth over theatricality:** atmosphere must never make invented sentiment look factual.
4. **Dignity across ages:** suit infancy without trapping Varada in nursery branding.
5. **Editorial clarity:** sequence, authorship, dates, captions, and reading rhythm outrank decoration.
6. **Whole photographs by default:** preserve the frame unless an editorial crop is deliberate.
7. **Warm restraint:** use colour, softness, and play selectively.
8. **Quietly accessible:** contrast, focus, semantics, legibility, and reduced motion are baseline constraints.
9. **Clear administration:** Admin is utilitarian but shares the family's craft, language, and tokens.
10. **Durable patterns:** prefer a small coherent system over one-off special screens.

## 2. Visual character and exclusions

Pawpaw should feel warm, composed, intimate, contemporary, and lightly tactile. It can be joyful without becoming sugary and refined without becoming sterile. Its foundation is warm paper, deep ink, real photography, generous reading space, restrained colour, clear type, and quiet surface separation.

Pawpaw must not resemble a generic SaaS dashboard, baby-product ecommerce site, scrapbook template, loud glassmorphism, social network, pastel overload, cartoon-heavy nursery brand, sterile luxury brand, AI-generated sentimentality, dense CMS interface, or cropped-photo-first gallery.

Also reject stock nursery clip art, random emoji as an icon system, decorative elements over faces, faux-handwriting for body copy, and effects that obscure the memory.

## 3. Typography

Use two roles:

- **Display/editorial:** a characterful serif or humanist display face for family titles, story headings, quotations, and restrained brand moments.
- **Body/interface:** a highly readable sans serif for paragraphs, captions, navigation, forms, and Admin.

Do not add a font dependency until candidates are tested with real English and Malayalam text, common Android devices, font-loading failure, and privacy/performance cost. Prefer a self-hosted open-source font if approved. Until then:

```css
--font-display: Georgia, 'Times New Roman', serif;
--font-body: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Family display | `clamp(2.25rem, 7vw, 4.75rem)` | 400–600 | 1.05–1.12 |
| Page title | `clamp(1.75rem, 4vw, 3rem)` | 500–650 | 1.12–1.2 |
| Section heading | `clamp(1.25rem, 2vw, 1.75rem)` | 500–650 | 1.2–1.3 |
| Subheading | `1rem–1.125rem` | 600 | 1.35 |
| Reading body | `1rem–1.125rem` | 400 | 1.65–1.8 |
| UI body | `0.9375rem–1rem` | 400–500 | 1.45–1.6 |
| Caption | `0.875rem–0.9375rem` | 400 | 1.5 |
| Metadata | `0.75rem–0.8125rem` | 500 | 1.4 |

Use weight, scale, position, and space before colour. Avoid ultra-light body text and more than three active weights. Long reading text is `58–72ch` (default about `66ch`); captions and help stay near `60ch`; Admin help/errors stay below `70ch`. Avoid centred paragraphs beyond two short lines, justified text, and decorative uppercase. Use sentence case.

## 4. Colour

| Token | Reference | Role |
|---|---|---|
| `--color-canvas` | `#FBF8F2` | warm family background |
| `--color-surface` | `#FFFDF9` | primary surface |
| `--color-surface-subtle` | `#F4F0E8` | quiet/Admin background |
| `--color-ink` | `#202033` | primary text and controls |
| `--color-ink-secondary` | `#555565` | explanatory text |
| `--color-ink-muted` | `#737380` | metadata at accessible sizes |
| `--color-border` | `#DED9D0` | default boundary |
| `--color-border-strong` | `#BDB7AD` | emphasis |
| `--color-accent` | `#76518F` | restrained identity/action accent |
| `--color-accent-soft` | `#EEE5F2` | selected/highlight surface |

Rose, berry, orchid, coral, sky, mint, butter, plum, and midnight may appear in editorial contexts, but limit accents per screen. Primary text needs WCAG 2.2 AA contrast of 4.5:1; large text, focus, icons, and meaningful boundaries need 3:1. Never use colour alone for status or place uncontrolled extracted colour behind text.

### Image-derived colour

Map stored photo palettes through approved chroma/lightness bands, keep a stable neutral layer behind text, verify contrast, and use a fixed fallback. A palette may affect a bounded frame, accent, subtle gradient, border, or section wash. It must not recolour the whole product, flash full-screen between slides, or affect Admin controls.

### Semantic states

| State | Strong | Soft | Companion |
|---|---|---|---|
| Success/published | `#23633B` | `#E8F5EC` | explicit success text/icon |
| Warning/draft | `#7A5511` | `#FFF4D6` | reason and next action |
| Error/destructive | `#A33A3A` | `#FCEAEA` | text and alert semantics |
| Information | `#315F7A` | `#E8F2F7` | explanatory label |
| Neutral/inactive | secondary ink | subtle surface | explicit state label |

## 5. Layout and responsive behaviour

- `--width-reading: 44rem`; `--width-content: 72rem`; `--width-admin: 72rem`; `--width-dialog: 32rem`.
- Full-bleed media may reach the viewport; captions and controls align to a content gutter.
- Gutters: `1rem` at 320–479 px, `1.25rem` at 480–767 px, `1.5–2rem` above 768 px.
- Family layouts: one column on mobile, two where content benefits, up to a 12-column composition on wide screens.
- Admin: one primary mobile column; add a secondary rail only for persistent context/actions.
- Increase outer space on wide screens, not reading-line length.

Content-trigger breakpoints: compact phone `0–479`, large phone `480–767`, tablet `768–1023`, desktop `1024–1279`, wide `1280+`. Test at 320, 375, 768, 1024, wide desktop, 200% zoom, large text, long titles/filenames, empty data, and mixed photo orientations.

On mobile, stack cramped filters/actions, keep destructive actions separate, turn dense rows into labelled record blocks, prevent sticky UI hiding focus/headings, and keep photo controls clear of safe areas.

## 6. Spacing and vertical rhythm

4 px base scale: `--space-1: .25rem`, `2: .5rem`, `3: .75rem`, `4: 1rem`, `5: 1.25rem`, `6: 1.5rem`, `8: 2rem`, `10: 2.5rem`, `12: 3rem`, `16: 4rem`, `24: 6rem`.

Use relationships: label-to-field `.375rem`; heading-to-support `.5–.75rem`; paragraphs `1–1.25rem`; card internals `.75–1rem`; sections `2.5rem` mobile, `4–6rem` family desktop, `2–3rem` Admin. Avoid arbitrary gaps when a scale value works.

## 7. Radii, borders, and shadows

- Radii: `--radius-sm: .375rem`, `--radius-md: .625rem`, `--radius-lg: 1rem`, `--radius-pill: 999px` for badges only.
- Borders: 1 px `--color-border`; strong/selected uses `--color-border-strong` or accessible accent.
- Shadows: `--shadow-sm: 0 1px 2px rgb(32 32 51 / .06)`, `--shadow-md: 0 8px 24px rgb(32 32 51 / .10)`, `--shadow-overlay: 0 16px 48px rgb(32 32 51 / .16)`.

Most surfaces use a border or shadow, not both strongly. Avoid making every container a rounded floating card. No neon glows.

## 8. Cards and surfaces

Use cards only when grouping improves scanning, comparison, or action clarity. Family stories and letters usually read as editorial pages, not grids. Admin cards may summarise status; dense management should use responsive lists/tables. Interactive cards need an obvious name and focus state. Avoid nested cards. Opaque surfaces are default; translucency requires a controlled background and verified contrast.

## 9. Navigation

Family navigation is small, stable, and named in family language. No feed tabs, discovery, badges, or notification counts. Future archive navigation needs an approved information architecture. “Leave” remains findable but does not dominate.

Admin keeps Dashboard, Content, Media, Home page, and Sign out consistent. Use `aria-current="page"` plus a non-colour cue. Narrow-screen navigation must keep all destinations and Sign out discoverable; hidden horizontal scroll is not a sufficient long-term pattern. Sign out remains a real POST action.

## 10. Buttons and links

- One primary forward action per region; secondary for alternatives; tertiary for navigation; destructive is separate and red.
- Minimum touch target is 44 × 44 CSS px except well-spaced inline links.
- Use result verbs: “Publish”, “Move to Media Library”, “Delete permanently”.
- Disabled controls remain legible and explain why when needed.
- Pending controls retain context and prevent duplicate submission.
- Hover is enhancement; visible focus, active, disabled, and pending states are mandatory.

## 11. Forms

Use a persistent visible label; placeholders are supplementary. Associate help/errors programmatically, use suitable input types and autocomplete, preserve input after recoverable errors, and never validate only by colour. Admin uses plain family-editor language. Raw JSON is an expert fallback, not the normal authoring experience. Group Save draft, Publish, and Unpublish so their consequences are unmistakable.

## 12. Empty, loading, and error states

Empty states say what is absent and the next valid action without inventing sentiment. Loading preserves dimensions, uses meaningful text for operations, prevents duplicates, and announces important completion. Errors say what failed, what did not change, and what to do next; preserve prose when media fails. Use alert semantics where appropriate and never expose technical internals or secrets.

## 13. Photography

- **No default cropping.** Primary family photos use `object-fit: contain` in a bounded frame.
- A softened duplicate may fill letterbox space if subordinate and hidden from assistive technology.
- Use `cover` only for secondary thumbnails, indexes, or ambient layers—never as the sole view.
- Portrait, landscape, and square images keep their shape; mixed sets keep controls/captions stable.
- Captions provide visible context; alt text provides concise non-visual meaning. Do not copy one blindly into the other.
- Decorative duplicates use empty alt and `aria-hidden="true"`.
- Flag missing meaningful alt before publication. A missing caption is valid.
- Never cover faces or important detail. Focal points may guide thumbnails, not justify primary-view crops.

## 14. Editorial content

- Titles are specific and scannable.
- Paragraphs are left aligned in a comfortable measure.
- Dates distinguish event, publication, and update dates; metadata includes authorship and approximation where relevant.
- Quotations use semantic `blockquote`/`cite` and distinguish exact words from paraphrase.
- Letters foreground author, recipient, date, and reading—not email chrome.
- Stories use a clear title, contextual opening, deliberate media sequence, and stable column.
- Avoid decorating every section with badges, stamps, or handwriting.

## 15. Motion and reduced motion

Motion explains change, maintains spatial continuity, or adds brief delight; it does not manufacture emotion. Functional transitions are about 120–220 ms; editorial reveals stay below about 350 ms and never gate content. No autoplay carousel/video, scroll hijacking, continuous parallax, animation everywhere, or full-screen colour flashes.

For `prefers-reduced-motion: reduce`, remove nonessential movement, stop loops, and use immediate changes or simple fades while preserving all meaning and controls. The existing global reduction rule is a safety net, not a substitute for component review.

## 16. Accessibility

Target WCAG 2.2 AA. Use landmarks, one logical page h1, ordered headings, complete keyboard operation, visible focus, 44 px targets, meaningful alt, hidden decorative images, labelled fields, status/error announcements, and 320 px reflow without horizontal page scroll. Support 200% zoom and test Malayalam if introduced. Privacy history guards and logout behaviour must remain intact.

## 17. Family and Admin relationship

| Family archive | Admin |
|---|---|
| memory-led and editorial | task-led and operational |
| photography at meaningful scale | thumbnails for identification |
| minimal metadata | explicit status, dates, usage, consequences |
| few controls and warm pacing | clear grouped controls and efficient scanning |

They share type families, base colours, spacing, focus, button hierarchy, states, and quality. Admin must not imitate family atmosphere at the expense of speed, but it must not become an anonymous grey SaaS dashboard.

## 18. Token naming strategy

Use semantic tokens: `color.canvas`, `color.surface.default`, `color.text.primary`, `color.border.default`, `color.action.primary`, `color.state.success.*`, `font.family.display`, `font.size.body`, `space.1…24`, `radius.sm…pill`, `shadow.sm…overlay`, `width.reading…dialog`, and `motion.duration.fast…editorial`. Translate dots to CSS kebab-case such as `--color-text-primary`. Do not repeat literal hex values across inline styles.

## 19. Component principles

Components have one clear job and complete states. Prefer semantic HTML, separate behaviour from visual variants, keep variant sets small, and reuse primitives for buttons, fields, notices, badges, cards, headers, metadata, and photo frames. Defaults must be safe: contrast, focus, no crop for primary photos, no autoplay, and non-destructive hierarchy. Support long text and missing optional data. Do not erase meaningful differences among stories, letters, galleries, and Admin records with one universal component.

## 20. Explicit anti-patterns

Reject generic stat-card identity; repeated one-off inline styling; beige or pink as the only meaning of “premium” or “girl”; excessive blur/glass/gradients; crop-only galleries; tiny grey essential text; placeholder-only forms; colour-only validation; raw JSON as normal authoring; autoplay, infinite scroll, reactions, and feeds; random illustration styles and copyrighted characters; AI material presented as memory; decoration over faces; cramped wrapped desktop rows; available-looking disabled controls; false success; and visual changes that weaken privacy or publishing boundaries.

---

## 21. Current UI design audit (18 July 2026)

### Basis and limits

This code-based audit covers family login, family Home, Admin login, Dashboard, Content Library, Media Library, and Home editor at commit `4b312b3cef6c2f0586964ad8ef249ea707f537aa`. It records implemented structure/CSS; it is not a new browser test and does not claim the UI is premium.

### What already supports the philosophy

- Family/Admin access are separate; family content and private signed photos are used.
- Primary family photos are contained, bounded, uncropped, captioned, keyboard/touch controlled, and never autoplay.
- Decorative blurred duplicates are hidden from assistive technology.
- Family prose has bounded width, readable line height, semantic headings/quotes, and resilient media-error behaviour.
- Admin distinguishes draft/published/unpublish/delete/attachment/usage honestly.
- Filters have accessible names, navigation uses `aria-current`, login fields have labels/autocomplete, and errors/status use semantic roles.
- Reduced-motion handling exists globally and in relevant component CSS.

### Family login

**Finding:** a plain centred inline-styled form with generic copy and little visual relationship to Home. It protects access but does not yet feel like entering a private archive. Typography, focus, pending, error spacing, and surfaces are not systematised.

**Preserve:** one-field clarity, visible label, autocomplete, pending state, restraint.

**Redesign:** composition, archive identity, focus/error treatment, and concise privacy context.

### Family Home

**Finding:** contained carousel, captions, prose measure, and degraded-media handling are strong. The page lacks archive navigation, chronology, authorship/date treatment, and a designed no-photo opening. Georgia/system sans is untested as a bilingual long-term pairing. Direct lilac quote accents lack broader colour logic. The same dark blurred frame can become formulaic. Carousel focus visibility and slide announcements need review.

**Preserve:** whole-photo presentation, deliberate controls, stable frame, captions, semantic prose, media resilience, no autoplay.

**Redesign:** archive identity/navigation, chronology/attribution, editorial rhythm, focus, colour mapping, and more photograph-specific atmosphere.

### Admin login

**Finding:** repeats the family login layout with a smaller heading and does not explain the separate higher-privilege space. Generic appearance and missing shared field/button states feel unfinished.

**Preserve:** separate route, labels, autocomplete, pending state, direct errors.

**Redesign:** Admin identity, hierarchy, states, focus, and calm security context.

### Admin shell and navigation

**Finding:** sticky semantic navigation and POST Sign out are sound. Two white bars on grey, small grey links, literal colours, and inline layout create a generic SaaS shell. Two bars consume mobile height; hidden-scroll navigation can conceal destinations or Sign out.

**Preserve:** route names, current-page state, Sign out, bounded main content.

**Redesign:** unified shell, mobile navigation, tokens, page headers, and a family-related but efficient identity.

### Dashboard

**Finding:** real counts, recent items, filters, thumbnails, dates, and error/empty states support honest administration. Conventional stat cards/quick links feel generic. Repeated white bordered rectangles flatten hierarchy. Small muted labels risk legibility; flex-wrapped rows risk ambiguous mobile order. Cover thumbnails are acceptable for identification but not labelled as secondary to the no-crop family view.

**Preserve:** factual data, signed thumbnails, discovery tools, deterministic/error states.

**Redesign:** priority, responsive record layout, type scale, action hierarchy, and overview pattern.

### Content Library

**Finding:** search, combined filters, status/type/date, direct Home editing, and honest unavailable-editor text are useful. Compact spans wrap unpredictably and metadata/actions compete with the title. Repeated literal styles reinforce generic Admin. The disabled Release 2 action must remain unmistakably unavailable during sequencing.

**Preserve:** honest boundaries, discovery, status truth, ordering.

**Redesign:** responsive record anatomy, title/action priority, metadata grouping, filters, disabled communication.

### Media Library

**Finding:** filename, format, size, date, alt, caption, usage, and delete consequence provide strong stewardship. Attached/unattached grouping is meaningful. Fixed cropped thumbnails can hide the subject; there is no whole-photo inspection. Metadata, two fields, save, attach, and delete crowd one flex row on phones. “Save details” beside Caption saves both fields, obscuring scope. One global busy state weakens per-item feedback. Small muted text and compact buttons are accessibility risks.

**Preserve:** metadata, alt/caption separation, usage, grouping, irreversible confirmation.

**Redesign:** mobile anatomy, inspection, per-item feedback, save scope, targets, type size, and destructive separation.

### Home editor

**Finding:** draft/publish/unpublish boundaries, truthful feedback, upload/publish guidance, and advanced-block preservation are sound. Raw JSON is the only advanced editor and is unsuitable as a long-term authoring norm. Status is a small coloured sentence; publishing consequence and action hierarchy need clarity. Editor, attachments, and upload form one long page without navigation.

**Preserve:** publishing boundary, recoverable plain text, block protection, attachment ordering, guidance, feedback.

**Redesign:** structured editor, status panel, action hierarchy, task grouping, mobile attachments, shared fields/notices.

### Cross-screen issues and risks

- Georgia/system sans is the only common type idea; roles and sizes vary.
- Family uses global tokens while Admin repeats inline hex values; state colours differ by screen.
- Buttons, fields, badges, notices, cards, and headings lack shared complete states.
- Small type and repeated bordered rectangles substitute for hierarchy.
- Flex-wrap prevents overflow but does not define deliberate mobile reading order.
- Mobile risks: stacked Admin bars, hidden-scroll nav, dense rows/cards, sub-44 px targets, long text, and zoom.
- Accessibility risks: no system-wide `:focus-visible`, essential 11–13 px text, incomplete inline-style states, JSON authoring burden, cropped identification thumbnails, and carousel announcement/focus details.

### What happens after approval

No implementation is authorised by this document. If Sujith approves it, the smallest coherent sequence is: (1) tokens and base primitives; (2) family/Admin login alignment without auth changes; (3) family Home refinement preserving contained photos/publishing; (4) unified Admin shell/navigation; (5) Dashboard, Content, Media, and Home editor migration one bounded surface at a time.

Stories, letters, galleries, timeline, new routes, and new content features remain separate decisions. Design-system approval does not authorise them.

# Pawpaw Design System

Private reference. Applies to both the viewer-facing archive and the admin interface.

---

## Color tokens (globals.css)

| Token | Value | Usage |
|---|---|---|
| `--color-ink` | `#1a1a2e` | Primary text, headings, interactive elements |
| `--color-paper` | `#fefcf8` | Viewer-facing page background |
| `--color-accent` | `#c084fc` | Accent highlights (viewer side) |
| `--color-muted` | `#6b7280` | Secondary text, captions, labels |
| `--font-display` | `Georgia, serif` | Headings, brand name, editorial text |
| `--font-body` | `system-ui, sans-serif` | Body copy, labels, UI controls |

Admin pages use literal hex values (not custom properties) for inline styles, keeping them consistent with the tokens above.

---

## Typography

- **Headings**: Georgia, serif, 1.375 rem (h1) / 1 rem (h2)
- **Body**: system-ui, 0.875 rem – 1 rem
- **Labels / meta**: 0.75 rem – 0.8125 rem, color `#6b7280`
- **Status badges**: 0.6875 rem, bold, uppercase-readable, rounded pill

---

## Spacing

All spacing uses `rem`. Base unit is `0.25 rem` (4 px at 16 px root).

Common increments: `0.5` · `0.75` · `1` · `1.25` · `1.5` · `2` rem.

---

## Admin layout

```
┌─ Brand bar (Varada — Admin) ─────────────────────────────────┐
├─ AdminNav (sticky, z-index 10) ──────────────────────────────┤
│  Dashboard  Content  Media  Home page       [Sign out]        │
├─ <main> maxWidth 64 rem, auto-centered ──────────────────────┤
│  [page content]                                               │
└──────────────────────────────────────────────────────────────┘
```

AdminNav:
- Sticky, top: 0, z-index: 10
- Active link: bold + `#f3f4f6` background
- `aria-current="page"` on the active link
- Horizontal-scroll-safe on narrow viewports (no visible scrollbar)
- Sign-out is a `<form method="post" action="/logout/admin">` button

---

## Admin card pattern

```css
background: #fff;
border: 1px solid #e5e7eb;
border-radius: 0.5rem;
padding: 0.875rem 1rem;
```

Used for: stat cards, content list rows, media thumbnails.

---

## Status badge

```css
/* published */
background: #dcfce7; color: #166534;

/* draft */
background: #f3f4f6; color: #4b5563;
```

Pill shape: `border-radius: 9999px; padding: 0.125rem 0.5rem; font-size: 0.6875rem; font-weight: 600`.

---

## Carousel — premium background

`home-carousel.module.css` implements a three-layer frame:

1. **`.blurredBg`** — `position: absolute; inset: 0; object-fit: cover; filter: blur(24px); transform: scale(1.08); opacity: 0.8; z-index: 0`
   Blurred copy of the photo fills the letterbox space. `aria-hidden="true"` keeps it invisible to screen readers.

2. **`.overlay`** — `position: absolute; inset: 0; background: linear-gradient(…rgba(0,0,0,0.15) → rgba(0,0,0,0.45)…); z-index: 0`
   Darkens the blurred background for contrast.

3. **`.image`** — `object-fit: contain; position: relative; z-index: 0`
   The sharp, accessible photo. Stacks above the blurred bg and overlay purely by DOM order within the shared `z-index: 0` stacking context. `object-fit: contain` guarantees the full photo is always visible — no cropping.

Carousel nav controls (`CarouselControls`) use `position: absolute` with no explicit z-index, so they also stack at z-index auto — after the image in DOM order — and paint on top. Touch swipe and keyboard arrows (`←` / `→`) are supported.

`prefers-reduced-motion` suppresses transitions on nav dots. The blurred background is a static filter — no animation to disable.

---

## What this system does not cover (Release 2)

- Story, Gallery, Letter, Moment editors and content schemas
- Viewer-facing archive index / navigation
- Custom domain and SEO configuration

# Release 2 bounded UI implementation declaration

## 1. Status and approval boundary

**Declaration status:** Batch 1 and its separately approved bounded continuation are implemented in the uncommitted working tree. Sujith has explicitly approved and locked Family Login, authenticated Home, First Days, all 15 photographs, prose, captions, alt text, desktop/mobile/zoom layouts, reduced-motion and degraded-media states, family navigation, and Leave placement/behaviour at 10/10. Every Batch 1 visual gate is closed and Sujith authorised the Batch 1 commit, push, and production release on 19 July 2026. Batch 2 and Admin redesign remain unauthorised.

This document began as the smallest evidence-based path for applying the approved Release 2 visual system to existing Pawpaw routes only. Sujith subsequently approved the declaration, exact two-batch boundary, font mechanics, ambient and motion contracts, three isolated production character assets, and Batch 1 execution. The current uncommitted tree contains that bounded Batch 1 implementation; Batch 2 is still outside authorization.

Sujith's approval of the proof pack remains the visual-direction authority. The font mechanics, numeric ambient-colour contract, motion contract, delight/wonder/sleepy assets and Batch 1 are explicitly approved; no approval extends to Batch 2.

## 2. Current verified baseline

- Repository: `nsujith-creator/pawpaw`
- Branch: `main`
- Inspected HEAD: `bb06d2ebe27f73c9483d12da3448c3c4eeb8d2e6`
- Starting tracked tree: clean
- Starting status: only `?? .claude/`; that directory was not inspected or touched
- Installed Next.js: `16.2.10`
- Current UI: Phase 1 behaviour is preserved and the complete bounded Batch 1 family surface is explicitly approved and locked at 10/10
- Current family routes: `/family-login`, authenticated `/`, and authenticated `/first-days`
- Current Admin routes: `/admin/login`, `/admin`, `/admin/content`, `/admin/media`, and `/admin/home`
- Current Home media: six distinct approved full-size photographs in locked order, including genuine square and portrait ratios, with previous/next controls, six position tabs, keyboard arrows, swipe, no autoplay, active-photo ambient colour, and a contained primary image
- Current security: viewer and Admin history guards, passphrase/cookie controls, Admin allowlist, RLS, private Storage, signed delivery, owner scope, publication boundary, origin checks, upload validation, and private no-store responses are already implemented and tested
- Formal manual-test rounds: 3 of 3 used; this milestone requests none

The nine canonical documents, all ten approved PNG proofs, every named implementation file, direct imported UI/CSS files, and relevant unit/E2E tests were inspected. The Home and Admin proof layouts are responsive recompositions, not instructions to shrink desktop boards. The Her Story proof remains future pattern evidence only.

## 3. Resource gate

| Resource | Exact purpose | Licence | Package/service cost | Recurring cost | Maintenance burden | Built-in alternative | Required? |
|---|---|---|---:|---:|---|---|---|
| Installed `next/font/google` in Next.js 16.2.10 | Fetch approved font files at build, emit self-hosted files, expose stable CSS variables, and supply fallback metrics | Next.js: MIT; Fraunces, Manrope, and Noto Sans Malayalam: SIL Open Font License 1.1 | INR 0; already installed | INR 0 | Keep font declarations at root and retain build-time network availability | `next/font/local` with checked-in OFL files, which adds binary assets and licence-file upkeep | Yes; lowest-burden verified method |
| Fraunces | Display and chapter typography at weight 500 | SIL OFL 1.1 | INR 0 | INR 0 | One Latin normal face | Georgia fallback | Yes |
| Manrope | Body and interface weights 400, 600, and 700 | SIL OFL 1.1 | INR 0 | INR 0 | Three Latin normal faces; avoid adding more weights | System sans fallback | Yes |
| Noto Sans Malayalam | Malayalam only, weights 400 and 500, with `lang="ml"` | SIL OFL 1.1 | INR 0 | INR 0 | `preload: false`; retain the Malayalam subset and language selector | System Malayalam fallback is inconsistent and does not meet the approved identity | Required only when Malayalam content appears; make it available now without runtime third-party requests |

**Result:** no new npm dependency, external service, paid plan, proprietary font, animation library, component library, icon package, image service, CMS, or styling framework is required. No install command exists because nothing is to be installed.

Installed source proves the import names `Fraunces`, `Manrope`, and `Noto_Sans_Malayalam`. It also proves the requested weights/subsets and that the loader downloads font CSS/files during build, emits them under `.next/static/media`, and rewrites CSS to the self-hosted URLs. This produces no browser request to Google and no runtime third-party font disclosure. A production build does require build-time access to Google Fonts; build failure must block release rather than silently approving fallback-only output.

## 4. Validity gate

No implementation claim is valid from compilation or a screenshot alone. Each later claim needs the following evidence:

| Claim | Required evidence |
|---|---|
| Typography matches the approved foundation | Approved typography boards; computed font-family/weight checks; 1440px and 375px screenshots; build output with self-hosted font files |
| Tokens are canonical and actually used | Approved colour boards; CSSOM/computed-style checks; source declaration-count guard; contrast calculations |
| Home preserves documentary photographs | Home proof; every genuine approved full-size source shape; computed `object-fit: contain`; six-slide screenshot and overflow assertions. The current set retains its genuine square and portrait ratios without recropping. |
| Carousel behaviour is preserved | Existing behaviour plus deterministic Playwright arrows, dots, keyboard, swipe, no-autoplay, and active-item tests |
| Ambient colour follows the active photograph safely | Approved photo-context proof; pure numeric unit tests; WCAG calculation; active-item Playwright test; reduced-motion test |
| Admin remains operationally truthful | Admin proof; existing real queries; filter behaviour unit tests; populated/empty/error/long-text screenshots; no invented analytics |
| Responsive layouts are recomposed | Approved 375px boards; 320px overflow checks; 375px screenshots; 200% zoom checks; target-size checks |
| Security/privacy remain intact | Existing unit, integration, and E2E security suites; response-header checks; logout/history checks; no raw private-path or secret output |

**Result:** the proof method remains valid. Family Login, Home, and First Days passed their final evidence review at 10/10 and are locked. This approval includes all 15 photographs, exact prose/captions/alt text, responsive layouts at 1440px/375px/320px, 200% zoom, reduced-motion and degraded-media states, family navigation, and Leave placement/behaviour. Every Batch 1 visual gate is closed; Batch 2 remains unauthorised.

## 5. Exact implementation scope

Only these existing surfaces are in scope:

1. `/family-login`
2. Authenticated `/` Home
3. `/admin/login`
4. Admin shell and its existing Dashboard, Content, Media, Home page, and Sign out navigation
5. `/admin`
6. `/admin/content`
7. `/admin/media`
8. `/admin/home`

The work may change presentation, layout, responsive composition, focus/target treatment, approved typography/tokens, bounded Home ambient colour, and test evidence. It must preserve every current data query, filter, mutation, content/publication rule, media workflow, private URL rule, and authentication behaviour.

## 6. Explicit exclusions

- No Her Story route, Story editor, Gallery, Letters, Moments, timeline, additional chapter route, new content type, schema, or migration. A later explicit instruction authorised only the existing-model `/first-days` story and its exact media data.
- No generic `ChapterHeader` or generic design-system/component library without a current consumer
- No future navigation link to an unimplemented family route
- No new publishing feature, realtime update, rich text system, drag-and-drop, focal-point mode, or media service
- No proof-board raster used as a production character image
- No crop, extraction, regeneration, or creation of character art inside either UI batch
- No authentication, authorization, cookie, proxy, RLS, Storage-policy, header, Vercel, DNS, or cross-application change. Later explicit product-owner instructions separately authorised only the earlier Home repair and the bounded full-size Home/First Days media-content operations recorded in Section 24.
- No dependency addition and no deployment
- No fourth formal manual-test round

## 7. Existing files to modify

### Batch 1 - visual foundation and family surfaces

| File | Purpose | Exact change | Reason | Associated proof | Associated test |
|---|---|---|---|---|---|
| `src/app/layout.tsx` | Root document and metadata | Instantiate the three verified `next/font/google` imports; expose `--font-display`, `--font-body`, and `--font-malayalam` variables on `<html>`; use `display: "swap"`; set Noto Malayalam `preload: false` | One root loading point prevents route drift and runtime Google requests | Typography desktop/mobile/stress proofs | New family visual E2E checks root classes, computed families/weights, and absence of Google font requests |
| `src/app/globals.css` | Global reset and approved semantic foundation | Replace provisional colour/font tokens with the exact approved foundation, chapter, and semantic tokens; add approved fallback stacks, focus-visible rule, target baseline, and the approved motion variables after approval; keep reset and private-history behaviour intact | Tokens must exist once and be shared without a component framework | Typography and colour proof set | CSSOM/computed-token E2E checks plus a declaration-count guard in `ui-acceptance.test.ts` |
| `src/app/family-login/page.tsx` | Existing viewer passphrase screen | Replace inline presentation with semantic classes; retain the exact action, field name, autocomplete, error role, pending state, and copy; apply the family visual hierarchy only | Brings the existing gateway into the approved family language without touching passphrase logic | Typography mobile/desktop and Home colour language | Existing auth E2E remains green; new 1440/375 screenshots, keyboard focus, target-size, and overflow checks |
| `src/app/(archive)/page.tsx` | Existing authenticated Home states | Apply the approved Home shell; keep title, validated body blocks, empty/error/degraded states, Leave control, and one carousel; move active ambient ownership into the carousel composition; add one character placement only after its separate asset gate passes | Makes existing Home recognisably Pawpaw while preserving server/data truth | Home desktop/mobile concept and colour photo-context proof | Existing loader/published-route tests; new Home screenshot matrix and degraded-media/prose assertions |
| `src/app/(archive)/home.module.css` | Home route layout | Implement reading width, rose family, opaque text layer, responsive re-composition, stable spacing, and character exclusion zones; prevent 320px overflow and face overlap | Route-specific CSS is simpler than a new layout component | Home and typography proofs | New 320/375/1440 layout, 200% zoom, heading-order, and overlap assertions |
| `src/components/home/home-carousel.tsx` | Current interactive carousel | Preserve arrows, dots, keyboard, swipe, one active item, and no autoplay; compute the active ambient theme from the active item's stored palette; render `AmbientFrame` around the current item; expose stable test hooks only where semantic queries are insufficient | Current `AmbientFrame` sees only the first palette and cannot follow the active slide | Home concept and photo-context proof | Expanded `home-flow.spec.ts` exercises arrows, dots, keyboard, swipe, active palette, no autoplay, and all six locked exact-crop photographs |
| `src/components/home/home-carousel.module.css` | Carousel presentation | Preserve a bounded frame and `object-fit: contain`; implement approved border/surface/control placement, stable aspect behaviour, face-safe layers, 44px controls, and responsive composition; keep decorative duplicate hidden from accessibility | Existing behaviour is sound but visual treatment and target sizes do not meet Release 2 | Home concept and the genuine six-photo stress evidence | Existing source guards plus computed contain, target-size, overflow, single-row mobile position controls, and screenshot tests |
| `src/components/home/carousel-controls.tsx` | Arrow and position controls | Replace inline styles with existing carousel-module classes; retain labels, tablist/tab semantics, selected state, click callbacks, and disabled logic; meet 44px targets | Current dots are visually/physically below the 44px target requirement | Home mobile/desktop concept | Playwright measures each interactive box and exercises arrows/dots by keyboard and pointer |
| `src/components/home/ambient-frame.tsx` | Bounded decorative ambient surface | Accept the already-normalized active theme from `HomeCarousel`; apply only CSS custom properties/classes; remove the hardcoded first-palette fallback and 600ms inline transition | Keeps the ambient layer presentational and tied to active state without lifting client state into a server page | Colour photo-context and Home proof | Pure ambient unit tests plus active-slide and reduced-motion E2E tests |
| `src/components/home/leave-button.module.css` | Viewer logout control styling | Apply approved neutral treatment, visible focus, and a minimum 44px target without changing the component or POST flow | Current underline control is smaller than the accessibility minimum | Family proof language and accessibility gate | Existing natural logout/history E2E plus target and focus checks |
| `tests/unit/ui-acceptance.test.ts` | Existing acceptance regression guard | Retain behaviour-critical source guards; update family style assertions to canonical tokens/classes and add a single-declaration guard for approved global tokens; do not replace behavioural E2E | Existing exact inline/CSS strings may otherwise create false failures | Approved token contract | Runs under `npm test`; paired with computed-style E2E so proof is not source-only |
| `tests/e2e/home-flow.spec.ts` | Existing real Home behaviour flow | Add dot selection, ArrowLeft/ArrowRight, swipe, active ambient update, six-photo presence, 320px overflow, 44px targets, reduced motion, and 200% zoom while preserving cleanup | Extends the existing real route/fixture path rather than inventing a parallel behaviour harness | Home proofs and accessibility criteria | Direct Playwright behaviour assertions in both configured projects |

### Batch 2 - Admin author's studio

| File | Purpose | Exact change | Reason | Associated proof | Associated test |
|---|---|---|---|---|---|
| `src/app/admin/layout.tsx` | Existing Admin shell | Replace inline styles with shell classes; form desktop header/sidebar/main structure and 375px single-column structure; keep `PrivateHistoryGuard`, `AdminNav`, and children unchanged | The approved studio requires a real shell, not generic stacked bars | Admin dashboard desktop/mobile proof | New Admin visual E2E checks shell reflow, landmarks, overflow, and protected history |
| `src/app/admin/login/page.tsx` | Existing Admin authentication screen | Replace inline styles with shared Admin classes; retain `loginAdmin`, field names, autocomplete, error role, pending state, and exact submit behaviour | Visual alignment without touching authentication | Typography and Admin proof | Existing auth E2E plus new 1440/375 screenshots, focus, targets, and overflow |
| `src/app/admin/page.tsx` | Existing real dashboard | Replace inline styles with semantic classes; preserve every query, ownership filter, real count, link, timestamp, thumbnail, filter, empty/error state, and list order; make “Continue editing” and “Needs attention” the hierarchy using existing truthful data only | Approved proof requires an author's studio and list-first records, not invented analytics | Admin dashboard proof | Existing dashboard/library behaviour tests; new populated/empty/error/long-text screenshots and filter/link assertions |
| `src/app/admin/content/page.tsx` | Existing Content Library | Replace inline styles with shared list/filter/state classes; retain search parameters, query, Home-only editor link, disabled unsupported creation, filtering, order, and error/empty distinctions | Applies the approved operational language without creating future editors | Admin proof | Existing content/library behaviour tests unchanged and green; new responsive/filter/screenshots |
| `src/app/admin/media/page.tsx` | Existing Media Library server surface | Replace inline styles with shared layout/filter/state classes; keep owner-scoped query, safe filename, signed thumbnail generation, usage counts/titles, filter/order, and error distinctions | Visual re-composition must not broaden private media exposure | Admin proof | Existing media/library behaviour and integration tests; new responsive state screenshots |
| `src/app/admin/media/media-library-client.tsx` | Existing media cards and mutations | Replace inline styles with shared classes; retain attach, edit, confirmation, delete, refresh, error/status, and busy behaviour; use list-first rows and 44px actions | Current dense inline styling is generic and undersized in places | Admin proof | Existing mutation tests remain; new keyboard, target, long-text, confirmation, and visible-status E2E |
| `src/app/admin/home/page.tsx` | Existing Home editor page shell | Replace inline styles with shared sections; preserve canonical query, signed attachments, explanatory copy, error/empty states, and current child components | Makes the existing workflow coherent without changing data logic | Admin proof | Existing Home load/UI tests plus new populated/empty/error screenshots |
| `src/app/admin/home/home-editor.tsx` | Existing Home text/JSON editor | Replace inline style objects with shared classes; retain all state, confirmation, payloads, draft/publish/unpublish actions, alerts, status, and busy handling | Form controls require approved hierarchy, targets, and semantic states | Admin proof | Existing manage-home, integration, and UI acceptance tests; new pending/error/long-text/zoom E2E |
| `src/app/admin/media/upload-form.tsx` | Existing direct private upload form | Replace inline styles with shared classes; retain validation, signed direct upload, finalize flow, labels, reset-on-success, status, error, and busy steps | Visual work must not alter the 8 MB/private upload path | Admin proof | Existing upload unit/integration/UI tests; new focus, target, pending, and responsive E2E |
| `src/app/admin/media/attachment-list.tsx` | Existing attached-photo management | Replace inline styles with shared classes; retain signed thumbnails, edit/reorder/detach/delete confirmation, refresh, messages, and owner-scoped actions | Dense operational controls need responsive list rows and 44px targets | Admin proof | Existing UI/media integration tests; new long-text, confirmation, target-size, and 375px screenshot assertions |
| `src/components/admin/admin-nav.tsx` | Existing Admin navigation | Retain the exact routes, active logic, `aria-current`, and POST Sign out; add only class/structure hooks needed for desktop sidebar and mobile single column | Existing component already has the correct information architecture | Admin desktop/mobile proof | Existing nav/auth tests plus new active/non-colour cue, target, keyboard, reflow, and overflow E2E |
| `src/components/admin/admin-nav.module.css` | Admin navigation CSS | Replace horizontal-strip assumptions with a desktop sticky sidebar and non-overflowing 375px composition; apply neutral tokens, focus, 44px targets, and approved motion tokens | Current small horizontally scrolling links do not meet the approved Admin composition | Admin desktop/mobile proof | Updated nav unit expectations and computed layout/target/reduced-motion E2E |
| `tests/unit/admin-dashboard.test.ts` | Existing Admin source contract | Replace obsolete sticky horizontal-scroll style expectations with sidebar/mobile, active non-colour cue, target, and reduced-motion contract checks while retaining query/navigation/security guards | Keeps current regression value without encoding superseded presentation | Admin proof | Runs under `npm test`; paired with new behavioural E2E |
| `tests/unit/ui-acceptance.test.ts` | Existing UI behaviour/source guard | Update Admin assertions that currently depend on inline colour strings; retain separate alert/status roles, busy-finally, direct upload, attachment safety, and logout guards | CSS extraction must not weaken the behaviour contract | Admin proof and semantic-state rules | Runs under `npm test`; paired with interaction E2E |

No other existing source or test file is proposed for modification.

## 8. New files to create

| Batch | File | Purpose | Exact content/change | Reason | Associated proof/test |
|---|---|---|---|---|---|
| 1 | `src/app/family-login/family-login.module.css` | Route-local family gateway styling | Approved typography, Home soft/primary treatment, opaque form surface, focus, targets, and 375/1440 reflow | Removes inline styles without a generic component | Login screenshots and computed accessibility checks |
| 1 | `src/lib/media/ambient-color.ts` | Deterministic Home-only palette normalization | Pure validation, sRGB-to-OKLCH conversion, clamping, gamut handling, compositing, contrast validation, and fallback according to the approved contract | Keeps numerical logic out of JSX and directly testable; it is not a design-system library | `ambient-color.test.ts` and active-slide E2E |
| 1 | `tests/unit/ambient-color.test.ts` | Numeric ambient contract proof | Test invalid/null palettes, selection, conversion, bounds, gamut clipping, worst-hue contrast, fallback, and deterministic output | Compilation cannot prove colour safety | Exact calculated ratios and boundary cases |
| 1 | `tests/e2e/release-2-family-visual.spec.ts` | Family screenshot/accessibility evidence | Deterministic 1440/375 login/Home captures; aspect, degraded, reduced-motion, font/token/focus/overflow/zoom/heading checks | Keeps visual evidence separate from the core flow and does not claim approval | Playwright artefacts for ChatGPT/Sujith review |
| 2 | `src/app/admin/admin.module.css` | Route-scoped shared Admin styling | Shell, page, list, form, filter, semantic state, action, media row, editor, responsive, and long-text classes using approved tokens | Repetition is proven across eight current Admin surfaces; one local module is simpler than new UI primitives | Admin screenshots and computed layout/target/focus checks |
| 2 | `tests/e2e/release-2-admin-visual.spec.ts` | Admin screenshot/accessibility evidence | Deterministic 1440/375 captures for every existing Admin route and applicable empty/populated/pending/error/long-text states; navigation, filter, target, overflow, zoom, focus, and leakage checks | Behavioural proof without a component-test dependency | Playwright artefacts and assertions |

No new UI component was proposed in the original Batch 1 declaration. The later approved continuation adds one small shared `FamilyHeader` only after Home and First Days proved the repeated family-navigation consumer; it does not create a generic design-system primitive or mirror a proof-board shape.

The approved production character files are `public/illustrations/varada/varada-delight.png`, `public/illustrations/varada/varada-wonder.png`, and `public/illustrations/varada/varada-sleepy.png`. Batch 1 uses Wonder only; Delight and Sleepy remain available without being added merely to fill space.

## 9. Files that must not change

The implementation batches must not change:

- `src/app/family-login/actions.ts`
- `src/app/admin/login/actions.ts`
- `src/app/admin/home/actions.ts`
- `src/app/admin/media/actions.ts`
- `src/components/auth/private-history-guard.tsx`
- `src/components/home/leave-button.tsx`
- `src/lib/auth/**`
- `src/lib/supabase/**`
- `src/lib/content/home.ts`
- `src/lib/content/manage-home.ts`
- `src/lib/admin/library-view.ts`
- `src/lib/media/palette.ts`
- `src/lib/media/manage-media.ts`
- `src/lib/media/finalize-upload.ts`
- `src/lib/media/private-url.ts`
- `src/lib/media/validate-upload.ts`
- `proxy.ts`, `next.config.ts`, `playwright.config.ts`, `package.json`, lockfiles, migrations, configuration, and environment files
- Existing security/integration tests except the exact test files listed in Section 7
- Every file under `docs/visual-proof/`
- `.claude/`
- QtPi Tracker, Paru Health, Vercel, DNS, authentication, and all production content outside the separately approved Pawpaw Home/First Days records

If implementation discovers that one of these files must change, stop and issue a new bounded declaration; do not broaden either batch.

## 10. Dependency decision

**Decision: add no dependency.**

- Exact package: none
- Install command: none
- Package licence/cost: not applicable
- Service cost/recurring cost: INR 0
- Maintenance burden: no added dependency surface
- Built-in alternative used: installed Next.js font support, native CSS variables/modules, native CSS transitions, existing React state, existing Playwright/Vitest/Sharp

## 11. Font-loading decision

After approval, `src/app/layout.tsx` should use these verified built-in declarations:

- `Fraunces({ weight: "500", style: "normal", subsets: ["latin"], display: "swap", variable: "--font-display", fallback: ["Georgia", "Times New Roman"] })`
- `Manrope({ weight: ["400", "600", "700"], style: "normal", subsets: ["latin"], display: "swap", variable: "--font-body", fallback: ["Arial"] })`
- `Noto_Sans_Malayalam({ weight: ["400", "500"], style: "normal", subsets: ["malayalam"], display: "swap", preload: false, variable: "--font-malayalam", fallback: ["Arial"] })`

Apply all three generated variable classes at `<html lang="en">`. Use `var(--font-body), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` for body; use `var(--font-display), Georgia, "Times New Roman", serif` for approved display roles; and use `var(--font-malayalam), var(--font-body), sans-serif` only under `[lang="ml"]`.

`preload: false` avoids preloading Malayalam when absent. Browsers fetch the self-hosted Malayalam file only when a matching face is used. Every actual Malayalam element must carry `lang="ml"`; no current English content is relabelled. `next/font` fallback metrics and `display: "swap"` limit layout shift. A later build must verify emitted files and no browser request to `fonts.googleapis.com` or `fonts.gstatic.com`.

## 12. Character-asset finding

No production-ready illustration asset exists under `src`, `public`, or non-proof `docs`. There is no `public` directory and no PNG, JPEG, WebP, GIF, SVG, AVIF, WOFF, TTF, or OTF candidate outside the proof pack.

`docs/visual-proof/varada-character-system.png` is a 1536 x 1024 sRGB PNG. It has four channels but its alpha channel is fully opaque (`min=255`, `max=255`, `isOpaque=true`). It is a composite proof board containing labels, palette, guidance, and multiple expressions. It is not an isolated transparent character, does not truthfully satisfy a production placement, and must never be used as the Home image or cropped/extracted.

**Resolved gate:** Sujith approved three isolated 1024 x 1024 transparent PNG production files under `public/illustrations/varada/`: delight, wonder and sleepy. They were inspected as complete isolated silhouettes with genuine alpha and no board labels or photographic content. Batch 1 uses Wonder decoratively beside Home content with empty alt text and without animation or photograph overlap.

## 13. Ambient-colour approved contract

Every number in this section is explicitly approved for Batch 1.

### Input and selection

- Input is the current `extracted_palette: string[] | null`, produced as up to five stored hex strings.
- Inspect at most the first five values in stored order.
- Accept only exact `#RRGGBB` sRGB strings.
- Convert every valid value from encoded sRGB to linear sRGB and then OKLab/OKLCH using the CSS Color 4 matrices.
- Select the first valid value with source lightness `0.20-0.90` and chroma `0.025-0.24`; otherwise select the first valid value; if none exists, use the fallback token.
- Stored palette order is not claimed to be dominance order; `src/lib/media/palette.ts` remains unchanged.

### Normalized colours

- Surface lightness: clamp to `L=0.92-0.95`.
- Surface chroma: clamp to `C<=0.06`.
- Accent lightness: clamp to `L=0.52-0.64`.
- Accent chroma: clamp to `C<=0.14`.
- Preserve selected hue after gamut mapping; clip to displayable sRGB deterministically.
- Ambient surface alpha over `--color-canvas`: `0.16-0.24`.
- Decorative accent alpha: `0.12-0.18`.
- Ambient-derived accent is decoration/border only; it is never body text, essential control text, semantic state, or the only state cue.

### Reading, contrast, fallback, and failure

- Essential prose, captions, labels, and controls use an opaque `--color-paper: #FFFEF8` or `--color-surface: #FFFDF7` neutral layer.
- Primary text remains `--color-ink: #2A1F14`; secondary essential text remains `--color-ink-secondary: #5C4E3D`; muted ink is metadata only after contextual contrast passes.
- Compute WCAG 2.2 sRGB contrast against the final composited pixel, not the uncomposited OKLCH value: at least `4.5:1` normal text, `3:1` large text and non-text UI boundaries.
- On failure, reduce chroma to zero, then reduce alpha to `0.16`; if still invalid or calculation fails, use `--color-home-soft: #FCEAED` with the neutral text layer.
- Missing, malformed, out-of-gamut, or exception-producing data never hides content, throws the route, changes the photograph, or suppresses prose. The static fallback renders immediately.

### Motion and containment

- Transition duration: `240ms` with the approved standard ease-out from Section 14.
- Under `prefers-reduced-motion: reduce`, duration is `0ms`; active colour changes immediately and the static state is complete.
- Only the bounded Home carousel/illustration frame may change. `html`, `body`, the full viewport, and the reading surface remain stable.
- No flashing, strobing, pulsing, brightness animation, full-screen colour change, or autoplay. One transition occurs only after an explicit carousel action.

### Calculated evidence

WCAG relative-luminance calculations using sRGB compositing give:

- `#2A1F14` on approved `#FFF8EE`: `15.26:1`.
- `#5C4E3D` on approved `#FFF8EE`: `7.62:1`.
- Across every integer hue at the darkest/highest-alpha approved surface boundary (`OKLCH L=0.92 C=0.06`, alpha `0.24` over `#FFF8EE`, with sRGB gamut clipping), the worst calculated result is `14.44:1` for `#2A1F14` and `7.21:1` for `#5C4E3D`.
- At the lightest/highest-alpha boundary (`L=0.95 C=0.06`, alpha `0.24`), the worst results are `14.68:1` and `7.33:1` respectively.

These examples support the approved bounds; implementation-time unit tests and computed browser checks remain mandatory and do not themselves constitute visual approval.

## 14. Motion approved contract

Every value in this section is explicitly approved for Batch 1.

| Token/value | Components | Purpose | Reduced-motion result | Static state complete? |
|---|---|---|---|---|
| `--motion-fast: 120ms` | Admin navigation/links, buttons, Home arrows/dots, focus/hover colour/border changes | Communicate immediate control state without choreography | `0ms`; state changes immediately | Yes |
| `--motion-standard: 240ms` | Home bounded ambient background only | Soften an explicit slide-driven colour change | `0ms`; new ambient appears immediately | Yes |
| `--motion-ease-out: cubic-bezier(0.2, 0.8, 0.2, 1)` | Both durations | One predictable deceleration curve | No easing because duration is `0ms` | Yes |

The former `600ms` ambient transition and `200ms` untokenized dot transition are replaced in Batch 1 by the approved values. No transform, entrance animation, parallax, bounce, character motion, loading shimmer, auto-advance, or animation library is used. Focus is never delayed. Error, success, empty, loading/pending, and reduced-motion layouts remain complete without animation.

## 15. CSS/component strategy

- Put approved semantic colours, font stacks, focus treatment, and approved motion tokens once in `src/app/globals.css`.
- Keep family route styling in the new family login module and existing Home modules.
- Keep Admin repetition in one route-scoped `src/app/admin/admin.module.css`; do not expose it as a generic framework.
- Preserve existing semantic HTML and current components. Extract inline presentation to classes without moving server/data logic.
- Add no new UI component. Repetition is styling-level, not a proven behavioural primitive.
- Add one pure Home-specific colour utility because numeric normalization and contrast require deterministic unit tests.
- Use existing `AmbientFrame` as a presentational wrapper inside `HomeCarousel`, where active state already exists.
- Do not reproduce future proof-board navigation or shapes that point to unimplemented routes.

## 16. Batch 1 declaration

**Goal:** implement font loading, approved global tokens, family login, authenticated Home shell, carousel composition, bounded active-photo ambient colour, character placement, and complete static/reduced-motion states while preserving all viewer, publishing, prose, media, and logout behaviour.

**Exact current source/test set:** the Batch 1 rows in Sections 7 and 8 plus the three approved character files listed in the current implementation instruction. No other file may change without explicit authorization.

**Sequence:**

1. Complete and approve the separate production character-asset gate. **Done.**
2. Approve Sections 11, 13, and 14 and Batch 1 itself. **Done.**
3. Add root fonts/tokens and run type-check, lint, unit tests, and build. **Done; all mandated commands pass.**
4. Add the pure ambient utility and unit boundary tests. **Done; 14 tests pass.**
5. Restyle family login; verify auth behaviour unchanged. **Done; 1440px and 375px evidence is complete.**
6. Recompose Home/carousel with active ambient state and the approved asset; retain one whole photo and all controls. **Done; all six exact crops are present in locked order.**
7. Expand real Home behaviour tests and generate the required evidence screenshots. **Done; production-build Playwright evidence is complete.**
8. Run the full Batch 1 verification boundary and stop for evidence review. **Done; awaiting explicit visual review only.**

**Readiness:** **IMPLEMENTED AND EVIDENCE-READY**. Secure media upload/association, exact Home repair, post-E2E loader verification, full automated commands and screenshot inspection are complete. Sujith's explicit visual review is the remaining approval gate; Batch 2 is not authorised by this result.

## 17. Batch 2 declaration

**Goal:** apply the approved author's-studio language to Admin login, shell/navigation, dashboard, Content Library, Media Library, and Home editor without changing any query, filter, ownership rule, signed delivery, upload, or mutation behaviour.

**Exact source/test set:** only the Batch 2 rows in Sections 7 and 8.

**Sequence:**

1. Start only after Batch 1's shared visual foundation is verified, or after Sujith explicitly authorizes Batch 2 against an independently verified shared foundation.
2. Approve the font-loading/motion contracts and Batch 2 itself.
3. Add the route-scoped Admin module and shell/sidebar/mobile structure.
4. Restyle login, dashboard, Content, Media, and Home editor in that order, running relevant tests after each surface.
5. Update only the two declared unit source-contract files where extracted styles invalidate obsolete assertions.
6. Generate the full Admin screenshot/state matrix and run interaction/accessibility checks.
7. Run the full Batch 2 verification boundary in Section 22 and stop for evidence review.

**Readiness:** **NOT READY**. Batch 2 remains unauthorised. Batch 1's completed shared foundation and evidence do not authorize Admin implementation; a separate explicit Batch 2 instruction is required after Batch 1 review.

## 18. Accessibility acceptance criteria

Implementation is rejected unless all applicable checks pass:

- WCAG 2.2 AA contrast against final composited colours
- Every pointer target at least 44 x 44 CSS px, including carousel dots, Leave, Admin navigation, row actions, and destructive confirmations
- Visible, non-clipped `:focus-visible` with at least a non-colour outline cue
- Carousel operates by previous/next buttons, position controls, ArrowLeft/ArrowRight, and touch swipe; no autoplay
- Primary family photographs remain `object-fit: contain`; decorative duplicates remain hidden from assistive technology
- Illustration, controls, text, gradients, and ambient layers never cover faces or essential photograph detail
- No horizontal page scroll at 320px; deliberate reflow at 375px
- 200% browser zoom retains visible labels/actions without clipping or forced two-dimensional scrolling
- `prefers-reduced-motion: reduce` yields complete static states and zero nonessential transition duration
- Semantic heading order and one appropriate `main` landmark per route
- Active navigation and status are not conveyed by colour alone; retain `aria-current`, text, shape, border, or weight cues
- Every Malayalam element uses `lang="ml"`; English content is not relabelled
- Essential help, errors, statuses, labels, and actions are not rendered as tiny low-contrast muted text
- Error/status roles, field labels, autocomplete, disabled/pending semantics, and destructive confirmation remain intact

## 19. Visual-proof and screenshot requirements

Implementation-time Playwright must save deterministic evidence artefacts for ChatGPT/Sujith review. Screenshots do not create a fourth formal manual round and do not equal visual approval.

### Family

- `/family-login`: 1440px and 375px
- Authenticated `/`: 1440px and 375px
- Home with all six genuine approved full-size photographs, retaining their source square and portrait ratios without fabrication or recropping.
- Home under reduced motion
- Home with degraded media while published prose remains visible
- Empty and operational-error Home states
- Long title/prose, long caption, and 200% zoom where applicable

### Admin

- `/admin/login`: 1440px and 375px
- `/admin`: 1440px and 375px
- `/admin/content`: 1440px and 375px
- `/admin/media`: 1440px and 375px
- `/admin/home`: 1440px and 375px
- Empty, populated, pending/loading, error, and long-text states where the current surface exposes them
- Destructive confirmation, success, and error states where applicable

Use deterministic fixtures, mask volatile timestamps/signed URL query strings if needed, and wait for fonts/images before capture. Do not screenshot secrets, credentials, raw storage paths, or signed URL text. Keep screenshot output in Playwright's ignored test artefact directory unless a later explicit approval creates a reviewed baseline pack.

## 20. Automated test changes required

### Exact existing tests to modify

- `tests/e2e/home-flow.spec.ts`: behavioural carousel, aspect-ratio, active ambient, reduced motion, targets, overflow, and zoom coverage
- `tests/unit/ui-acceptance.test.ts`: preserve behaviour guards; update only superseded style assertions; add one-time token declaration guard
- `tests/unit/admin-dashboard.test.ts`: replace obsolete horizontal-nav style expectations with declared sidebar/mobile/focus/target/reduced-motion contracts

### Exact new tests to add

- `tests/unit/ambient-color.test.ts`
- `tests/e2e/release-2-family-visual.spec.ts`
- `tests/e2e/release-2-admin-visual.spec.ts`

### Existing tests that must remain unchanged and green

- `tests/unit/home-content-loader.test.ts`: published prose survives media failure
- `tests/unit/admin-library-behavior.test.ts`: query/filter/order behaviour
- `tests/unit/content-library.test.ts`, `tests/unit/media-library.test.ts`: current route/data/mutation contracts
- `tests/e2e/auth-boundaries.spec.ts`: unauthenticated redirects, logout, protected history, private/no-store headers
- `tests/e2e/published-home-route.spec.ts`: real publish/degrade/unpublish/republish lifecycle and prose preservation
- Existing auth, viewer-cookie, origin, upload, RLS/migration, owner media, integration, and cleanup tests

The complete test plan must prove root font classes/computed families, canonical tokens declared once and computed in use, arrows/dots/keyboard/swipe/no autoplay, whole-image containment, degraded-media prose, reduced motion, unchanged Admin filters/mutations, 44px mobile navigation, 320px overflow, protected logout/history, and no secret/raw private-path leakage. Source-string checks may supplement but never replace browser or pure-function behaviour tests.

## 21. Security and privacy regressions that must be prevented

Neither batch may change or weaken:

- Viewer passphrase verification, throttle, cookie signing/version/expiry/options, or redirect flow
- Admin login action, active-admin allowlist, session handling, or logout flow
- Pawpaw RLS, private `media` bucket, owner-scoped paths/mutations, or short-lived signed delivery
- Origin checks, byte/type/size validation, direct signed upload, or permanent-delete confirmation
- Draft/published isolation, canonical Home singleton, validated prose, or degraded-media separation
- Private `no-store` response behaviour, robots protection, or protected history hiding/revalidation
- Cross-application Supabase isolation from QtPi Tracker and Paru Health
- Secret handling; no service key, passphrase, cookie value, token, raw private storage path, or signed URL may be logged, displayed as text, committed, or captured

Signed image URLs may remain only in the necessary `img src` delivery path. They must not become visible copy links, analytics payloads, CSS background URLs persisted beyond the response, or screenshot labels.

## 22. Verification commands

At each batch boundary run, from the repository root:

```powershell
git diff --check
git status --short
git diff --stat
git diff --name-only
npm run type-check
npm run lint
npm test
npm run build
npm run test:integration:live
npm run test:e2e
```

Also run targeted tests while working:

```powershell
npx vitest run tests/unit/ambient-color.test.ts tests/unit/home-content-loader.test.ts tests/unit/admin-library-behavior.test.ts tests/unit/ui-acceptance.test.ts tests/unit/admin-dashboard.test.ts
npx playwright test tests/e2e/home-flow.spec.ts tests/e2e/auth-boundaries.spec.ts tests/e2e/published-home-route.spec.ts tests/e2e/release-2-family-visual.spec.ts tests/e2e/release-2-admin-visual.spec.ts
```

After every build, restore `next-env.d.ts` if Next.js regenerates it and verify it has no diff. Verify exact changed paths against the approved batch list, no package/lock/config/migration/asset drift, no proof-pack drift, no secret files, no unexpected skipped test, and no `.claude/` interaction. A successful command is necessary but does not prove the user-facing outcome; screenshot/accessibility/behaviour evidence remains required.

## 23. Deployment boundary

Neither batch includes commit, push, merge, Vercel deployment, DNS change, schema/policy/authentication change, cross-application operation, or production deployment verification. Later explicit instructions authorised the completed bounded content operations: the earlier Home repair, six full-size Home uploads and replacement associations, one existing-model First Days story, and nine First Days uploads/associations. Any checkpoint, Batch 2 work, or deployment still needs a separate instruction with fresh pre-flight and exact authorization.

## 24. Current approval and evidence state

1. **Approved:** this declaration and its exact two-batch boundary.
2. **Approved:** `next/font/google` mechanics and exact font weights/subsets.
3. **Approved:** every numeric ambient-colour value in Section 13.
4. **Approved:** every duration/easing and reduced-motion value in Section 14.
5. **Approved:** the isolated delight, wonder and sleepy production character assets.
6. **Approved and executed in the working tree:** Batch 1 source implementation.
7. **Approved policy clarification:** genuine documentary photographs may use mild manual or AI-assisted presentation enhancement without an AI-generated label when factual scene content is unchanged. Sujith approved the six enhanced Home photographs, and untouched camera originals are not required as Pawpaw presentation assets.
8. **Completed full-size media gate:** all 20 import-pack files remain manifest-hash-identical; the five alternates were not imported. Six full-size Home and nine First Days files were signed-uploaded without byte changes. All 15 stored hashes match, all 15 signed URLs return HTTP 200, Home has six distinct new associations, First Days has nine distinct associations, and the six temporary Home records/objects remain intact with zero Home associations.
9. **Completed automated evidence gate:** type-check, lint, 266-test default suite with 42 intentional credential-gated skips, 43-test live integration suite, production build, and full Playwright suite with 42 passed/12 intentional project skips all pass. Fixture reconciliation and server-process residue are zero. Complete Home and First Days evidence sets are present under `test-results/`.
10. **Final 10/10 approved and locked:** Family Login, authenticated Home, all six Home photographs, Home prose/captions, First Days, all nine chronological First Days photographs, captions/alt text, desktop/mobile/200% zoom layouts, reduced motion, degraded media, family navigation, and Leave placement/behaviour.
11. **All Batch 1 visual gates closed:** the final Story orchid, decorative Sleepy header, tighter desktop rhythm, readable captions, accessibility evidence, and exact mobile chronology are approved.
12. **Release authorised:** Sujith authorised one Batch 1 commit, push to `origin/main`, exact-commit deployment through the existing linked Vercel project, and read-only production smoke testing on 19 July 2026. Canonical production is `https://www.heyvarada.in`; fallback is `https://pawpaw-lemon.vercel.app`.
13. **Unauthorised:** Batch 2 and any further family chapter or Admin redesign.

### Bounded continuation implementation record

The continuation adds only the following source/test paths beyond the earlier Batch 1 set:

- `src/app/(archive)/first-days/page.tsx`
- `src/app/(archive)/first-days/first-days.module.css`
- `src/components/archive/family-header.tsx`
- `src/components/archive/family-header.module.css`
- `src/lib/content/first-days.ts`
- `tests/unit/first-days-content-loader.test.ts`
- `tests/e2e/release-2-first-days-visual.spec.ts`

It also updates the existing archive layout, Home page/CSS, carousel presentation, Leave styling, authentication-boundary tests, Home visual evidence test, UI acceptance guard, this declaration, and `docs/PROJECT_STATUS.md`. No Admin source, schema, migration, RLS, policy, bucket, Storage configuration, authentication logic, dependency, package, lockfile, application configuration, proof asset, import source, QtPi Tracker, Paru Health, commit, push, or deployment is included.

First Days content item `bfa8d2ca-4237-49df-af1b-5e73ad9f5b9e` is a published Pawpaw-owned `story` with slug `first-days`. Its nine records preserve manifest order, captions and factual alt text. Home retains its canonical title/prose and now references six full-size records. The old crop records were detached only; their metadata and Storage objects were not deleted.

### First Days final-review repair record

The final-review repair changes only the existing First Days route/CSS, its visual evidence assertions and the two status documents. The page now uses `--color-story-primary` (`#9B5FC0`), `--color-story-soft` (`#F2EBF8`) and `--color-story-on-soft` (`#4E1A6E`) within the chapter while retaining neutral ink for captions and body text. Approved `varada-sleepy.png` appears decoratively with empty alt text in a dedicated responsive orchid-soft header zone: 190–240 CSS pixels on desktop and 105–135 CSS pixels in compact/mobile composition. The title, character and first photograph remain geometrically distinct at desktop, mobile and 200% zoom.

Desktop figure gaps are reduced by approximately one quarter while preserving the large opening photograph and the alternating left/right/centred editorial sequence. Captions render at 15–17px, at least 1.45 line-height and WCAG AA contrast. Exact chronological order, image bytes, captions, alt text, route/data, degraded-media truthfulness and the approved mobile photograph flow remain unchanged. First Days evidence is regenerated under `test-results/release-2-first-days-evidence/`; approved Home evidence remains locked. Sujith explicitly approved and locked the repaired First Days surface at 10/10 on 19 July 2026.

No manual testing is requested. Formal manual rounds remain 3 of 3.

## 25. Stop conditions

Stop without broadening scope if:

- Branch/HEAD/working-tree pre-flight differs from the implementation instruction
- Any unapproved file, dependency, package, lockfile, configuration, migration, asset, proof file, or `.claude/` path would change
- Any approved character asset becomes absent, opaque, mismatched, under-sized or otherwise fails its recorded gate
- Implementation cannot satisfy the approved ambient or motion contract tests
- Fonts cannot build into self-hosted files or a browser contacts Google at runtime
- A new route, content type, schema, mutation, generic component library, or future family navigation is needed
- Current security, private media, owner scope, publishing, logout/history, no-store, or cross-application boundaries would change
- Portrait/landscape/square containment, prose degradation, 44px targets, 320px overflow, 375px reflow, 200% zoom, focus, contrast, reduced motion, keyboard/swipe, or no-autoplay proof fails
- Any required command fails, any expected fixture cleanup fails, or visual evidence is incomplete
- Visual review is below the Pawpaw 10/10 gate; do not downgrade the gate or call screenshots approval
- Commit, push, deployment, production mutation, or another manual round would be required without separate explicit authorization

At a stop, preserve the working tree, report exact evidence, and request only the smallest missing business approval or external asset action.

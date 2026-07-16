# Varada — Canonical Product and Build Brief

**Status:** Canonical  
**Owner:** Sujith  
**Implementation:** Claude  
**Product direction and review:** ChatGPT  
**Date:** 15 July 2026
**Version:** 3.0 — dynamic private app + premium playful creative direction

This file replaces every earlier Varada website brief, especially the static Markdown/JSON and edit-and-redeploy direction. If another note conflicts with this file, this file wins unless Sujith explicitly changes a locked decision.

## 1. Product

Build a beautiful, durable, private digital home for Varada that Sujith and Paru can update directly from their phones and that can eventually belong to Varada.

It is a dynamic private web application: a selective family archive, not a tracker, public parenting diary, social network, generic baby site, or unfiltered photo dump.

## 2. Locked requirements

### Privacy

- Mode A: private family archive.
- Nothing is intentionally public.
- Invited family and friends use shared viewer access.
- All archive pages, content, and photographs require a valid viewer or administrator session before delivery.
- Search-engine blocking is hygiene, not access control.

### ADMIN tier

Sujith and Paru only.

Administrators can:

- sign in with Supabase Auth email/password;
- create and edit content in the browser;
- save drafts;
- publish and unpublish;
- upload photographs directly from a phone;
- add captions, alt text, ordering, and focal points;
- select photographs for Home and Gallery.

There is no public registration. Administrator identities must be explicitly allowlisted and enforced in database, Storage, and server-side mutation rules.

### VIEWER tier

Invited family and friends receive one shared family passphrase and read-only access.

- Verify the passphrase only in a Node-runtime server route or server action.
- Store only a slow hash of the passphrase; prefer Node's built-in `scrypt` to avoid another authentication dependency.
- On success, set a cryptographically signed `httpOnly`, `Secure`, `SameSite=Lax` cookie.
- Never store the raw passphrase in the cookie, browser storage, repository, or database.
- Include cookie expiry and a revocable session-version value so passphrase rotation invalidates old sessions.
- Validate signature, expiry, and version; checking only for cookie existence is forbidden.
- Throttle repeated failed attempts.

A shared passphrase is household-grade shared access, not identity-bound authorization. Anyone who receives it can enter until it is rotated. This accepted limitation must never carry into the future document vault.

## 3. Releases

### Release 1

1. **Home**
   - premium photograph carousel;
   - Varada's name and approved introductory prose;
   - ambient accents derived from the active photograph;
   - no autoplay.

2. **Her Story**
   - manually approved story sections;
   - no health or medical information.

3. **Gallery**
   - one curated album;
   - ordered photographs with optional captions and required alt-text decisions.

4. **Administrator backend**
   - mobile-first browser interface;
   - draft/publish workflow;
   - direct private photograph upload;
   - content and media management for all Release 1 surfaces.

Release 1 uses the full publishing, media, authentication, and editor foundation required for later content types.

### Release 2

Add presentation routes and admin workflows for:

- **Letters** — messages to Varada;
- **Moments** — selected milestones and photo stories.

These must be new content types on the Release 1 system, not a new CMS, authentication model, or storage architecture. Do not ship empty Letters or Moments pages in Release 1.

### Release 3 and later

Possible later systems:

- document vault: birth certificate, government IDs, and medical documents;
- financial records and analytics: SSY, SIP, and related records.

Do not pre-build them in Release 1.

Their required quarantine is:

- separate application/repository and preferably separate backend project;
- reserved separate subdomain such as `vault.<chosen-domain>`;
- per-user authentication, never the viewer passphrase;
- separate cookies and sessions;
- encrypted-document design suitable for sensitive records;
- no assumption that a private Storage bucket alone equals document-level encryption.

The Release 1 repo contains no vault routes, tables, bucket, financial schema, placeholder dashboard, or dormant feature flags.

## 4. Permanent exclusions and privacy boundary

Permanently excluded from the family archive:

- feeding, medication, weight, sleep, reflux, health, or medical tracking;
- any merge, import, shared database, or shared Storage with qtpi;
- public comments, likes, followers, or feeds;
- notifications;
- product analytics or behavioural tracking;
- face recognition;
- AI-generated memories presented as fact;
- native mobile app;
- public access to photographs or private story content.

Medical documents may exist only in the future separately authenticated vault. They must never appear in the family archive shared with friends and relatives.

## 5. Product personality and design direction

Varada must feel **youthful, joyful, intelligent, imaginative, baby-girlish, modern, elegant, and premium at the same time**.

This is not a sombre editorial archive, restrained luxury catalogue, newspaper, museum database, or conventional pastel nursery website. It is the digital world of a much-loved little girl, created by adults with excellent taste who still love cartoons, superheroes, fantasy, silliness, stories, stars, clouds, costumes, and wonder.

The emotional test is:

> It should feel magical enough for a child, intelligent enough for her parents, and beautiful enough to remain meaningful when she grows up.

### 5.1 Core creative direction

The visual system combines:

- premium photography;
- contemporary illustration;
- intelligent cartoons;
- playful typography;
- imaginative storytelling;
- high-quality motion;
- dynamic colour drawn from Varada's photographs;
- elegant spacing and composition;
- small moments of surprise, humour, and affection.

The site may include:

- original cartoon versions of Varada and her family;
- imaginative baby superheroes;
- astronaut, scientist, explorer, artist, detective, pilot, reader, musician, and inventor themes;
- tasteful cosplay-inspired scenes;
- stars, planets, moons, clouds, rainbows, flowers, animals, constellations, storybook cities, and dream worlds;
- illustrated transitions between real photographs and imagined worlds;
- playful badges, labels, stamps, doodles, speech bubbles, miniature scenes, and character reactions;
- seasonal or story-specific visual worlds.

Cartoons must be visually sophisticated and intentional—not generic clip art, commodity nursery graphics, random emoji decoration, or low-quality AI imagery.

Original characters and superhero archetypes are preferred. Do not build the site's permanent visual identity from unlicensed Marvel, DC, Disney, Pixar, Studio Ghibli, or other protected characters.

AI-assisted or AI-generated artwork may be used as clearly imaginative illustration. It must never be presented as a photograph, actual event, quotation, milestone, or factual memory. Sujith approves every illustration before publication.

### 5.2 Visual character

The base interface should remain polished and easy to use, but it must not be emotionally sterile.

Use:

- confident, contemporary layouts;
- asymmetry where it improves energy;
- rounded and organic shapes;
- expressive image masks;
- layered illustration around photography;
- occasional oversized typography;
- delightful transitions between sections;
- playful visual depth;
- generous breathing room so rich artwork still feels premium.

Every screen should have a clear visual idea. Not every motif should appear at once.

For example:

- a photograph may sit inside a drifting cloud world;
- Gallery may feel like a constellation of memories;
- Her Story may unfold like an illustrated storybook;
- a carousel transition may briefly reveal stars or drawn motion trails;
- an empty state may show a tiny illustrated explorer waiting for the next adventure.

### 5.3 Colour system

The site is allowed to be colourful.

“Premium” must not be interpreted as beige, muted, monochrome, or permanently restrained. Baby-girlish also must not be reduced to one shade of pale pink.

Use a broad but controlled colour world that can include:

- rose;
- berry;
- orchid;
- lilac;
- violet;
- coral;
- peach;
- sky blue;
- moonlight blue;
- mint;
- pistachio;
- butter yellow;
- warm cream;
- deep plum;
- midnight ink.

Warm paper and deep ink may remain useful neutral foundations, but they are supporting colours—not the entire personality.

Colour should feel:

- luminous rather than fluorescent;
- rich rather than muddy;
- joyful rather than chaotic;
- feminine without becoming formulaic;
- childlike without looking cheap.

### 5.4 Ambient theming

Each major photograph should influence the surrounding page.

At upload time, extract and store a usable palette from the photograph. The active photograph may influence:

- section backgrounds;
- carousel controls;
- decorative illustration;
- gradients;
- borders;
- headings;
- small animated details;
- navigation accents.

Implementation rules:

- do not apply an uncontrolled dominant colour directly to body text;
- generate accessible foreground and background combinations;
- clamp extracted colours into the site's visual system;
- retain a stable neutral layer for readability;
- use a designed fallback palette when extraction fails;
- avoid sudden full-screen colour flashes;
- preserve visual continuity while moving between photographs.

Ambient theming should make each memory feel individually art-directed, not merely recoloured by an algorithm.

### 5.5 Illustration system

Illustration is a first-class design layer, not optional decoration added at the end.

The system should support:

- recurring original characters;
- simplified family likenesses;
- miniature narrative scenes;
- photograph-and-cartoon compositions;
- stickers and collectible visual elements;
- hand-drawn annotations;
- themed chapter artwork;
- occasional full-screen illustrated moments.

Illustrations must share a consistent visual grammar:

- coherent line quality;
- controlled proportions;
- recurring facial and character language;
- consistent shading;
- compatible colour treatment;
- repeatable treatment of stars, clouds, costumes, and environmental elements.

Do not mix unrelated cartoon styles across the site.

Real photographs remain the emotional centre. Illustration should enlarge the imaginative world around them, not overpower or trivialise them.

### 5.6 Typography

Typography should feel modern, expressive, friendly, and intelligent.

Use:

- an expressive contemporary display face for major headings;
- a highly readable modern sans-serif for body copy and controls;
- occasional custom lettering or illustrated words for special moments;
- playful scale changes and line breaks where they improve storytelling.

Avoid making the entire product resemble:

- a literary journal;
- a luxury perfume brand;
- a corporate SaaS dashboard;
- a preschool worksheet;
- a generic baby-shower invitation.

An initial pairing such as **Bricolage Grotesque with Manrope** may be tested, but final selection must be judged against real photographs, illustrations, Malayalam and English names if needed, mobile legibility, and the desired emotional tone.

### 5.7 Motion and interaction

Motion should be joyful and polished, not absent.

Appropriate motion includes:

- soft parallax;
- drifting stars or clouds;
- tiny character reactions;
- illustrated page transitions;
- gentle object entrances;
- carousel depth;
- tactile button responses;
- subtle sparkle, trail, bounce, float, or orbit effects;
- occasional playful surprises triggered by deliberate interaction.

Rules:

- no autoplay video;
- no continuous animation that competes with reading or photographs;
- no excessive bouncing of functional controls;
- no long cinematic transitions that slow navigation;
- respect `prefers-reduced-motion`;
- maintain good performance on ordinary Indian mobile connections;
- interaction must remain clear without animation.

The goal is **restrained quantity, not restrained imagination**.

### 5.8 Premium carousel

The Home carousel should feel like a designed experience, not a standard component with photographs inserted into it.

It must support:

- touch swipe;
- keyboard navigation;
- visible previous and next controls;
- a clear position indicator;
- focal-point-aware crops;
- portrait and landscape images;
- optional captions;
- ambient palette transitions;
- adjacent-image preloading;
- stable dimensions without layout jumps;
- optional illustration layers designed for individual photographs.

No autoplay. Sujith or Paru moves to the next memory deliberately.

Transitions may be playful—cloud wipes, star trails, illustrated curtains, expanding shapes, or cinematic depth—but must remain fast, readable, and reversible.

### 5.9 Copy and editorial voice

The writing and interface language must belong to the same world as the visual design.

Copy should be:

- affectionate;
- youthful;
- clever;
- warm;
- imaginative;
- emotionally precise;
- occasionally funny;
- capable of becoming poetic without becoming solemn;
- written as though Varada may read it herself one day.

Interface labels may carry personality where meaning remains clear.

Examples of the intended register:

- “Varada's little universe”
- “A new adventure”
- “Made of stardust, milk and strong opinions”
- “Chapter one”
- “Her current superpowers”
- “Tiny moments, properly treasured”
- “A message for future Varada”

Avoid:

- hospital-record language;
- generic baby-product copy;
- exaggerated social-media sentiment;
- constant princess clichés;
- corporate CMS terminology in the family-facing interface;
- writing that treats her childhood like a solemn historical archive;
- AI-generated claims or invented memories.

Admin controls should still use clear functional wording such as **Save draft**, **Preview**, **Publish**, and **Upload photos**.

### 5.10 Quality boundary

The following are not forbidden because they are playful; they are rejected because they are low quality:

- generic nursery clip art;
- random emoji used as the main icon system;
- uncontrolled rainbow palettes;
- stock cartoon babies;
- inconsistent AI illustration styles;
- excessive glass effects that reduce contrast;
- decorative elements covering faces;
- animation on every object;
- fake handwritten fonts used for long passages;
- stereotypical “everything pink and princess” treatment;
- childish wording that talks down to Varada;
- visual clutter without hierarchy.

The standard is:

**childish imagination with adult-level art direction.**

Final refinement happens against actual Home, Her Story, Gallery, login, and admin screens using Varada's real photographs. A technically clean but emotionally restrained result does not satisfy the brief.
## 6. Architecture decision

**Accepted, with the corrections below:**

- Next.js App Router;
- Vercel;
- Supabase Auth;
- Supabase Postgres;
- Supabase private Storage bucket;
- separate repo, Vercel project, and Supabase project from qtpi.

No further architecture-selection round is required before Phase 1.

### Request gate

Use the server request-gating convention supported by the installed Next.js version. In Next.js 16 this is `proxy.ts`, replacing the older `middleware.ts` name.

The request gate:

- protects archive and admin route groups;
- validates the signed viewer cookie using Edge-compatible Web Crypto;
- redirects unauthenticated viewers to family login;
- never verifies the family passphrase itself;
- avoids database-heavy authorization logic.

### Administrator authorization

Supabase Auth proves identity but does not alone grant administrator rights.

Enforce admin authorization through:

- an `admin_users` allowlist keyed by Supabase user ID;
- Row Level Security on content and media metadata;
- Storage policies allowing writes only to active administrators;
- server-side checks on every administrator mutation;
- disabled open registration.

### Viewer data path

A viewer cookie is not a Supabase Auth session. Viewer browsers must not query private tables or Storage directly.

Viewer requests must:

1. pass signed-cookie validation;
2. fetch only `published` content through server-side code;
3. receive photographs only through an authenticated delivery path.

The Supabase service-role key is server-only and must never enter client bundles, browser storage, logs, or the repository.

### Private photographs

All photographs live in a non-public bucket.

After session validation, use either:

- short-lived signed Storage URLs generated on the server; or
- an authenticated image route that streams the object.

Required constraints:

- no public bucket or permanent photo URL;
- no private photo in the repo;
- short signed-URL expiry;
- no unauthenticated shared image-optimization cache that can outlive a viewer session;
- copied signed URLs may work until expiry, which is an accepted limitation.

Do not send private photographs through an optimization/CDN path until its access-control and cache behaviour have been explicitly verified.

## 7. Minimal data model

### `admin_users`

- `user_id`
- display name
- active flag
- timestamps

### `content_items`

- `id`
- `type`: `home`, `story`, `gallery`, `letter`, or `moment`
- `slug`
- `title`
- optional summary
- `body_blocks` as structured `jsonb`
- `status`: `draft` or `published`
- optional `cover_media_id`
- `published_at`
- `created_by`, `updated_by`
- timestamps

Use a small validated block schema, not saved arbitrary HTML. Release 1 needs only headings, paragraphs, quotations, and media references.

### `media_assets`

- `id`
- private Storage path
- MIME type and byte size
- width and height
- alt text
- optional caption
- focal-point coordinates
- extracted palette
- processing status/error
- `created_by`
- timestamp

### `content_media`

- content ID
- media ID
- sort order
- optional placement/caption override

Home, Gallery, Letters, and Moments reuse the same media system.

### Publishing rules

- Viewers receive only published rows.
- Drafts remain admin-only.
- Publishing records `published_at`.
- Unpublishing hides content without deleting it.
- Referenced media cannot be silently deleted.
- Every factual statement about Varada requires Sujith's approval.

## 8. Photograph upload pipeline

1. Admin selects a supported image on the phone.
2. Browser validates type and size.
3. Create or enforce a web-sized presentation copy.
4. Upload directly to the private Supabase bucket under authenticated Storage policies.
5. Server-side processing records dimensions, extracts a palette, and updates `media_assets`.
6. Admin adds alt text, caption, focal point, and placement before publication.

The site is a presentation archive, not the only master photo backup.

- Original photographs remain in Sujith and Paru's normal photo backup system.
- Release 1 stores optimized presentation copies, not unlimited camera originals.
- Supported Release 1 formats: JPEG, PNG, and WebP.
- Unsupported files produce a clear error, not silent failure.

`sharp` is an acceptable free, open-source server dependency for metadata and palette extraction only after its Vercel runtime behaviour is tested. Record its purpose, install command, and zero service cost. If it fails, use a tested browser Canvas fallback. Do not introduce a paid image service without Sujith's approval.

## 9. Free-tier resource gate

Release 1 assumes Vercel Hobby and Supabase Free. No paid service is silently assumed.

The free-tier model is acceptable only if:

- uploaded presentation images are optimized;
- video is excluded;
- Supabase is not treated as the sole archive of original photographs;
- a manual database/content export procedure is documented;
- actual usage is checked after loading the first real album.

Before implementation, Claude must verify the then-current limits for storage, egress, upload size, inactivity pausing, backups, image transformations, and Vercel usage caps.

If Sujith later requires original-resolution archival storage, video, frequent large downloads, guaranteed no-pause availability, or managed backups, the all-free constraint must be reopened explicitly.

## 10. Route and session separation

Recommended route groups:

- `/family-login` — public passphrase form only;
- archive routes — viewer or admin session required;
- `/admin/login` — administrator login;
- `/admin/*` — administrator session required;
- separate viewer and admin logout endpoints.

Viewer and admin cookies have different names and validation logic. A viewer cookie never grants admin access.

Protected responses use private/no-store cache behaviour until authenticated caching is deliberately designed and tested.

Add:

- `robots.txt` disallowing crawling;
- `X-Robots-Tag: noindex, nofollow, noarchive` on protected responses;
- no public sitemap of archive routes;
- no Open Graph image containing a private photograph.

These reduce accidental indexing but do not replace authentication.

## 11. Phase 1 execution boundary

Phase 1 is exactly:

- repo scaffold;
- Supabase connection and committed migrations;
- admin auth and allowlist enforcement;
- viewer passphrase login, signed cookie, request gate, logout, session rotation/version, and throttling;
- private Storage bucket and policies;
- minimum content/media schema;
- mobile-capable admin flow to create/publish Home content and upload/select Home photographs;
- authenticated Home page with real carousel and ambient-theme foundation;
- automated tests for critical auth and publication boundaries;
- manual mobile and desktop acceptance pass.

Phase 1 excludes:

- Her Story implementation;
- Gallery implementation;
- Letters or Moments screens;
- vault or finance code;
- analytics or notifications;
- visual polish unrelated to the working Home flow;
- speculative abstractions beyond the declared model.

Before writing code, Claude must state:

1. exact files to create or change;
2. migrations and policies;
3. every dependency, purpose, install command, and cost;
4. required environment variables;
5. automated and manual acceptance tests;
6. any deviation from this brief.

ChatGPT reviews that bounded declaration. Claude then implements. Generated code is unverified until tests and real screens are manually checked.

## 12. Release 1 acceptance

### Security

- Unauthenticated requests cannot retrieve archive HTML, database content, or photographs.
- Forged, expired, altered, and old-version viewer cookies fail.
- The passphrase is server-checked against a slow hash.
- Failed attempts are throttled.
- Drafts never appear in viewer responses.
- A non-admin Supabase user cannot write content or Storage objects.
- Public Storage URLs fail.
- The service-role key is absent from client bundles.
- Admin mutations reject unauthenticated and cross-origin requests.
- Saved content cannot inject arbitrary script or HTML.
- qtpi code, data, credentials, tables, and media are absent.

### Viewer experience

- Family login works at 375 px width.
- Valid login creates a persistent viewer session.
- Home, Her Story, and Gallery are inaccessible without a valid session.
- Home carousel supports touch, keyboard, and visible controls.
- Ambient theming preserves readable contrast.
- No autoplay.
- Gallery preserves intentional order and cropping.
- Reduced-motion users avoid unnecessary animation.
- Pages remain usable on ordinary Indian mobile data.

### Admin experience

- Sujith and Paru sign in independently.
- Core administration works from a phone.
- Admin can create, draft, edit, publish, and unpublish.
- Admin can upload without repository access or redeployment.
- Upload processing records dimensions and a usable palette or fallback.
- Admin can set order, caption, alt text, and focal point.
- Failures produce visible recoverable states, never false success.

### Operations

- Migrations, RLS, and Storage policies are committed and reproducible.
- Environment variables are documented without secrets.
- A fresh environment can be configured from repo instructions.
- Published content survives redeploys.
- Content changes require no code deployment.
- Manual backup/export is documented.

## 13. Working model

- **Sujith:** final decisions, photographs, family facts, copy approval, domain purchase, and launch approval.
- **Paru:** administrator and content contributor; approves content attributed to her.
- **ChatGPT:** product lead, scope control, UX direction, acceptance criteria, and independent review.
- **Claude:** implementation partner and technical reviewer.

One agent writes each phase; the other reviews it. No parallel competing builds or independent redesigns of the same phase.

## 14. Remaining blocker

Domain availability and registration remain manual:

- `varada.in`
- `varadanair.in`

Sujith checks and registers the chosen domain. Domain registration does not block local Phase 1 work, but the production hostname must be confirmed before final cookie and redirect settings are locked.

## 15. Next action

Claude supplies the exact Phase 1 file/dependency/environment/test declaration required above. ChatGPT reviews it. Claude then builds Phase 1.

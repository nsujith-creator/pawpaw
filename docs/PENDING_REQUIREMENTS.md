# Pawpaw — Living Pending Requirements

**Purpose:** This is the canonical living list of Pawpaw features, corrections, and approved follow-up work that are not yet released.

**Standing rule:** Whenever a new Pawpaw feature or correction is discussed and explicitly approved, append it here with a status, scope, dependencies, and acceptance criteria. Do not silently remove an item. Mark it `Released` only after implementation, verification, production deployment, and smoke testing.

**Status legend**
- `Approved — Pending`: approved requirement; not yet implemented.
- `Planned — Blocked`: approved direction, but dependent on another milestone.
- `Proposed — Needs Approval`: discussed but not yet approved for implementation.
- `Released`: live in production and verified.
- `Dropped`: explicitly rejected, with reason recorded.

_Last updated: 21 July 2026 — Pawpaw 2.0.1 released_

---

## PR-001 — Favicon and browser identity

**Status:** Released
**Suggested release:** Pawpaw 2.0.1 micro-release

Add:
- favicon;
- SVG/browser icon where supported;
- Apple touch icon;
- consistent Pawpaw browser-tab identity.

Preferred visual direction:
- cream background;
- dark lowercase `p`;
- small Pawpaw rose heart;
- avoid using a detailed character illustration at tiny favicon size.

**Acceptance criteria**
- favicon appears in Chrome and other major browsers;
- Apple touch icon works on iPhone/iPad;
- no change to existing page layouts or authentication.

---

## PR-002 — PWA icon family and web-app manifest

**Status:** Released
**Suggested release:** Pawpaw 2.0.1 foundation

Add:
- 192×192 app icon;
- 512×512 app icon;
- maskable app icon;
- web-app manifest;
- app name: `Pawpaw`;
- start URL: `/`;
- scope: `/`;
- display mode: `standalone`;
- approved cream background and Pawpaw theme colour.

**Acceptance criteria**
- Chromium recognises Pawpaw as installable when browser criteria are met;
- manifest validates;
- icons are crisp at Android and desktop installation sizes;
- canonical domain remains unchanged.

---

## PR-003 — Full PWA support for the Admin milestone

**Status:** Planned — Blocked
**Dependency:** Admin panel

Add when Admin is implemented:
- safe service worker;
- neutral offline page;
- in-app `Install Pawpaw` control where supported;
- new-version/update notification;
- online/offline status;
- mobile camera and file-picker upload;
- iPhone and Android installation guidance;
- standalone app launch from the home screen.

**Privacy and security constraints**
The service worker must not persistently cache:
- authenticated HTML;
- private family photographs;
- signed Supabase media URLs;
- Admin requests or responses;
- passphrases, cookies, tokens, or secrets.

Only harmless app-shell resources may be cached:
- icons;
- fonts;
- CSS;
- static illustrations;
- neutral offline screen.

Admin save, publish, and upload actions must require a live network connection and show a truthful offline message.

---

## PR-004 — Mobile-first Admin panel

**Status:** Partially released — PR-004 remains overall incomplete
**Released slice:** PR-004A Author's Studio foundation, released and production verified on 22 July 2026

Admin must allow Sujith to manage Pawpaw from mobile without code or deployment work.

Required capabilities:
- edit Home title and prose;
- edit captions and alt text;
- edit chapter titles and copy;
- add, reorder, replace, detach, and publish photographs;
- create and manage family chapters;
- preview before publishing;
- preserve private signed-media delivery;
- retain existing authentication, ownership isolation, RLS, and Storage boundaries;
- work comfortably as an installed PWA.

**Acceptance criteria**
- routine content changes require no source-code edit or Vercel deployment;
- actions are understandable to a non-technical product owner;
- destructive actions require confirmation;
- drafts and published content are clearly distinguished;
- mobile camera upload is supported.

### PR-004A — Author's Studio foundation

**Status:** Released

The existing Admin login, shell/navigation, Dashboard, Content Library, Media Library, and Home editor now use the approved neutral blue-grey, mobile-first author's-studio presentation. Existing queries, filters, actions, upload validation, private signed-media delivery, owner scope, publication flow, authentication, and security behaviour remain the contract. This slice adds no new content-management capability and does not complete PR-004.

### PR-004B — Remaining Admin capability work

**Status:** Approved — Pending

Still required:
- generic chapter creation and management;
- chapter title and copy editing;
- preview before publishing;
- explicit photograph replacement;
- installed-PWA operation, dependent on PR-003.

---

## PR-005 — Home “About Varada” dateline and copy correction

**Status:** Released
**Current implementation note:** The paragraph is database-backed in `content_items.body_blocks`; it is not hardcoded.

Problem:
- the sentence `7 weeks and 2 days to the day today` has no visible date reference and sounds permanently current.

Approved direction:
- add a visible dateline such as:
  - `Written 19 July 2026 · V was 7 weeks and 2 days old`
- remove the redundant age sentence from the paragraph;
- preserve the rest of Sujith’s voice unless he approves further editing.

**Acceptance criteria**
- historical age statement is anchored to an exact date;
- copy can later be edited through Admin without deployment;
- no unintended rewriting of the approved family voice.

---

## PR-006 — Visible timestamps/datelines for time-sensitive family writing

**Status:** Released

Provide an optional, human-readable date treatment for:
- Home introductions;
- chapters;
- letters;
- moments;
- future time-sensitive posts.

Rules:
- date should give context, not resemble technical metadata;
- use the stored publication or authored date where appropriate;
- do not imply continually current age or status.

---

## PR-007 — Context-aware character system

**Status:** Approved — Pending

Current state:
- Home always shows Wonder;
- First Days always shows Sleepy;
- Delight exists but is not currently displayed;
- there is no character registry, slide mapping, or contextual selection logic.

Build a central, deterministic character registry that can select an approved character by:
- page or chapter;
- photograph/slide;
- event type;
- mood;
- explicitly stored content metadata.

Rules:
- never randomise characters;
- never place illustrations over documentary photographs or faces;
- never imply an illustrated character is documentary evidence;
- change characters without distracting animation;
- preserve the current 10/10 page compositions.

---

## PR-008 — Use the complete approved core character set

**Status:** Approved — Pending

Introduce the three existing approved assets deliberately:
- Wonder;
- Sleepy;
- Delight.

Current gap:
- Delight is present in the repository but unused.

Suggested mapping:
- curiosity/awake/discovery → Wonder;
- sleep/quiet/first-days → Sleepy;
- celebration/cake/joy → Delight.

**Acceptance criteria**
- each appearance is contextually meaningful;
- no page uses one character permanently when a more fitting approved character exists;
- character changes do not cause layout shift or overlap.

---

## PR-009 — Expand the themed Varada character library

**Status:** Approved direction — Pending visual design and approval

Create additional characters in the same approved visual system, beginning with:
- bath-time Varada for bath/towel photographs;
- festive/Noolukettu Varada for ceremonial photographs.

Possible future additions should be proposed individually and approved before production use.

**Constraints**
- coherent face, proportions, linework, palette, and painterly/vector-friendly treatment;
- controlled accessories;
- restrained Indian cues where contextually appropriate;
- no photorealism;
- no generic clip art;
- no character may replace a real photograph.

---

## PR-010 — Character placement provisions across future pages

**Status:** Approved — Pending

Add reusable provisions for:
- one signature chapter-header character;
- occasional contextual character beside copy;
- slide-aware character changes where appropriate;
- mobile-safe placement;
- decorative semantics with empty alt text.

Do not:
- animate characters merely for novelty;
- crowd every page with illustrations;
- use uncontrolled stickers or collage;
- allow illustrations to obscure prose, controls, or photographs.

---

## PR-011 — Private video memories: mobile upload, processing, and playback

**Status:** Approved — Pending
**Priority:** Must-have
**Dependency:** Mobile-first Admin panel and an explicit video-infrastructure/cost approval before implementation

Pawpaw must support private family videos as first-class memories, not as public links or generic file attachments.

### Recommended architecture

Use a dedicated managed video service for video bytes and playback, while Supabase continues to hold Pawpaw ownership, chapter associations, captions, dates, status, and provider identifiers.

Preferred provider for implementation evaluation:
- Cloudflare Stream;
- direct one-time creator upload from the Admin browser;
- resumable upload for unstable mobile networks;
- automatic format normalisation and adaptive streaming;
- signed private playback after Pawpaw viewer authentication.

Do not route video file bytes through Vercel Functions.

### Zero-new-service fallback

A constrained Supabase-only first version is technically possible, but must be clearly limited to:
- H.264/AAC MP4;
- maximum 50 MB per file while the shared Supabase project remains on Free;
- direct resumable upload to Supabase Storage;
- no automatic transcoding;
- short clips only;
- strict storage and egress monitoring.

This fallback is not the preferred long-term family-video system because phone codecs, storage, upload-size limits, and bandwidth would create avoidable failures.

### Required Admin capabilities

- choose or record a video from mobile;
- show file type, size, duration, and estimated usage before upload;
- upload progress, pause/resume, retry, and cancel;
- truthful `uploading`, `processing`, `ready`, and `failed` states;
- generate/select a poster frame;
- add title, caption, date, text description, and transcript/captions where speech matters;
- attach, order, detach, archive, and delete videos with confirmation;
- preview before publishing;
- never silently publish an unprocessed or failed video.

### Viewer experience

- native, accessible video controls;
- `playsInline`;
- no autoplay;
- poster image before playback;
- adaptive playback where the provider supports it;
- preserve natural orientation;
- captions/transcript remain available if video playback fails;
- no illustration over the video;
- no download control unless separately approved;
- no public provider URL or identifier exposed unnecessarily.

### Privacy and PWA constraints

- private signed playback only after Pawpaw authentication;
- short-lived playback authorization;
- no public video asset URLs;
- no video, authenticated HTML, signed URL, token, or Admin response cached by the service worker;
- logout and browser Back must not expose a playable private video;
- provider secrets remain server-side;
- video deletion must reconcile the Pawpaw database and provider asset safely.

### Data requirements

Add or formally support:
- media kind: image or video;
- provider and provider asset ID;
- duration;
- width and height;
- processing status and error;
- poster/thumbnail reference;
- caption and text description;
- optional transcript/subtitle reference;
- creation/capture date;
- byte size and source MIME type where available.

Use the existing content/media association model where possible. Any migration must be Pawpaw-only and must not touch QtPi Tracker or Paru Health.

### Cost and operational gate

Before implementation, report:
- selected provider;
- exact current pricing;
- expected monthly cost at 10, 50, 100, and 500 stored video minutes;
- expected delivery cost for family viewing;
- retention/deletion behavior;
- export/migration path;
- simpler alternative;
- why a paid service is or is not justified.

Include a visible usage limit and warning so a mistake cannot create uncontrolled storage or delivery costs.

### Acceptance criteria

- common Android and iPhone video files can be uploaded from mobile without manual conversion;
- interrupted uploads can resume;
- processing completion is verified before publication;
- playback works in current Chrome, Safari, Android, and iPhone browsers;
- private access and logout/history protections pass;
- no private video is cached by the PWA;
- captions, dates, and chapter ordering are editable through Admin;
- degraded-video state preserves text context;
- image upload and playback behavior remain unchanged;
- production smoke test creates no orphaned provider asset or database row.
---

## Release grouping recommendation

### Pawpaw 2.0.1 — Micro-release
- PR-001 Favicon and browser identity
- PR-002 Manifest and PWA icon foundation
- PR-005 Home dateline and copy correction
- PR-006 Timestamp/dateline treatment

### Character-system release
- PR-007 Context-aware character registry
- PR-008 Use all three core characters
- PR-009 New bath-time and festive characters
- PR-010 Reusable placement provisions

### Batch 2 / Admin + full PWA and video
- PR-003 Full PWA support
- PR-004 Mobile-first Admin panel
- PR-011 Private video memories

---

## Change log

### 22 July 2026
PR-004A's final review correction counts unique attached media assets missing alt text, labels drafts factually as unpublished, and renders `Nothing needs attention.` only when both attention counts are zero. The existing Dashboard query, ownership boundary, actions, authentication, and media workflows remain unchanged. Targeted and full verification passed with reversible fixture residue zero.

PR-004A was released through implementation commit `cb5faa79600df8d787aa6c40bf2b935ded111525` and exact-SHA production deployment `dpl_AdUC9GWRLJfdVSeBq7uv6GEXKDrQ`, which reached READY at `https://www.heyvarada.in`. Read-only production smoke passed the public/Admin boundaries, authenticated desktop/mobile Admin routes, live Dashboard reconciliation, signed-media delivery, six-photo Home editor, responsive/focus/accessibility checks, Sign out/Back protection, and browser/runtime error gates without production data mutation. Screenshot review was technical/visual evidence review, not a fourth formal manual-test round; formal rounds remain 3 of 3. PR-004 remains overall incomplete, and PR-004B remains Approved — Pending with generic chapter creation/management, chapter title/copy editing, preview before publishing, explicit photograph replacement, and installed-PWA operation dependent on PR-003. PR-003 and PR-007 through PR-011 are unchanged.

### 21 July 2026
Pawpaw 2.0.1 implementation was authorised and released. PR-001, PR-002, PR-005, and PR-006 passed automated verification, exact-commit production deployment, the one-row preconditioned Home-copy correction, and production smoke verification. No fourth formal manual-test round occurred.

PR-004A Author's Studio foundation was separately authorised and implemented locally against exact baseline `0a183101f436f1a9a9773770ad92cd2e48b84a0c`. It remains unreleased; PR-004 remains open and PR-004B remains pending.

### 20 July 2026
Initial living list created from all missing features discussed after Release 2 Batch 1 went live:
- favicon;
- manifest and PWA foundation;
- full Admin-era PWA;
- mobile-first Admin;
- About Varada dateline/copy correction;
- visible timestamps;
- context-aware character selection;
- full use of core characters;
- bath-time and festive character additions;
- reusable character-placement provisions.
- private mobile video upload, processing, signed playback, and video-specific privacy/cost controls.

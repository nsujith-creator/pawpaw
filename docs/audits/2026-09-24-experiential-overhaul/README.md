# Experiential audit, 24 Sep 2026: index and resume checkpoint

**Start here:** [00-owner-report.md](00-owner-report.md)

| File | Contents |
|---|---|
| [00-owner-report.md](00-owner-report.md) | Verdict, summary of everything, decisions needed |
| [A1-reconciliation.md](A1-reconciliation.md) | Revision/deployment identity, instruction conflicts, stale claims |
| [A2-coverage-register.md](A2-coverage-register.md) | What was inspected, with denominators and statuses |
| [A3-journeys.md](A3-journeys.md) | Expected vs observed journeys; field logic; keep/cut functions |
| [A4-findings.md](A4-findings.md) | F-01…F-26 and D-01…D-06 with evidence, fix and retest |
| [A5-copy-review.md](A5-copy-review.md) | Every interface string with a rewrite |
| [A6-assets.md](A6-assets.md) | Photos, illustrations, icons, proof pack; replacement brief |
| [A7-directions.md](A7-directions.md) | Three directions and the recommendation |
| [A8-plan-acceptance.md](A8-plan-acceptance.md) | Stages, acceptance matrix, document changes, gates, costs |
| [A9-limitations-decisions.md](A9-limitations-decisions.md) | Unverified scope and owner decisions |
| [A10-review-response.md](A10-review-response.md) | External review of 24 Sep: re-tests, corrections, and points not accepted |

**Private (git-ignored) at `test-results/private-audit-2026-09-24/`:**
- `A5b-family-writing-review.md`: letter, note and caption review, with the full proposed letter.
- `proposals.html`: self-contained board of current vs A/B/C renders.
- `family/`, `admin/`: production screenshots at 360/390/768/1440, zoom, landscape and idle.
- `media/`: the 20 published photos as delivered, plus `manifest*.json`.
- `proto/`: direction HTML sources and `render/`.
- `data/`: crawl facts, text dumps, page weight, state tests, copy extraction.

**Handover archives** (all in `test-results/private-audit-2026-09-24/`, each private):
- `pawpaw-audit-2026-09-24.zip`: reports, A5b, `proposals.html`, renders, `data/`, `scripts/`.
- `pawpaw-evidence-family-1.zip`, `-family-2.zip`, `-family-3.zip`: every family screenshot cited in the findings, including the 24 Sep re-captures (118 files).
- `pawpaw-evidence-admin-1.zip`, `-admin-2.zip`: every admin screenshot (184 files).
- `pawpaw-evidence-media-1.zip`, `-media-2.zip`: the 20 published photos with manifests.
- `pawpaw-evidence-proto-1.zip`: the six editable prototype HTML files, the images they use, and all renders.
- Each part opens on its own (split only to fit the 30 MB transfer limit). Unzip them all into one folder to rebuild the layout the scripts expect.

**Privacy note.**
- This folder quotes some family writing and names, and is untracked. Commit it only if you're happy for it to live in the GitHub repository (private repo `nsujith-creator/pawpaw`).
- The `test-results/` folder contains photographs and must never be committed. It is git-ignored.
- The cloud container that produced this is temporary. Keep the copies that were sent to you.

## Resume checkpoint
- **Done:** document and code read; production family and admin crawl at 4 widths plus states; idle-expiry, history, Leave, zoom and landscape tests; page-weight measurement; copy extraction and review; asset review; three direction prototypes rendered; report and appendices.
- **Not done / to resume:**
  1. Video playback on a real phone (the player, layout and link-expiry checks were done on 24 Sep; this Chromium can't decode H.264).
  2. Write, conflict and failure journeys: need the Stage 0 isolated environment.
  3. WebKit/Firefox and real-phone checks.
  4. Reconcile any earlier audit from your PC's `docs/audits/`.
- **Scripts used** (in `test-results/private-audit-2026-09-24/scripts/`): `family-crawl.js`, `admin-crawl.js`, `family-states.js`, `weight.js`, `media-grab.js`, `render.js`, `shot.js`, `video-check.js`, `video-token-check.js`, `recheck.js`, `editor-height.js`, `carousel-recheck.js`, and `login.js` (shared family sign-in). They are read-only against production except the normal sign-in forms. Each signs in fresh and writes relative to its own folder, so the folder can be moved. Run from inside `scripts/` with `NODE_PATH=$(npm root -g) node <script>` where Playwright and Chromium are available and the three `PAWPAW_*` login variables are set. `media-grab.js` and `render.js` expect the `media/` and `proto/` folders from the archives beside `scripts/`.

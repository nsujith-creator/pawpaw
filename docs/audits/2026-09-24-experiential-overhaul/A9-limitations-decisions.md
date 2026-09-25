# A9 — Remaining limitations and owner decisions

[← Owner report](00-owner-report.md)

## What this audit could not cover, and what would unblock it
| Gap | Why | Smallest unblock |
|---|---|---|
| Every write journey (save, publish, unpublish, upload, replace, reorder, delete, video upload), failures, retries, two-admin conflict | Production writes are forbidden and no isolated environment exists | Stage 0: either (a) fully local, Supabase and the app both on your PC (Docker; **may need technical help once**), or (b) a separate hosted Supabase project used only by previews (cost **UNVERIFIED**). A preview can't reach a database on your PC. Synthetic fixtures either way |
| Video playback | Hosts now allowed; the player, layout and 5-minute link expiry were checked. This test browser reports no H.264 decoding, so actual playback remains unverified | On your phone: (1) open *The Day You Arrived* and press play straight away; (2) in a **fresh tab**, open it, wait 6 minutes **without pressing play**, then press play. Continuing a video that is already playing is a third case, not tested. Or allow `dl.google.com` so a codec-capable Chrome can be installed here |
| Firefox, Safari/WebKit, real phones, installed PWA, keyboard-over-input, HEIC upload | Only Chromium exists here; there are no devices | Your 10-minute phone check at the Stage 2 slice. Optionally install the WebKit/Firefox engines in a future session |
| Second admin (Paru) | Only one admin login provided | Not needed until Stage 3 conflict testing (use two tabs) |
| The earlier audit in `docs/audits/` on your PC | Not in the repository | Push it, or paste its path in a future session, if you want its findings reconciled |
| Session expiry at 30 days, forged cookies, throttle | Would need waiting or writing throttle rows in production | Isolated environment |
| Real-network performance | Bytes measured; times are from a data-centre link | Your phone on mobile data after Stage 1 |

## Decisions only you can make
1. **Direction:** A (Kasavu notebook), **B (Picture-book spreads, recommended)**, C (Height chart), or B + C's age line. See `test-results/private-audit-2026-09-24/proposals.html`.
2. **Characters:** keep **one** consistent set (redrawn by an illustrator or a controlled generation process you approve; her real age or a clearly imaginary older Varada), or retire both. Either is legitimate (D-02). This also decides PR-007–PR-010.
3. **Site name:** keep "pawpaw" as the place's name, using "Varada" when the text means her (recommended), or rename.
4. **The letter:** approve, edit or reject the proposed changes (A5b §2–3). Finish "Finding Your Name" if you want to. Decide on Paru's medical details, and **Paru's consent** for `story-1`.
5. **Home note:** approve the four typo fixes, and moving "the 1st pic…" into the caption (A5b §4).
6. **Captions:** approve or edit the rewritten Home and First Days captions and the letter's baby-voice captions (A5b §5).
7. **Photos:** send camera originals for home-1 (Noolukettu) and home-5 (ducks). There are no exact duplicates (corrected 24 Sep): firstdays-2/3, firstdays-4/story-3 and firstdays-8/story-4 are different frames, and all can stay. Choose from the A6 addition brief.
8. **Test debris:** confirm deletion of the two "Temporary…" drafts and the unused test photos, including the "Sujith Outlook Signature" image.
9. **Medical rule:** replace "no health information" with "no health *tracking*" (recommended), or remove the medical passages instead.
10. **Cloudflare Stream:** confirm the plan you are on and its monthly cost, so it can be recorded against the INR 10,000 ceiling.
11. **Isolated environment:** fully local (Docker on your PC; may need a technical helper once) or a separate hosted Supabase project (cost **UNVERIFIED**). A Vercel preview can't use a database on your PC.
12. **Photos kept on a device:** not at all (`no-store`), or for a few hours and wiped when someone presses Leave (A8 Stage 1). This changes what a shared phone can show after Leave.
13. **First Days:** list it with the stories (needed either way), then keep it separate or merge it (your call).
14. **Original photos:** confirm originals must be kept byte-for-byte (recommended), which means raising the 8 MB cap rather than shrinking photos on the phone.

**Confirmed by you, 24 Sep:** the live site says "ammama" in the Home note and in the letter; both should read **acchamma**. It can be fixed by you in the admin, or with the family copy in Stage 4. Other family facts you confirmed are in A5b (private).

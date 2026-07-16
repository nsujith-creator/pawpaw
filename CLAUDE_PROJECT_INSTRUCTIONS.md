# Claude Project Instructions — Varada

These are persistent operating instructions for the Varada project.

## Authority and precedence

1. `PROJECT_BRIEF.md` is the canonical product, privacy, architecture, design, scope, and acceptance source.
2. Sujith's explicit later decision overrides the brief only when he clearly says it is a changed or locked decision.
3. Earlier Varada briefs, static-site plans, and the existing qtpi tracker are non-authoritative.
4. Flag technical errors, contradictions, security failures, unaffordable dependencies, or impossible requirements. Do not reopen settled product or taste decisions merely because you prefer another approach.

## Handling apparent conflicts with the brief

When a new request appears to conflict with something in `PROJECT_BRIEF.md`:

- Treat `PROJECT_BRIEF.md` as the current source of truth, not an immutable restriction.
- State the old decision and the new request plainly — one sentence each.
- Ask whether this is exploration or a confirmed change before acting.
- Do not update the brief for hypotheticals or exploratory discussion.
- If Sujith confirms a change, update the relevant canonical files before writing any implementation code.
- Do not expand words like *private*, *public*, *internal*, or *later* into broader permanent prohibitions than the brief actually states.
- Distinguish sharing a link from making protected content publicly accessible; they are not the same thing.

## Product boundary

- Build a dynamic private family archive for Varada.
- It must be writable from Sujith's and Paru's phones through an admin backend.
- ADMIN and VIEWER are separate access tiers.
- The family archive never contains medical or health tracking.
- Never merge, import, share tables, share buckets, copy credentials, or reuse authentication from qtpi.
- The future document/financial vault is a separate application and security domain. Do not pre-build it.

## Creative boundary

- The intended personality is youthful, joyful, intelligent, imaginative, baby-girlish, modern, elegant, and premium.
- Cartoons, original characters, imaginative cosplay, superheroes, stars, clouds, fantasy, humour, playful typography, and polished motion are first-class design ingredients.
- Do not reinterpret “premium” as beige minimalism, sombre editorial restraint, luxury-catalogue sterility, or an adult anthology.
- Real photographs remain central. Illustration expands their imaginative world.
- Avoid generic nursery clip art, random emoji systems, stock cartoon babies, uncontrolled colour, inconsistent AI styles, and childish copy that talks down to Varada.
- AI-created artwork must be clearly imaginative and must never be represented as a factual memory or real event.
- Evaluate design using actual screens and real photographs. More planning documents do not substitute for visual refinement.

## Technical baseline

Accepted baseline:

- Next.js App Router on Vercel;
- Supabase Auth, Postgres, and a private Storage bucket;
- admin email/password accounts allowlisted for Sujith and Paru;
- shared family passphrase verified server-side;
- cryptographically signed `httpOnly` viewer cookie with expiry and revocable version;
- private media delivered only after session validation;
- published database content delivered to viewers through server-side code;
- separate repository, Vercel project, and Supabase project from qtpi.

Do not replace this architecture without a concrete technical blocker and a smaller, safer, affordable alternative.

## Resource gate

- Default operating budget for Release 1 is the free tiers of Vercel and Supabase.
- Before adding any dependency or service, state its exact name, purpose, install command, recurring cost, and why built-in capabilities are insufficient.
- No paid dependency, image service, CMS, monitoring tool, analytics tool, or managed security product without Sujith's approval.
- Verify current framework and platform behaviour from primary documentation. Do not rely on remembered API names or outdated tutorials.
- Use only Playwright and Context7 MCPs when available. Do not introduce other MCPs or agents without approval.

## Build discipline

- Use the simplest working implementation that satisfies the brief.
- Do not add unrequested features, speculative abstractions, empty future pages, dormant vault code, or infrastructure “for later.”
- One agent writes a phase; the other reviews it. Do not create a competing parallel implementation.
- Before each phase, state the exact files, migrations, policies, dependencies, environment variables, and acceptance tests. Do not write code until that declaration is reviewed.
- Keep canonical project documents in the repository root and update them only when Sujith changes a decision.
- Never claim completion from compilation or deployment alone.

## Verification standard

Treat generated code as unverified until checked.

For every completed phase:

- run type checks, linting, automated tests, and production build;
- manually test the complete user flow in a real browser;
- verify mobile behaviour at 375 px width and a normal desktop width;
- test unauthenticated, VIEWER, ADMIN, draft, published, expired-cookie, forged-cookie, and failed-upload cases relevant to the phase;
- inspect browser console and network failures;
- verify private photos cannot be fetched anonymously;
- report exactly what passed, what failed, and what remains manually unverified.

A successful HTTP response, compile, screenshot, or AI assertion is not proof that the full flow works.

## Communication

- Be direct and bounded.
- Put blockers first.
- Distinguish verified facts, assumptions, recommendations, and unresolved decisions.
- Ask only for the smallest missing input that truly prevents progress.
- Do not dump full logs or unrelated files. Quote only relevant errors and lines.
- When usage or model runs begin to repeat without new evidence: **Validate manually before another model run.**

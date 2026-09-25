# Where the site's words live

Most things you'll want to change are in the desk at heyvarada.in/admin:

| What | Where in the desk |
|---|---|
| Stories and letters: title, words, photos, date, colour, delete | Stories → open the story |
| The note on Home and the Home photos | Home |
| Her names and her people | Names |
| Photos (captions, delete) | Photos |

Everything else is fixed text in the code. To change one of those, use the table below.

## How to change fixed text (about two minutes)

1. Open **github.com/nsujith-creator/pawpaw** and go to the file listed below.
2. Press the pencil icon (Edit this file).
3. Press Ctrl+F (Cmd+F on a Mac) and search for the words you want to change.
4. Change only the words. Leave everything around them as it is: quotes `"…"`, `'…'`, tags like `<p>` and `{ }` brackets.
   - Inside quotes, write apostrophes as ’ (curly) rather than '. A straight ' can end the quote early.
   - In text between tags, `&apos;` means an apostrophe. You can type ’ instead.
5. Press **Commit changes** and commit straight to `main`. The site updates itself in about a minute.
6. If the site doesn't update after a few minutes, the edit broke something. Send me the file name and I'll fix it. The previous version stays live until the fix goes in.

## Fixed text, file by file

| Words | File |
|---|---|
| Home: "Varada's family pages", വരദ, "Varada", "Her stories", "A note from acchan", "Her names", "Her people", the "…4 things…" line, the footer "pawpaw · kept for Varada, by acchan and amma" | `src/app/(archive)/page.tsx` |
| "Nothing written yet…" (empty chart) | `src/components/family/story-chart.tsx` |
| Story pages: "Next on her chart", "← Home", "All her stories", "A few photos didn't load…" | `src/components/family/story-page.tsx` |
| "Hung on her height chart…" (top of Her stories) | `src/app/(archive)/chapters/page.tsx` |
| Top menu: Home, Stories, Leave | `src/components/family/family-header.tsx` and `src/components/family/leave-button.tsx` |
| Sign-in page: "Family passphrase", "Come in", "For family. If you don't have the passphrase…" | `src/app/family-login/page.tsx` |
| Sign-in errors: "That's not it. Try again." and others | `src/app/family-login/actions.ts` |
| "Nothing here." (wrong address) | `src/app/not-found.tsx` |
| "This page didn't load." | `src/app/(archive)/error.tsx` |
| "First Days isn't up yet." / "didn't load" | `src/app/(archive)/first-days/page.tsx` |
| Video: "Play", "The video wouldn't start…" | `src/components/family/family-video.tsx` |
| No-internet page | `public/offline.html` |
| Browser tab title and description | `src/app/layout.tsx` |
| Ages ("day 0", "2 days", "6 weeks"…) | `src/lib/family/age.ts` (ask me; that's logic, not just words) |

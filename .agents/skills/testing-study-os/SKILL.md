---
name: testing-study-os
description: How to run and end-to-end test the Study OS Vite/React app locally, including signed-out "local mode", syllabus/progress ground truth, and the analytics activity log.
---

# Testing Study OS locally

## Devin Secrets Needed
None. The app works fully signed out; Firebase/Drive `VITE_*` vars in `.env.local` are only needed for cloud sync tests.

## Run it
- `npm install` (blueprint maintenance already does this) then `npm run dev` → http://localhost:5173.
- Check whether a dev server is already running (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`) before starting another.

## Get into signed-out "local mode" (do NOT attempt Google sign-in)
- First load shows the AuthScreen. Click the small text link **"Continue without signing in"** (below the purple "Continue with Google" button) — it sets `localStorage['study-os-local-mode']='true'`.
- Careful: after maximizing the window the AuthScreen re-centers. Take a fresh screenshot before clicking, or you may hit "Continue with Google" and open a real Google consent page. If that happens, `ctrl+w` the popup and reload the app page (the button stays stuck on "Opening Google…" until reload).
- All persistence keys are `study-os-*` in localStorage (`study-os-activity`, `study-os-progress-*`, `study-os-local-mode`). Clearing all but `study-os-local-mode` gives a fresh profile without re-doing the auth step.

## Syllabus ground truth (leaf-topic counts) — useful for exact assertions
- `RAS Pre 2026`: 193 leaves (11 subjects: 31/16/14/13/26/22/17/6/22/20/6)
- `RPSC Senior Teacher (2nd Grade) Paper-II Science`: 379 leaves (Biology 144, Chemistry 125, Physics 83, Teaching Methods 27)
- `RPSC Senior Teacher (2nd Grade) Paper-I` (GK): 87 leaves
Recompute quickly with a small python script over `src/data/syllabus/*.json` counting topics with no `children`.

## Workspace explorer interactions
- The circular completion checkbox sits ~15px right of the expand chevron on each row; clicking a few px off selects the topic instead of toggling it. Verify by the row's `aria-label` flipping between "Mark … complete" / "Mark … incomplete" and its `X / Y` badge.
- Checking a parent cascades to every descendant leaf; the explorer progress row ("X / Y Topics Completed") is the authoritative cross-check for analytics numbers.
- Exams 1 and 2 are the segmented toggle; the third exam (GK) is only reachable from the "…" overflow menu in the explorer header — but the /analytics page exposes all three in its own segmented toggle.

## Analytics (`/analytics`)
- Reach it via the sidebar bar-chart icon or the "View Analytics" chip in the explorer progress row; "Back to workspace" returns.
- Activity is a per-local-date, per-exam, per-subject count of leaf completions/un-completions, stored in `localStorage['study-os-activity']` as `[{date, exams:{[examId]:{[subjectId]:{completed,uncompleted}}}}]`.
- Past days cannot be produced through the UI. To test streaks / the 30-day chart / cumulative reconstruction, inject extra records for previous dates into `study-os-activity` and reload. Streaks count only days with `completed > 0`.
- Cumulative line is reconstructed backwards from the true current completed count, so its right-hand endpoint must equal the "Completed" stat card.

## Known rough edges to re-check (as of PR #2)
- `ActivityChart` uses 30 flex children each holding two `w-2` bars, so its min-content width exceeds the card: the last (today) bars can render outside the card, and on narrow viewports the whole chart escapes the card and creates horizontal page scroll. Verify with `document.documentElement.scrollWidth` vs `clientWidth` and by comparing bar/card `getBoundingClientRect()`.
- "Recent activity" is derived from all activity dates rather than the selected exam's, so an exam with no history can show a "+0 completed" row.

# Keeping the /explore demo current

The public interactive demo is a **guided story**, not a tenant. It never reads app data, never
calls the real assessment, check-in, or coaching systems, and never asks a visitor to log in.
That is deliberate: a public demo tenant would be a security and data-hygiene problem, and a
live-model demo would burn credits on every anonymous visitor.

## Where everything lives

| Piece | File |
|---|---|
| All demo copy and data | `src/lib/exploreDemoContent.js` |
| Page + step orchestration | `src/pages/Explore.jsx` |
| App-mirroring chrome (demo bar, sidebar, progress) | `src/components/explore/DemoShell.jsx` |
| Step 1 — Leadership Index sample + profile | `src/components/explore/StepLeadership.jsx`, `ProfileSummary.jsx` |
| Step 2 — Atreus (scripted) | `src/components/explore/StepAtreus.jsx` |
| Step 3 — Daily check-in | `src/components/explore/StepCheckIn.jsx` |
| Step 4 — Onboarding + org aggregates | `src/components/explore/StepOrg.jsx` |

If a change touches only wording, numbers, or which situations Atreus answers, **it is a
one-file edit** to `exploreDemoContent.js`. Screens rarely need to change.

## The update loop

1. Ship the product change as normal.
2. Run the **explore_demo_updater** agent (dashboard → Agents). Paste the current
   `exploreDemoContent.js` and describe what changed. It returns a full updated file plus a list
   of what it changed and what you should eyeball in the browser.
3. Apply the file, bump `DEMO_VERSION` if the agent didn't.
4. Open `/explore` and click through all four steps on mobile width and desktop width.

## What must never change

- **No live AI in the demo.** Atreus is scripted on purpose — it cannot misfire, costs nothing
  per visitor, and stays on-message.
- **No real data access.** No entity reads, no auth checks, no function calls.
- **The honesty markers stay.** The `Sample` badges, the "Scripted for this demo" label, the
  "illustrative" note under the hero card, and the privacy statement on the org view.
- **No invented statistics.** If a number can't be sourced, describe the mechanism instead.

## Known limitation

The platform's agents can read entities and call backend functions; they cannot edit app source
files. So "automatically applied" is not possible end to end — the agent drafts the updated
content module and a human applies it. Steps 1–4 above are the shortest honest version of that
loop.

## Open follow-up

The demo currently offers "Save my profile" (downloads a text file) rather than an email capture.
A real lead capture needs a small backend function writing to the `Prospect` entity plus a
notification to the owner — worth building once the demo has traffic.

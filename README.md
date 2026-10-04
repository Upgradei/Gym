# Training Card

A lightweight, mobile workout tracker hosted on GitHub Pages. No build step or runtime package dependencies.

## Use

Choose an exercise variation, equipment label, weight convention and increment before starting a workout. Log each set's actual load/result, then check it off. Optional RIR means reps in reserve. Completed exercises collapse. A rest timer starts after each completed set. Start, resume after a reload, finish early, or discard an in-progress workout. Correct finished workouts from Progress → Edit.

Progress shows actual completed loads and reps, weekly sets by primary exercise group, calendar-week consistency, and goal-aware body-weight averages. Power, timed, distance, AMRAP and drop-set work use manual progression. Normal sessions earn a suggested increase only when every planned set meets the target at the same load. Suggestions never rewrite completed sets. Deload work is recorded but does not replace normal-session targets.

Settings controls the weight goal, available time, personal reminders and JSON export/import. There is no automatic cloud synchronization; move a backup between devices manually. Import replaces the destination's records, with a download and a local pre-import copy for recovery. Keep periodic exports outside the browser.

## Data migration and limitations

- Version 2 writes `gym-card-state-v2`; the original `gym-card-state` is never modified.
- The full old object remains under `legacy` and in every exported backup. Measurements migrate to local calendar dates. Old loads seed initial targets only for the default variation/equipment.
- Old checkmarks are archived, not treated as a current session. Old history is marked unverified because the original app may have stored a future load instead of the actual load. Missing per-set results cannot be reconstructed.
- Storage is scoped to browser and origin. Open the same original site/browser to migrate its data. GitHub contains code, not workout records.
- Corrupt saves and read failures pause saving. Quota failures show a persistent warning. A second-tab update pauses writes to avoid silent overwrites.
- Legacy entries retain their recorded date labels; their original UTC date-boundary ambiguity cannot be resolved automatically.
- Weekly muscle-group sets are primary-group counts, not estimates of every muscle stimulated. The weight chart compares loads and reps rather than summing unrelated lifts as “total strength.”

## Development

Use Node 22+ for tests, and Python 3 to serve:

```sh
npm test
npm run serve
```

Open http://localhost:8080 (ES modules require HTTP rather than opening a file directly).

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
node tests/browser.mjs
```

CI runs regression tests and an isolated phone-size browser flow. Browser tests use synthetic data only.

- `workouts.js`: stable exercise definitions and variations
- `core.js`: session, migration, progression and calendar calculations
- `storage.js`: persistence, validation and backup handling
- `app.js`: views, interaction, timers and screen wake lock
- `charts.js`, `styles.css`: display and styling

The workout plan is editable source data. Personal reminders are user-editable; the app does not diagnose symptoms or automatically prescribe exercise substitutions.

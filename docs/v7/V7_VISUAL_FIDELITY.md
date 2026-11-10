# Rehab V7 Visual Fidelity Report

## Status

**PASS — repaired references 5 / 5 usable; five main pages and shared secondary UI completed the visual-recovery gates on August 29, 2026.**

Browser plugin/IAB was not available in this agent environment, so the documented system Edge + Playwright fallback was used. The primary visual viewport was 390 x 844.

## Reference recovery

The original recovery baseline correctly stopped when four SVG payloads were unreadable. That blocker was later cleared by repaired repository reference assets. The repaired five SVGs were each opened through localhost in system Edge, rasterized at 390 x 844 and inspected with `view_image`; HTTP/SVG presence alone was not accepted as proof.

| Reference | Retained raster evidence | Final gate |
|---|---|---|
| Today | `.tmp/v7-r1/reference-today.png` | PASS |
| Workout | `.tmp/v7-r1/reference-workout.png` | PASS |
| Records | `.tmp/v7-r1/reference-records.png` | PASS |
| Coach | `.tmp/v7-r1/reference-coach.png` | PASS |
| Profile | `.tmp/v7-r1/reference-profile.png` | PASS |

The reference examples define hierarchy, geometry and visual density. Their illustrative health values are not product data and were not copied into runtime fixtures.

## Page-by-page visual gate

Each main page followed the required sequence: repaired reference -> real 390 x 844 browser render -> screenshot -> `view_image` -> mismatch ledger -> fix -> repeat. A page was not passed merely because it opened or had no console errors.

| Page | Representative final evidence | Result |
|---|---|---|
| Today | `.tmp/v7-today/today-empty-390x844.png`, `.tmp/v7-today/today-populated-390x844.png` | PASS |
| Workout | `.tmp/v7-workout/workout-idle-390x844.png`, `.tmp/v7-workout/workout-running-390x844.png` | PASS |
| Records | `.tmp/v7-records/records-overview-390x844.png` | PASS |
| Coach | `.tmp/v7-coach/coach-390x844.png` | PASS |
| Profile | `.tmp/v7-profile/profile-390x844.png` | PASS |

The detailed 10+ item mismatch ledgers and intentional deviations are recorded in `V7_VISUAL_RECOVERY_REPORT.md`.

## Theme fidelity

The R0 fixed-green regression was reproduced before repair: Material primary changed for blue, purple, custom and dark states while V7 remained green. R2 removed that second palette and bridged V7 semantic roles to `theme.js`.

Final browser coverage includes preset green/light and custom rose (`#b63868`)/dark on all five pages. The stable dark screenshots were inspected after the view-transition completed:

- `.tmp/v7-theme-matrix/today-rose-dark-390x844.png`
- `.tmp/v7-theme-matrix/workout-rose-dark-390x844.png`
- `.tmp/v7-theme-matrix/records-rose-dark-390x844.png`
- `.tmp/v7-theme-matrix/ai-coach-rose-dark-390x844.png`
- `.tmp/v7-theme-matrix/profile-rose-dark-390x844.png`

The matrix verifies accent response, neutral Surface treatment, readable foreground/background contrast, independent semantic danger color, Liquid nav response, primary CTA response where present, <=1px horizontal overflow and zero nested V7 backdrop candidates.

## Effects fidelity

Full, Balanced and Economy retain identical layout geometry. Final evidence:

- `.tmp/v7-effects/effects-full-390x844.png`
- `.tmp/v7-effects/effects-balanced-390x844.png`
- `.tmp/v7-effects/effects-economy-390x844.png`

Full adds only short interaction/temporary-overlay richness; Balanced is the normal phone mode; Economy removes V7 filter/backdrop work. Static Full and Balanced screenshots are intentionally close because the stronger Full Liquid highlight is interaction-only and is asserted by the browser test rather than left running in an idle frame.

## Secondary UI fidelity

Theme Sheet, Voice Sheet, generic modal, AI Model Picker, Search Provider Manager, toast/update banner, attachment composer state and Workout Advanced were all inspected as real application flows. Final evidence is retained under `.tmp/v7-secondary/` plus `.tmp/v7-workout/workout-advanced-390x844.png`.

R11 fixed the visible legacy leaks found during this pass: an unresolved `ANIMATION` icon ligature, Search Manager/Bottom Nav z-order conflict, oversized update-banner actions and Workout Advanced's floating CTA overlap. Existing close/focus/back-stack/business owners were preserved.

## Intentional deviations from illustrative references

- No mocked OS status bar is rendered inside the web app.
- No fake recovery score, sleep, stress or pain value is synthesized when the product has no authoritative value; explicit `待评估` / `未记录` states are used.
- Existing real product functions that are denser than the design references remain reachable through compact primary entries or secondary surfaces instead of being deleted.
- The restored Today `3-7天` recent-plan entry and conditional multi-plan selector are intentionally compact additions required by the V6 function inventory.

## Final gate conclusion

The repaired references are readable 5 / 5, the five main pages have passed manual screenshot review in the required mobile viewport, theme fidelity has passed in light/dark and two accent families, and secondary surfaces no longer visibly fall back to the old Glass-heavy system. Functional and performance closure are documented separately; physical Android thermal/battery validation remains an external-device task rather than a visual-fidelity blocker.

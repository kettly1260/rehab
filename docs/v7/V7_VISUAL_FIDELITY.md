# Rehab V7 Visual Fidelity Report

## Status

Final browser visual QA passed on August 28, 2026 in system Edge `151.0.4129.107` at the required 390 x 844 viewport. The retained evidence is under `docs/v7/qa-390x844/`.

The flow under test was: app boot -> each primary route and required visual state -> expected V7 surface renders without runtime errors, page-level horizontal overflow, keyboard obstruction or modal/back-stack failure.

## Reference availability

The five files under `docs/v7/visuals/` were used as the intended hierarchy references. `v7-profile.svg` renders normally. The embedded JPEG payloads in `v7-today.svg`, `v7-workout.svg`, `v7-records.svg` and `v7-coach.svg` do not decode in Edge and render as broken-image placeholders. Those four files therefore cannot support a pixel-level comparison. Their page intent, the taskbook constraints and the working Profile reference were used together with the final browser evidence; this limitation is not treated as visual parity proof.

## Evidence set

| State | Browser evidence | Result |
|---|---|---|
| Today | `qa-390x844/01-today.png` | Pass |
| Workout idle | `qa-390x844/02-workout-idle.png` | Pass |
| Workout running | `qa-390x844/03-workout-running.png` | Pass |
| Records | `qa-390x844/04-records.png` | Pass |
| Coach | `qa-390x844/05-coach.png` | Pass |
| Profile | `qa-390x844/06-profile.png` | Pass |
| Dark mode | `qa-390x844/07-dark.png` | Pass |
| Balanced effects | `qa-390x844/08-balanced.png` | Pass |
| Economy effects | `qa-390x844/09-economy.png` | Pass |
| Modal/Sheet | `qa-390x844/10-modal-sheet.png` | Pass |

All ten captures reported `documentWidth = 390`, no page-level horizontal overflow and no page errors. The audit ignores offscreen children only when they belong to an explicit horizontal `overflow-x: auto|scroll` owner.

## Page comparison and intentional differences

| Page | Reference direction | Final result | Intentional difference / retained behavior |
|---|---|---|---|
| Today | Calm daily hierarchy and restrained green emphasis | Compact header, real status, quick actions and current-plan Surface hierarchy | Real V6 plan/diet/history density is retained instead of replacing it with illustrative placeholder metrics |
| Workout | Timer-first session focus with one dominant action | Idle and running states keep the timer dominant; Play/Pause is the only Liquid primary control | Preset scroller, speed, set/rest counters and journal-backed engine controls remain visible because they are functional V6 requirements |
| Records | Data-first summary and clear chart | Real production weight renderer, segmented subview and readable chart are used | The final page exposes the production data model rather than a static reference chart |
| Coach | Quiet conversation surface and compact composer | Production empty state, range controls, composer and quick suggestions render without fake history | No fabricated messages were inserted for the final evidence; streaming/history behavior is covered by browser tests |
| Profile | Health dossier/tool page, not a promotional hero | The render closely follows the available reference: identity summary, metrics and dense settings rows | All retained V6 settings remain reachable, so the final page is denser than the reference crop |

## Visual checklist

- Header rhythm, type scale and whitespace remain consistent across all five primary pages.
- Content hierarchy uses solid Surface cards; Glass is limited to navigation, selected controls and key interaction states.
- Bottom navigation active geometry remains stable and does not cover final interactive content.
- Primary CTA geometry is consistent; Workout reserves Liquid interaction for Play/Pause.
- Icon weight, borders and shadows are restrained; green is used for status/action emphasis rather than as a full-page palette.
- Records uses the real chart renderer with readable axes/line contrast.
- Dark mode preserves legibility and surface separation.
- Balanced and economy settle to the same layout; economy removes effect cost without changing information hierarchy.
- At a 390 x 500 keyboard viewport, the Coach prompt remained focused with its bottom at 107 px, inside the viewport.
- Escape closed the sampled modal, and the sheet respected the mobile safe area and dimmed backdrop.

## Compatibility checks

| Check | Result |
|---|---|
| Page errors | 0 |
| Deep link `#/records/weight` | Records active, Weight subview active |
| Browser back | Returned to Today at `#/today` |
| Modal Escape | Closed |
| Keyboard viewport | Focused input remained visible |
| Workout running state | WORK state, timer/counters and controls rendered |

## Remaining risk

Pixel-level fidelity for Today, Workout, Records and Coach cannot be asserted until the four malformed reference SVG image payloads are repaired or replaced. Android physical-device thermal, battery and viewport behavior remains `BLOCKED_EXTERNAL_DEVICE` and is governed by `V7_ANDROID_TEST_PLAN.md`.

# Rehab V7 Migration Report

## Result

The V7 Liquid Glass migration completed through Phase 13 and the reference-driven visual-recovery closeout on August 29, 2026. V6 remains the business, persistence and service truth source; V7 owns app lifecycle, route presentation, feature surfaces and restrained effects. Inventoried V6 capabilities without a V7 entry: **0** and business functions marked `DELETE`: **0**.

Android thermal and battery acceptance remains `BLOCKED_EXTERNAL_DEVICE`. No phone power or temperature claim is made.

## Phase commits

| Phase | Commit | Scope |
|---:|---|---|
| 0 | `9734c17` | V6 inventory, architecture/performance baseline and migration mapping |
| 1 | `7b94261` | V7 app shell, router bridge and lifecycle scopes |
| 2 | `571ff27` | Data/storage/service compatibility adapters |
| 3 | `b29fe71` | Design tokens and primitives |
| 4 | `db296fa` | Central effects owner and balanced/economy modes |
| 5 | `67b0c22` | Floating bottom navigation |
| 6 | `e328863` | Today migration |
| 7 | `bd8a14c` | Workout migration |
| 8 | `979fda2` | Records migration |
| 9 | `36e6ed7` | Coach migration |
| 10 | `af38ec1` | Profile migration |
| 11 | `5273f66` | Shared secondary surfaces |
| 12 | `249e866` | PWA runtime integration |
| 13 | `4f79318` | GPU-on render, lifecycle and effects performance gates |
| Final visual recovery | current recovery worktree | Repaired-reference fidelity, dynamic theme bridge, Full/Balanced/Economy, secondary surfaces and final regression/performance QA |

`645c3b7` added the remaining-agent taskbook and is not a product phase commit.

## Final ownership

| Area | Final UI/runtime owner | Preserved functional owner |
|---|---|---|
| App boot/navigation/lifecycle | `src/app/bootstrap.js`, `router.js`, `lifecycle.js`, `context.js` | V6 startup and compatible `ui`/route bridges during transition |
| Today | `src/features/today/index.js` + `64-v7-today.css` | plan, history, diet and AI domain modules |
| Workout | `src/features/workout/index.js` + `65-v7-workout.css` | `workout-engine.js`, `workout-state.js`, cardio, voice, wake lock, MediaSession and PIP services |
| Records | `src/features/records/index.js` + `66-v7-records.css` | health, history, report and chart calculations/storage |
| Coach | `src/features/coach/index.js` + `67-v7-coach.css` | AI transport, routing, evidence, history, attachment and version services |
| Profile | `src/features/profile/index.js` + `68-v7-profile.css` | routine/library, settings, sync, backup, theme, voice and experiment services |
| Secondary UI | `src/ui/primitives/secondary-surfaces.js` + `69-v7-secondary.css` | existing close callbacks, focus trap and nav stack semantics |
| Effects | `src/ui/effects/*` and V7 effect tokens | Feature CSS consumes effects but does not own new backdrop behavior |
| PWA | `pwa-support.js`, `app-update.js`, `sw.js` integrated with the V7 shell | existing cache migration, explicit update and workout deferral semantics |

## Retained legacy domain and services

- IndexedDB/storage migration and collection owners.
- Workout engine, journal/recovery, cardio calculations, wake lock, MediaSession, PIP and voice.
- Plan, routine and action identity/progression logic.
- Health, weight, diet, exercise, history, weekly summary and report calculations.
- AI model/task routing, streaming transport, evidence/search, versioning and cold history.
- Sync, backup/import/export and remote conflict behavior.
- Theme, language, haptics and platform preference services.

These modules are retained deliberately. Rewriting them during a UI migration would change the business/data contract and increase rollback risk.

## Retired legacy UI ownership

The five top-level pages no longer rely on unscoped page-lifetime styling/visual ownership. V7 feature mounts now own visible route state, feature classes, route listeners, observers and cleanup. Records no longer keeps all four visual subviews active, Workout route hotkeys are route-owned while the session survives route changes, Coach visual scrolling/virtual-list resources are route-owned, and Profile owns its rendered home/settings/library surfaces.

Legacy renderers and globals that still provide domain-compatible markup or commands are **wrapped, not falsely marked deleted**. The migration matrix remains the source of truth for KEEP, WRAP and REWRITE_UI decisions.

## Test relationship

No legacy release test was deleted as a shortcut. V7 tests supplement and narrow ownership around retained contracts:

| Legacy contract | V7 evidence | Relationship / reason |
|---|---|---|
| `power-motion-contract.test.mjs` and Workout engine/state tests | `v7-workout.test.mjs`, `v7-workout.browser.test.mjs` | Legacy timing/power contract retained; V7 adds route ownership, visual state and session-survival proof |
| `record-swipe-power.test.mjs` and health tests | `v7-records.test.mjs`, `v7-records.browser.test.mjs` | Legacy data/chart behavior retained; V7 proves one active subview and cleanup |
| Advice/history/render/attachment tests | `v7-coach.test.mjs`, `v7-coach.browser.test.mjs` | Service/stream semantics retained; V7 adds visual-list and route cleanup proof |
| Routine/settings/sync tests | `v7-profile.test.mjs`, `v7-profile.browser.test.mjs` | Legacy functions retained; V7 proves route and nested entry ownership |
| `modal-a11y.browser.test.mjs`, deep-link and Android-back tests | `v7-secondary*.test.mjs`, `v7-pwa-runtime.test.mjs` | Existing tests remain; V7 adds shared surface decoration, keyboard, update and offline contracts |
| Existing loading/dependency/release tests | `v7-app-shell`, data-compat, navigation and performance gates | Existing closure remains; V7 ESM shell and lifecycle are added to the verified graph |

There is therefore no `old test -> new test -> deletion` replacement to record; the migration uses retained legacy contracts plus V7-equivalent coverage.

## Data compatibility

- App key remains `rehab_pro_universal_db`.
- IndexedDB remains `rehab_pro_storage`, version `4`.
- Stores remain `kv`, `history` and `ai_messages`.
- App schema remains the V6 schema (`3` at baseline).
- Workout journal, sync payloads, backup/import/export formats and collection IDs are unchanged.
- V7 adapters expose the live V6 data/services and do not create a competing state store.
- Existing migration remains additive/repeatable; no downgrade or destructive migration is required for rollback.

## PWA compatibility

The V7 ESM shell is part of the Service Worker precache graph. Manifest install, shortcut/deep-link routing, offline Today closure, explicit update apply, old-cache cleanup, active-workout update deferral and standalone root-back behavior retain their V6 semantics. Install/update presentation uses the V7 secondary surface without changing update ownership.

## Final verification evidence

- Repaired reference gate: 5 / 5 browser-decodable and manually readable at 390 x 844.
- Main-page visual gates: Today, Workout, Records, Coach and Profile each passed reference/actual `view_image` review with a mismatch ledger before the next phase began.
- Theme matrix: all five pages passed green/light and custom rose/dark browser checks with readable neutral surfaces, dynamic nav/CTA accent and zero nested V7 backdrops.
- Unit/source contracts: **1064 / 1064**.
- CSS overlap: **217 conflicts, 31 duplicates, 195 complements**, within the 220 conflict gate.
- Size budgets: all configured budgets pass without raising limits; first-paint-critical is 51.93 / 52 kB and Records bundle is 94.19 / 94.2 kB brotlied.
- Edge boot smoke: 45 scripts, 50 resources, 0 Long Tasks, 984 KB transfer, FCP 816 ms and 189.5 ms `boot:first-render`; all explicit smoke budgets passed.
- GPU-on 390 x 844 render suite: `ok:true`, no failures/page errors, zero running animations/permanent `will-change`/nested V7 backdrops; Workout-running remains the heaviest sample at 157 ms Long Task / 164 ms LoAF with frame p95 6.3 ms and stays inside the harness budget.
- Effects suite: `ok:true`, no failures/page errors; Economy preserves geometry and removes V7 filter/backdrop work.
- Twenty-round lifecycle gate: 1 / 1 pass; round 1 to round 20 has no listener/interval/observer growth and timeouts decrease 3 -> 2.
- Secondary UI browser QA covers Theme, Voice, generic Modal, AI Model Picker, Search Manager, Toast/Update, Attachments and Workout Advanced without console errors or nav/CTA overlap.

## Deferred and blocked items

- `DEFER`: Debug/diagnostics primary-page visual polish. The compatible entry remains reachable and functional.
- `BLOCKED_EXTERNAL_DEVICE`: Android physical-device battery and thermal comparison. Execute `V7_ANDROID_TEST_PLAN.md` before making a device-power conclusion.
- Historical reference limitation is resolved: the repaired repository SVGs are now 5 / 5 readable; see `V7_VISUAL_FIDELITY.md` and `V7_VISUAL_RECOVERY_REPORT.md`.

## Rollback

Use `git revert` in reverse phase order, beginning with the final QA commit and then `4f79318`, `249e866`, `5273f66`, `af38ec1`, `36e6ed7`, `979fda2`, `bd8a14c` as far back as required. Reverting the full migration returns to the V6 product baseline `ae1194b` through normal history without rewriting shared branch history.

Because V7 does not change the database name, store names, schema version, workout journal, sync or backup formats, code rollback does not require a data downgrade. Back up user data before any production rollback and verify Service Worker cache activation/update behavior after deployment.

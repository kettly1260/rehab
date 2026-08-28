# Rehab V7 Migration Matrix

This matrix records how the V6 source is treated during the staged migration. V6 remains the functional/data source of truth until an item is explicitly migrated and verified.

| V6 source / group | Decision | V7 owner target | Phase | Compatibility strategy |
|---|---|---|---:|---|
| `index.html` page shell/inline runtime | REWRITE_RUNTIME | `src/app/*` + feature roots | 1 onward | Keep V6 boot chain during transition; move one ownership concern at a time |
| `PAGE_DEPS` / `SCRIPT_PREREQUISITES` | DEFER then REWRITE_RUNTIME | native ESM imports / feature registry | 1-12 | Do not delete while legacy modules still need it; no new V7 feature dependency added to the graph |
| inline `ui` navigation | REWRITE_RUNTIME | V7 router/lifecycle/navigation | 1/5 | Legacy adapter remains callable until V7 owns all tabs |
| `app-route.js` | WRAP -> REWRITE_RUNTIME | `src/app/router.js` | 1 | Preserve current hash grammar and deep-link compatibility |
| `nav-stack.js` | WRAP | router/navigation bridge | 1/5/11 | Preserve Android/PWA back semantics while centralizing owner/disposers |
| `data.js` compatibility facade | WRAP | `src/legacy/adapters/data.js` | 2 | Read existing `window.data`; V7 code gets it through context instead of new globals |
| `data-schema.js` | KEEP | domain compatibility service | 2 | No destructive schema change |
| `data-store.js` | KEEP / WRAP | `src/services/storage` adapter | 2 | Preserve readiness, flush and local fallback semantics |
| `storage/idb.js` | KEEP | storage adapter | 2 | Preserve DB name/version/store names |
| `storage/migrate.js` | KEEP | storage adapter | 2 | Additive/repeatable migrations only |
| `storage/*-collections*` | KEEP | storage adapter | 2 | Preserve collection IDs/index behavior |
| `data-records.js`, pure data utils | KEEP | domain/services | 2+ | Reuse directly through adapter |
| `today-view-core.js` | KEEP calculations + REWRITE_UI | `src/features/today` | 6 | Replace HTML ownership, keep data computations |
| `history-view.js` | MERGE / WRAP; Records owner active | Today + `src/features/records` adapters | 6/8 | Keep cross-page calculations and rebuild one Records subview at a time |
| `plan-*` domain modules | KEEP / WRAP | domain plan adapter | 2/6/7 | Preserve task IDs, plans, feedback and progression semantics |
| `plan-ui.js` | REWRITE_UI | Today/Workout secondary UI | 6/7/11 | Keep feature operations behind adapter during migration |
| `routine-plan.js` | KEEP domain + REWRITE_UI | Workout | 7 | Preserve action IDs and current plan state |
| `routine-library.js` | KEEP domain + REWRITE_UI | Workout/Profile | 7/10 | Profile route now owns the rendered home/settings/library surfaces; library operations remain V6-compatible |
| `workout-engine.js` | KEEP | domain workout | 7 | No algorithm rewrite |
| `workout-state.js` | KEEP / WRAP | workout session owner | 7 | Keep journal schema/recovery; decouple from route DOM |
| `workout-core.js` | KEEP / WRAP; V7 UI owner active | `src/features/workout` + legacy session engine | 7 | Session commands and algorithms remain stable; V7 owns visible state/classes and rebuilds from runtime state |
| `workout-system.js` | WRAP; route hotkeys migrated | Workout feature + session owner | 7 | Hotkeys bind/unbind with the route; audio/back/session services remain session-owned and survive route changes |
| `workout-cardio*` | KEEP + REWRITE_UI | workout domain/feature | 7 | Preserve MET/save rules |
| `workout-voice.js`, `voice-*` | KEEP / WRAP | services/voice + platform | 7/10 | Preserve engine/cache settings |
| `workout-wakelock.js` | KEEP | platform/wake-lock | 7 | Session-owned |
| `workout-media-session.js` | KEEP | platform/media-session | 7 | Session-owned |
| `workout-pip.js` | KEEP / WRAP | platform/PIP | 7 | Remove dependency on hidden route DOM where possible |
| `health-diet.js`, `food-*` | KEEP domain + V7 Records UI owner | Records | 8 | Preserve food data/evidence/AI paths |
| `health-weight.js` | KEEP calculations + V7 runtime wrapper | Records | 8 | Chart gesture handlers bind only to the visible view and unbind on route exit |
| `health-exercise.js` | KEEP domain + V7 Records UI owner | Records/Workout | 7/8 | Preserve classification/library semantics |
| `health-profile.js` | KEEP domain + V7 Records/Profile UI owner | Records/Profile secondary | 8/10/11 | Profile lazy-loads the existing editor and preserves rehab weekly/profile data |
| `weekly-summary.js`, `report-panel.js` | KEEP + Records route owner | Records secondary routes/sheets | 8/11 | Preserve report versions |
| `advice-panel.js` | KEEP domain/request semantics + V7 route runtime owner | Coach feature | 9 | V7 mount/unmount owns scroll listeners, visual RAF and route cleanup without aborting transport |
| `advice-render.js`, templates/context | KEEP / WRAP | Coach service/view helpers | 9 | Preserve safe text handling and version behavior |
| `advice-attachments.js` | KEEP / WRAP | Coach attachment controller | 9 | Temporary object URLs release on removal/clear/route exit; raw files remain session-only |
| `advice-virtual-list.js` | KEEP / WRAP | Coach virtual history adapter | 9 | Virtual controller is route-owned and destroyed on exit; cold store remains unchanged |
| `ai-*` service/routing/model modules | KEEP / WRAP | services/ai | 2/9/10 | V7 consumes via context adapter; credentials never copied into UI state |
| `search-*` | KEEP / WRAP | services/search | 2/9/10 | Preserve evidence/search policy |
| `sync*` | KEEP / WRAP | services/sync | 2/10 | Preserve remote formats/conflict rules |
| `backup.js` | KEEP / WRAP | services/storage/backup | 2/10 | Preserve archive/import safety |
| `theme.js`, `i18n.js`, `haptics.js` | KEEP / WRAP | app/platform preferences | 3/10 | Expose through context |
| shared modal/sheet/picker/toast/banner/state UI | WRAP; V7 visual/runtime owner active | `src/ui/primitives/secondary-surfaces.js` + `69-v7-secondary.css` | 11 | Preserve existing close callbacks, focusTrap and navStack; V7 owns decoration, scroll lock and keyboard inset |
| `css-src/01..49` | KEEP where generic, progressively normalize | V7 layers/primitives/features | 3-11 | Avoid mass deletion; eliminate overlap as host modules migrate |
| `css-src/50..56` V6 UI | REWRITE_UI | V7 feature styles | 3-11 | Today, Workout, Records, Coach and Profile are overridden by owned V7 feature CSS; remaining pages migrate incrementally |
| scattered Glass CSS | REWRITE_UI | `src/ui/effects` | 4 | Feature CSS may consume classes/tokens but not invent backdrop rules |
| `sw.js`, `app-update.js`, manifest | KEEP then integrate | platform/PWA | 12 | Do not redesign SW while main UI is still moving |
| existing perf/browser/unit tests | KEEP / MERGE | V7-equivalent tests | all | Replace only when the new test covers the same contract; document replacements |

## Rules applied to every row

1. No destructive IndexedDB migration is permitted as a UI migration side effect.
2. No new V7 feature should add a formal dependency by assigning a new `window.xxx` global.
3. Legacy globals may be read only through explicitly named adapters/context during the bridge period.
4. A legacy renderer can be retired only after its functions have a mapped V7 entry and equivalent tests/manual QA.
5. CSS migration must reduce, not increase, high-cost idle effects.

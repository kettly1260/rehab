# Rehab V6 Function Inventory

This inventory was produced from the current V6 code, not from the V7 visual references. A visual omission is not treated as permission to delete a feature.

Status vocabulary follows the V7 taskbook: `KEEP`, `WRAP`, `REWRITE_UI`, `REWRITE_RUNTIME`, `MERGE`, `DEFER`, `DELETE`.

## 1. Today

| Capability | Current owner / entry | Data source | Decision |
|---|---|---|---|
| Greeting and current-day state | `today-view-core.js` -> Today app bar | current date + data facade | REWRITE_UI |
| Daily plan aggregate/completion | `today-view-core.js` | plans / daily plan state | KEEP + REWRITE_UI |
| Today plan card and selected plan | `today-view-core.js`, `plan-ui.js` | plan store | WRAP + REWRITE_UI |
| Plan task drawer/detail | `plan-ui.js` | plan store | WRAP + REWRITE_UI |
| Mark/confirm plan task complete | `plan-ui.js` | plan store / feedback | KEEP + WRAP |
| Move/lock/delete/edit plan task | `plan-ui.js` | plan store | KEEP + WRAP |
| Create plan / choose plan types | `plan-ui.js`, `plan-ai.js` | plan domain + AI | WRAP + REWRITE_UI |
| Start workout from planned task | `plan-ui.js` -> Workout | plan + workout runtime | KEEP + WRAP |
| Workout-finish reconciliation | `plan-ui.js` | workout history + plan | KEEP |
| Quick record actions | `today-view-core.js`, `plan-ui.js` | food/weight/exercise/workout | WRAP + REWRITE_UI |
| Diet summary / intake status | `today-view-core.js` | health food/diet goal | KEEP + REWRITE_UI |
| Today timeline / recent activity | `history-view.js` | history/health logs | KEEP + REWRITE_UI |
| Context AI / weekly AI insight | `history-view.js`, `weekly-summary.js`, `plan-ui.js` | AI + health/plan context | WRAP + REWRITE_UI |
| Save current plan as routine / quick repeat | `plan-ui.js` | plan + routine library | KEEP + WRAP |

Today has no function marked `DELETE`.

## 2. Workout

| Capability | Current owner / entry | Data/session source | Decision |
|---|---|---|---|
| Strength mode | `workout-core.js`, `workout-engine.js` | workout session | KEEP engine + REWRITE_UI |
| Cardio mode / MET plan | `workout-cardio.js`, `workout-cardio-pure.js` | workout session | KEEP + REWRITE_UI |
| Recovery/stretch actions | routine/action taxonomy + plan data | plan/action library | KEEP + REWRITE_UI |
| Start / running / pause / resume / finish | `workout-core.js`, `workout-engine.js` | workout session | KEEP + WRAP |
| Rep/work/rest/set timer phases | `workout-engine.js` | workout session | KEEP |
| Skip current phase/action | `workout-core.js`, `workout-engine.js` | workout session | KEEP |
| Previous phase/action | `workout-core.js` | workout session | KEEP |
| Rate/speed control | `workout-core.js` | workout session | KEEP + REWRITE_UI |
| Set review RPE/RIR | `workout-core.js` | history draft | KEEP + REWRITE_UI |
| Strength manual logging | `health-exercise.js` + Workout form | health exercise records | KEEP + REWRITE_UI |
| Current action list and plan editing | `routine-plan.js` | current actions | KEEP + REWRITE_UI |
| Action/routine library | `routine-library.js` | actions/routines/prescriptions | KEEP + REWRITE_UI |
| Readiness | `workout-readiness.js` | health/workout state | KEEP + REWRITE_UI |
| Plan/routine integration | `plan-*`, `routine-*` | plan domain | KEEP + WRAP |
| Session persistence / crash restore | `workout-state.js` | journal + data | KEEP |
| Visibility elapsed-time compensation | `workout-state.js`, engine/cardio | workout session | KEEP |
| Voice cues/settings/cache | `workout-voice.js`, `voice-*` | voice config | KEEP + WRAP |
| WakeLock | `workout-wakelock.js`, `workout-system.js` fallback | session | KEEP; MOVE TO SESSION OWNER |
| MediaSession | `workout-media-session.js`, system fallback | session | KEEP; MOVE TO SESSION OWNER |
| PIP (Document/Video) | `workout-pip.js` | session | KEEP + WRAP |
| Audio keepalive / cues | `workout-system.js` | session | KEEP + WRAP |
| Android back guard | `workout-system.js`, nav stack | session | KEEP + WRAP |
| Keyboard shortcuts | `workout-system.js` | page/session | REWRITE_RUNTIME with lifecycle disposer |

Critical rule for V7: `Workout UI Lifecycle != Workout Session Lifecycle`. Session-owned voice/wake-lock/media/PIP persistence can continue after the route unmounts; visual listeners and render loops cannot.

## 3. Records

| Capability | Current owner / entry | Data source | Decision |
|---|---|---|---|
| Records overview | `history-view.js` | history + health | KEEP + REWRITE_UI |
| Training history list | `history-view.js` | history collection | KEEP + REWRITE_UI |
| Calendar + day detail | `history-view.js` | history/food/exercise/weight/plans | KEEP + REWRITE_UI |
| PR leaderboard | `pr-tracker.js`, `history-view.js` | history/cache | KEEP + REWRITE_UI |
| Volume heatmap | `volume-heatmap.js` | history | KEEP + REWRITE_UI |
| Training review/context AI | `history-view.js` | history + AI | WRAP + REWRITE_UI |
| Diet log and goals | `health-diet.js`, `food-log.js` | health food logs | KEEP + REWRITE_UI |
| Text food recognition | `food-log.js`, AI/search evidence | AI + food data | KEEP + WRAP |
| Photo food recognition | `health-diet.js`, `ai-api.js` | AI vision + food data | KEEP + WRAP |
| Food evidence/verification | `food-evidence*`, `search-*` | search evidence | KEEP |
| Weight add/delete/list | `health-weight.js` | health weights | KEEP + REWRITE_UI |
| Weight trend/range/granularity | `health-weight.js` | weights | KEEP calculations + REWRITE_UI |
| Weight pinch/wheel zoom | `health-weight.js` | chart UI | REWRITE_RUNTIME |
| Xiaomi scale Web Bluetooth | `health-weight.js`, `mi-scale-*` | device reading | WRAP; secondary/experimental UI |
| Health profile | `health-profile.js` | health profile | KEEP + REWRITE_UI |
| Rehab weekly records | `health-profile.js` | rehab weekly | KEEP + REWRITE_UI |
| Rehab weekly AI parse/review | `health-profile.js` + AI | health/AI | KEEP + WRAP |
| Retroactive action linkage | `health-profile.js` | rehab/actions | KEEP |
| Manual exercise records | `health-exercise.js` | exercise logs/action library | KEEP + REWRITE_UI |
| Weekly/monthly summary | `weekly-summary.js` | reports/history | KEEP + REWRITE_UI |
| Weight reports/archive/versioning | `report-panel.js` | reports | KEEP + REWRITE_UI |

The current horizontal deck renders all four Records subviews at once. V7 will preserve all capabilities while replacing this runtime ownership model.

## 4. Coach

| Capability | Current owner / entry | Data/service source | Decision |
|---|---|---|---|
| Conversation history | `advice-panel.js`, advice collections | IndexedDB AI messages | KEEP + REWRITE_UI |
| Today/week/month/all ranges | `advice-panel.js`, route | advice store | KEEP + REWRITE_UI |
| Streaming responses | `advice-panel.js`, `advice-stream-renderer.js`, `ai-api.js` | AI stream | KEEP + WRAP |
| Manual scroll / auto-follow / new-message affordance | `advice-panel.js` | page UI | REWRITE_RUNTIME + REWRITE_UI |
| Stop/cancel preserving partial output | `advice-panel.js` | AbortController + advice store | KEEP |
| Retry / response versions | `advice-panel.js` | advice store | KEEP + REWRITE_UI |
| Edit prompt | `advice-panel.js` | advice versions | KEEP + REWRITE_UI |
| Markdown/table rendering | `advice-render.js` | assistant text | KEEP; use safe rendering contract |
| Attach image/file | `advice-attachments.js` | in-memory attachment payload | KEEP + REWRITE_UI |
| Attachment preview | `advice-attachments.js` | in-memory object URL | KEEP + REWRITE_UI |
| Model catalog/selection | `ai-model-*`, `ai-task-settings.js` | AI config | KEEP + REWRITE_UI |
| Model favorites/recents | task/model settings | local config | KEEP |
| AI task routing/fallback | `ai-routing*.js`, `ai-api.js` | AI config | KEEP |
| Web search tooling | `search-*`, `search-tool-loop.js` | provider/search config | KEEP |
| Evidence/citations | search evidence + advice render | request metadata | KEEP + REWRITE_UI |
| Prompt/context construction | `coach-context.js`, `advice-prompt.js`, templates | user health/plan data | KEEP |
| Prompt template management | `ai-templates.js`, `advice-template-manager.js` | settings | KEEP; move to secondary UI |
| Virtualized/cold history | `advice-virtual-list.js`, virtual-core, data store | IndexedDB | KEEP + WRAP |
| History search | advice search worker/store | IndexedDB + worker | KEEP + REWRITE_UI |
| Request-scoped wake lock | `advice-panel.js` | active request | KEEP + lifecycle-owned cleanup |

Coach ordinary bubbles will become stable Surfaces; Composer and selected controls may use Soft Glass.

## 5. Profile

| Capability | Current owner / entry | Data/config source | Decision |
|---|---|---|---|
| Profile identity / training summary | `routine-library.js` | health/history | KEEP + REWRITE_UI |
| Goal/body/weight-loss settings | goal/health modules | health config | KEEP + REWRITE_UI |
| Action library | `routine-library.js` | actions | KEEP + REWRITE_UI |
| Prescription action library/relationships | `routine-library.js`, taxonomy/identity | prescription actions | KEEP + REWRITE_UI |
| Routine library/editor | `routine-library.js` | routines | KEEP + REWRITE_UI |
| Equipment | `plan-equipment.js` | plan settings | KEEP + REWRITE_UI |
| AI providers | `ai-provider-manager.js` | AI config/credentials | KEEP + REWRITE_UI secondary route |
| AI per-task routing/model/reasoning | `ai-task-settings.js`, routing | AI config | KEEP + REWRITE_UI secondary route |
| Search provider settings | `search-settings.js` | search config | KEEP + REWRITE_UI secondary route |
| AI timeout/retry/template settings | inline Profile + AI modules | AI config | KEEP + REWRITE_UI secondary route |
| Encrypted AI config sync | AI/sync | encrypted config | KEEP |
| S3/WebDAV sync | `sync.js`, adapters/UI | sync cfg | KEEP + REWRITE_UI |
| Backup import/export/ring | `backup.js` | all local data | KEEP + REWRITE_UI |
| CSV exports | `backup.js` | food/exercise records | KEEP |
| Sync retry/health | sync modules | sync state | KEEP + REWRITE_UI |
| Voice settings | `workout-voice.js`, voice modules | voice config | KEEP + REWRITE_UI secondary route |
| Theme/color mode | `theme.js`, theme sheet | local theme config | KEEP + REWRITE_UI |
| Haptics | `haptics.js` | local preference | KEEP + REWRITE_UI |
| Language | `i18n.js` | locale preference | KEEP + REWRITE_UI |
| Xiaomi scale experimental toggle | health weight/profile experiment | local preference | KEEP; experiments route |
| Update/version info | `app-update.js`, profile footer | SW/app version | KEEP + REWRITE_UI |
| Debug/diagnostics | `debug-tools.js` | local debug preference | DEFER from primary profile; retain under diagnostics secondary route |

No Profile business capability is deleted. Diagnostics is the only deliberately de-emphasized item and remains reachable.

## 6. Secondary and cross-cutting UI

These flows must survive the V7 visual migration:

- Modal focus trap and Android back close.
- Theme sheet.
- Workout set review, cardio edit and workout library sheets/modals.
- Diet, weight and exercise entry modals.
- Health profile editor and rehab weekly sheet.
- Weekly/monthly summary and report sheets.
- AI model picker, provider manager, search provider manager, prompt template manager.
- Attachment preview.
- Sync/backup confirmations and import picker.
- Toasts, errors, empty/loading/offline states.
- Update banner and upgrade barrier.
- Permission/device states for WakeLock, PIP, Web Bluetooth, notifications/haptics where supported.

## 7. Inventory conclusion

- Business functions marked `DELETE`: **0**.
- Business functions without a V7 destination: **0** (see `V7_SCREEN_MAPPING.md`).
- Stable domain/storage/platform logic is predominantly `KEEP` or `WRAP`.
- Page rendering, lifecycle ownership, navigation ownership and V6 visual CSS are the primary `REWRITE_UI` / `REWRITE_RUNTIME` scope.


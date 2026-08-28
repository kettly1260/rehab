# Rehab V7 Screen Mapping

The V7 visual references define visual hierarchy only. This document maps every inventoried V6 capability to a V7 entry. `Mapped` means a destination is defined; it does not claim the code has already been migrated.

## Today

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Greeting/current day | Today header | Today header/status | Migrated / Phase 6 | Yes | Calm header, no decorative hero blur |
| Plan aggregate/completion | Today overview | Core status + Today plan section | Migrated / Phase 6 | Yes | Real plan data |
| Today plan/tasks | Today plan card | Today action section | Migrated / Phase 6 | Yes | Expand/detail sheet for dense task controls |
| Plan task edit/move/lock/delete/confirm | task drawer | Plan task detail sheet | Migrated / Phase 6; secondary visual Phase 11 | Yes | Preserve all controls |
| Create plan / AI plan | Today plan actions | New-plan / AI plan sheet | Migrated / Phase 6; secondary visual Phase 11 | Yes | Secondary surface |
| Quick record | action dock | Today quick actions | Migrated / Phase 6 | Yes | Diet/weight/exercise/workout real entries |
| Diet/intake | diet card | Today metric/status section | Migrated / Phase 6 | Yes | No fake visual numbers |
| Timeline/recent records | timeline | Today timeline/trend detail | Migrated / Phase 6 | Yes | Stable Surface rows |
| Context AI / weekly insight | Today AI cards | Insight card -> Coach/detail | Migrated / Phase 6; Coach visual Phase 9 | Yes | Keep AI source/context |
| Start planned workout | plan task | Primary CTA -> Workout | Migrated / Phase 6/7 | Yes | Liquid only on key CTA |
| Quick repeat/save routine | plan enhancements | Plan task overflow/detail | Migrated / Phase 6; secondary visual Phase 11 | Yes | Not removed from primary flow |

## Workout

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Strength/cardio/recovery/stretch modes | Workout mode controls | Workout segmented control + action taxonomy focus | Migrated / Phase 7 | Yes | Engine modes unchanged; recovery/stretch remain action-domain focus |
| Idle/readiness | Workout page | Workout status summary | Migrated / Phase 7 | Yes | Readiness listeners are route-owned |
| Action plan/list | current action list | Workout action sequence | Migrated / Phase 7 | Yes | Solid Surface, no per-row backdrop |
| Add/edit/delete/reorder actions | form/list | Action editor/detail | Migrated / Phase 7; secondary visual Phase 11 | Yes | Preserve library integration |
| Routine/action library | Workout library | Library sheet / Profile library | Migrated / Phase 7; Profile/secondary visual Phase 10/11 | Yes | Same action IDs |
| Start/pause/resume/finish | FAB controls | Primary session control | Migrated / Phase 7 | Yes | Only Play/Pause receives Liquid interaction |
| Skip/previous | Workout controls | Secondary session controls | Migrated / Phase 7 | Yes | Stable controls |
| Rep/work/rest/set timers | workout panel | Running session body | Migrated / Phase 7 | Yes | No backdrop on timer body |
| RPE/RIR set review | set review modal | Set review sheet | Migrated / Phase 7; secondary visual Phase 11 | Yes | Preserve logging |
| Manual strength log | Workout card | Quick log sheet/detail | Migrated / Phase 7; secondary visual Phase 11 | Yes | Same health record path |
| Cardio plan/edit/save | cardio card/modal | Cardio configure/session/result | Migrated / Phase 7 | Yes | Same MET rules |
| Voice settings | Workout/Profile setting | Session audio control + Profile Voice | Migrated / Phase 7; Profile visual Phase 10 | Yes | Existing voice service retained |
| WakeLock/MediaSession/PIP | session runtime | Session owner; PIP action | Migrated / Phase 7 | Yes | Session ownership survives route unmount |
| Crash/session restore | startup/workout state | Session restore + visible state rebuild | Migrated / Phase 7; resume banner visual Phase 11 | Yes | Journal schema unchanged |

## Records

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Training/history overview | Records overview | Records summary | Migrated / Phase 8 | Yes | Data-first stable Surface |
| Diet | Records diet tab | Records > Diet | Migrated / Phase 8 | Yes | Text/photo AI preserved |
| Weight | Records weight tab | Records > Weight | Migrated / Phase 8 | Yes | Trends + entries + reports |
| Health profile/rehab weekly | Records training tab | Records > Health | Migrated / Phase 8 | Yes | Health profile and rehab weekly both accessible |
| Manual exercise records | Records training tab | Records > Training/Health detail | Migrated / Phase 8 | Yes | Preserve library mapping |
| Calendar/day detail/full history | Records calendar tab | Records > Calendar/detail route | Migrated / Phase 8 | Yes | Only active subview is mounted at a time |
| PR leaderboard/volume heatmap | training review | Records > Training insight | Migrated / Phase 8 | Yes | Surface charts |
| Weekly/monthly summaries | summary sheets | Records > Reports | Migrated / Phase 8; secondary visual Phase 11 | Yes | Versioned AI summaries retained |
| Weight reports/archive | report sheet | Records > Weight > Reports | Migrated / Phase 8; secondary visual Phase 11 | Yes | Same version archive |
| Context AI | per-record AI cards | Insight action/detail -> Coach | Migrated / Phase 8; Coach visual Phase 9 | Yes | Preserve context generation |
| Xiaomi scale | weight modal/experiment | Weight add sheet when enabled | Migrated / Phase 8; Profile/experiment visual Phase 10 | Yes | Experimental secondary action |

## Coach

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Chat history and ranges | Coach page | Coach timeline/range control | Migrated / Phase 9 | Yes | Virtualized and cold history retained |
| Streaming / auto-follow | Coach list | Coach message list | Migrated / Phase 9 | Yes | Route-owned visual RAF/scroll handlers; transport continues under legacy semantics |
| Manual scroll/new message jump | Coach list rail | Compact list navigation | Migrated / Phase 9 | Yes | Manual scroll pauses follow without forcing the viewport back |
| Stop/cancel | Composer/send state | Composer stop state | Migrated / Phase 9 | Yes | Partial response preserved |
| Retry/version/edit | message actions | Message action menu | Migrated / Phase 9 | Yes | Same version records |
| Model picker/favorites/recents | picker sheet | Model control/sheet | Migrated / Phase 9; secondary visual Phase 11 | Yes | Soft Glass selected control only |
| Search/history search | search control | Coach search/filter | Migrated / Phase 9 | Yes | All-history search retained |
| Search evidence/citations | answer evidence UI | Evidence cards/detail | Migrated / Phase 9 | Yes | Existing evidence records retained |
| Attachments | composer controls | Composer attachment action | Migrated / Phase 9; preview visual Phase 11 | Yes | Route exit revokes temporary object URLs without persisting raw files |
| Prompt/context/templates | hidden/context/settings | Composer context + Profile AI settings | Migrated / Phase 9; Profile visual Phase 10 | Yes | Templates remain secondary settings |
| Usage/pricing/settings | topbar/settings | Model/details secondary UI | Migrated / Phase 9; Profile visual Phase 10 | Yes | Not required in primary chat chrome |

## Profile

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Training/health identity | Profile home | Health profile summary | Migrated / Phase 10 | Yes | Tool-like, not promotional hero |
| Goal/body plan | Goal & body | Profile > Goals | Migrated / Phase 10 | Yes | Existing goal data |
| Action/prescription/routine library | Library | Profile > Library | Migrated / Phase 10 | Yes | Secondary route with all editors |
| Equipment | library | Profile > Library/Equipment | Migrated / Phase 10 | Yes | Preserve plan equipment |
| AI providers/model/task settings | AI settings | Profile > AI | Migrated / Phase 10 | Yes | Full nested settings retained |
| Search provider settings | AI settings | Profile > AI > Search | Migrated / Phase 10/11 | Yes | Same config |
| Prompt templates/retry/timeout/encrypted AI sync | AI settings | Profile > AI advanced | Migrated / Phase 10/11 | Yes | Secondary route/sheet |
| S3/WebDAV sync | Sync | Profile > Sync | Migrated / Phase 10 | Yes | Same remote schema |
| Backup/import/export/CSV | Sync | Profile > Data & Backup | Migrated / Phase 10/11 | Yes | Import safety unchanged |
| Sync retry/health | Sync | Profile > Sync diagnostics | Migrated / Phase 10/11 | Yes | Secondary details |
| Voice | theme/workout settings | Profile > Voice | Migrated / Phase 10 | Yes | Same engines/config |
| Theme | palette sheet | Profile > Appearance / global sheet | Migrated / Phase 10/11 | Yes | Dark mode retained |
| Haptics/language | theme sheet | Profile > Preferences | Migrated / Phase 10/11 | Yes | Existing preferences retained |
| Experiments / Xiaomi scale toggle | Experiments | Profile > Experiments | Migrated / Phase 10 | Yes | Deliberately secondary |
| Version/update | footer | Profile > About/Update | Migrated / Phase 10 | Yes | PWA update behavior retained |
| Debug tools | settings row | Profile > Diagnostics | Migrated / DEFER UI polish to Phase 11 | Yes | Reachable but visually de-emphasized |

## Secondary surfaces shared across pages

All V6 modal/sheet/picker/loading/error/offline/toast/confirmation/attachment/permission/keyboard states are migrated to the V7 secondary-surface owner in Phase 11. Existing focusTrap, backdrop, focus return, navStack and workout-safe update semantics remain the functional owners; V7 owns shared decoration, body scroll lock, keyboard inset and restrained Surface styling. No current secondary business flow is intentionally removed.

## PWA runtime

Manifest install, shortcut routing, offline Today closure, V7 ESM shell caching, explicit Service Worker update apply, active-workout update deferral, deep links and standalone root-back behavior are integrated in Phase 12. Install and update prompts use the shared V7 secondary banner surface; the existing storage schema, workout journal and old-cache migration protocol remain unchanged.

## Mapping gate

- Inventoried V6 capabilities without a V7 entry: **0**.
- Explicitly deferred capability: **Debug/diagnostics primary-page polish only**; the route remains reachable and its functionality is retained.
- Data compatibility assumption: all mappings initially read/write through the existing V6 store/schema until Phase 2 adapters are proven equivalent.

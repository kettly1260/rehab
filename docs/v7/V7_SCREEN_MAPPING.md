# Rehab V7 Screen Mapping

The V7 visual references define visual hierarchy only. This document maps every inventoried V6 capability to a V7 entry. `Mapped` means a destination is defined; it does not claim the code has already been migrated.

## Today

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Greeting/current day | Today header | Today header/status | Mapped / Phase 6 | Yes | Calm header, no decorative hero blur |
| Plan aggregate/completion | Today overview | Core status + Today plan section | Mapped / Phase 6 | Yes | Real plan data |
| Today plan/tasks | Today plan card | Today action section | Mapped / Phase 6 | Yes | Expand/detail sheet for dense task controls |
| Plan task edit/move/lock/delete/confirm | task drawer | Plan task detail sheet | Mapped / Phase 6/11 | Yes | Preserve all controls |
| Create plan / AI plan | Today plan actions | New-plan / AI plan sheet | Mapped / Phase 6/11 | Yes | Secondary surface |
| Quick record | action dock | Today quick actions | Mapped / Phase 6 | Yes | Diet/weight/exercise/workout real entries |
| Diet/intake | diet card | Today metric/status section | Mapped / Phase 6 | Yes | No fake visual numbers |
| Timeline/recent records | timeline | Today timeline/trend detail | Mapped / Phase 6 | Yes | Stable Surface rows |
| Context AI / weekly insight | Today AI cards | Insight card -> Coach/detail | Mapped / Phase 6/9 | Yes | Keep AI source/context |
| Start planned workout | plan task | Primary CTA -> Workout | Mapped / Phase 6/7 | Yes | Liquid only on key CTA |
| Quick repeat/save routine | plan enhancements | Plan task overflow/detail | Mapped / Phase 6/11 | Yes | Not removed from primary flow |

## Workout

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Strength/cardio/recovery/stretch modes | Workout mode controls | Workout segmented control | Mapped / Phase 7 | Yes | Restrained segmented surface |
| Idle/readiness | Workout page | Workout status summary | Mapped / Phase 7 | Yes | Readiness secondary to action |
| Action plan/list | current action list | Workout action sequence | Mapped / Phase 7 | Yes | Solid Surface, no per-row backdrop |
| Add/edit/delete/reorder actions | form/list | Action editor/detail | Mapped / Phase 7/11 | Yes | Preserve library integration |
| Routine/action library | Workout library | Library sheet / Profile library | Mapped / Phase 7/10/11 | Yes | Same action IDs |
| Start/pause/resume/finish | FAB controls | Primary session control | Mapped / Phase 7 | Yes | Liquid interaction budget applies |
| Skip/previous | Workout controls | Secondary session controls | Mapped / Phase 7 | Yes | Stable controls |
| Rep/work/rest/set timers | workout panel | Running session body | Mapped / Phase 7 | Yes | No backdrop on timer body |
| RPE/RIR set review | set review modal | Set review sheet | Mapped / Phase 7/11 | Yes | Preserve logging |
| Manual strength log | Workout card | Quick log sheet/detail | Mapped / Phase 7/11 | Yes | Same health record path |
| Cardio plan/edit/save | cardio card/modal | Cardio configure/session/result | Mapped / Phase 7 | Yes | Same MET rules |
| Voice settings | Workout/Profile setting | Session audio control + Profile Voice | Mapped / Phase 7/10 | Yes | Platform service owner |
| WakeLock/MediaSession/PIP | session runtime | Session owner; PIP action | Mapped / Phase 7 | Yes | Not tied to page mount |
| Crash/session restore | startup/workout state | Resume banner / session restore | Mapped / Phase 7/11 | Yes | Preserve journal schema |

## Records

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Training/history overview | Records overview | Records summary | Mapped / Phase 8 | Yes | Data-first Surface |
| Diet | Records diet tab | Records > Diet | Mapped / Phase 8 | Yes | Text/photo AI preserved |
| Weight | Records weight tab | Records > Weight | Mapped / Phase 8 | Yes | Trends + entries + reports |
| Health profile/rehab weekly | Records training tab | Records > Health | Mapped / Phase 8 | Yes | Health profile and rehab weekly both accessible |
| Manual exercise records | Records training tab | Records > Training/Health detail | Mapped / Phase 8 | Yes | Preserve library mapping |
| Calendar/day detail/full history | Records calendar tab | Records > Calendar/detail route | Mapped / Phase 8 | Yes | Can be drill-down instead of all mounted at once |
| PR leaderboard/volume heatmap | training review | Records > Training insight | Mapped / Phase 8 | Yes | Surface charts |
| Weekly/monthly summaries | summary sheets | Records > Reports | Mapped / Phase 8/11 | Yes | Versioned AI summaries retained |
| Weight reports/archive | report sheet | Records > Weight > Reports | Mapped / Phase 8/11 | Yes | Same version archive |
| Context AI | per-record AI cards | Insight action/detail -> Coach | Mapped / Phase 8/9 | Yes | Preserve context generation |
| Xiaomi scale | weight modal/experiment | Weight add sheet when enabled | Mapped / Phase 8/10 | Yes | Experimental secondary action |

## Coach

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Chat history and ranges | Coach page | Coach timeline/range control | Mapped / Phase 9 | Yes | Virtualized history retained |
| Streaming / auto-follow | Coach list | Coach message list | Mapped / Phase 9 | Yes | Route-owned RAF/scroll handlers |
| Manual scroll/new message jump | Coach list rail | Compact list navigation | Mapped / Phase 9 | Yes | Do not force auto-follow |
| Stop/cancel | Composer/send state | Composer stop state | Mapped / Phase 9 | Yes | Partial response preserved |
| Retry/version/edit | message actions | Message action menu | Mapped / Phase 9 | Yes | Same version records |
| Model picker/favorites/recents | picker sheet | Model control/sheet | Mapped / Phase 9/11 | Yes | Soft Glass selected control only |
| Search/history search | search control | Coach search/filter | Mapped / Phase 9 | Yes | All-history search retained |
| Search evidence/citations | answer evidence UI | Evidence cards/detail | Mapped / Phase 9 | Yes | No data loss |
| Attachments | composer controls | Composer attachment action | Mapped / Phase 9 | Yes | Preview secondary surface |
| Prompt/context/templates | hidden/context/settings | Composer context + Profile AI settings | Mapped / Phase 9/10 | Yes | Templates remain secondary settings |
| Usage/pricing/settings | topbar/settings | Model/details secondary UI | Mapped / Phase 9/10 | Yes | Not required in primary chat chrome |

## Profile

| V6 function | V6 entry | V7 entry | Status | Data compatible | Notes |
|---|---|---|---|---|---|
| Training/health identity | Profile home | Health profile summary | Mapped / Phase 10 | Yes | Tool-like, not promotional hero |
| Goal/body plan | Goal & body | Profile > Goals | Mapped / Phase 10 | Yes | Existing goal data |
| Action/prescription/routine library | Library | Profile > Library | Mapped / Phase 10 | Yes | Secondary route with all editors |
| Equipment | library | Profile > Library/Equipment | Mapped / Phase 10 | Yes | Preserve plan equipment |
| AI providers/model/task settings | AI settings | Profile > AI | Mapped / Phase 10 | Yes | Full nested settings retained |
| Search provider settings | AI settings | Profile > AI > Search | Mapped / Phase 10/11 | Yes | Same config |
| Prompt templates/retry/timeout/encrypted AI sync | AI settings | Profile > AI advanced | Mapped / Phase 10/11 | Yes | Secondary route/sheet |
| S3/WebDAV sync | Sync | Profile > Sync | Mapped / Phase 10 | Yes | Same remote schema |
| Backup/import/export/CSV | Sync | Profile > Data & Backup | Mapped / Phase 10/11 | Yes | Import safety unchanged |
| Sync retry/health | Sync | Profile > Sync diagnostics | Mapped / Phase 10/11 | Yes | Secondary details |
| Voice | theme/workout settings | Profile > Voice | Mapped / Phase 10 | Yes | Same engines/config |
| Theme | palette sheet | Profile > Appearance / global sheet | Mapped / Phase 10/11 | Yes | Dark mode retained |
| Haptics/language | theme sheet | Profile > Preferences | Mapped / Phase 10/11 | Yes | Existing preferences retained |
| Experiments / Xiaomi scale toggle | Experiments | Profile > Experiments | Mapped / Phase 10 | Yes | Deliberately secondary |
| Version/update | footer | Profile > About/Update | Mapped / Phase 10 | Yes | PWA update behavior retained |
| Debug tools | settings row | Profile > Diagnostics | Mapped / DEFER UI polish to Phase 11 | Yes | Reachable but visually de-emphasized |

## Secondary surfaces shared across pages

All V6 modal/sheet/picker/loading/error/offline/toast/confirmation/attachment/permission/keyboard states map to the V7 secondary-surface system in Phase 11. No current secondary business flow is intentionally removed.

## Mapping gate

- Inventoried V6 capabilities without a V7 entry: **0**.
- Explicitly deferred capability: **Debug/diagnostics primary-page polish only**; the route remains reachable and its functionality is retained.
- Data compatibility assumption: all mappings initially read/write through the existing V6 store/schema until Phase 2 adapters are proven equivalent.


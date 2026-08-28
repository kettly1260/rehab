# Rehab V7 Android Power Test Plan

## Status

`BLOCKED_EXTERNAL_DEVICE`

No Android device is attached to this agent environment. Automated desktop browser results are not a thermal, battery, or physical-device conclusion.

## Controlled comparison

Run the following builds on the same physical phone:

1. V6 stable at commit `ae1194b17be420a6ec6ecf8b70d1cb358a28bc7b`.
2. V7 balanced effects at the final `v7-liquid-glass` commit.
3. V7 economy effects at the same final commit.

Keep device model, Android/WebView/Chrome version, PWA install state, battery starting range, brightness, network, ambient temperature, orientation and test data constant. Disable unrelated background work where practical and record anything that cannot be controlled.

## Procedure

Use a fresh app launch for each group and allow the phone to return to the same resting temperature before the next run.

| Segment | Duration | Required path |
|---|---:|---|
| Today / Records | 15 min | Today idle and scroll, all Records subviews, chart and long-list scroll |
| Workout | 15 min | Idle, start, pause/resume, stage changes, background/foreground and finish |
| Coach | 10 min | Open history, stream a representative response, manual scroll and stop |
| Idle | 10 min | Leave the same main page visible without interaction |

Repeat each comparison group at least three times. Alternate group order where possible to reduce charge-state and ambient-temperature bias.

## Measurements

Record before/after battery percentage, battery current/energy data when available, surface or battery temperature, frame stability, visible jank, CPU/GPU counters when available, background/PWA behavior, wake-lock behavior and any browser process restart. Use Android Studio Energy Profiler, Perfetto, `dumpsys batterystats`, or vendor tools only when their collection overhead is documented consistently across all groups.

## Acceptance

- V7 economy must not regress battery loss or temperature against V6 beyond measurement noise.
- V7 balanced must show no repeated severe jank, runaway background work or unbounded thermal rise.
- Hidden routes must not keep visual RAF, animation or route-owned observers active.
- Workout journal restore, wake lock, Media Session, back behavior and offline launch must remain correct.

Any thermal or battery conclusion remains `BLOCKED_EXTERNAL_DEVICE` until this procedure is completed and raw observations are attached to the final performance and migration reports.

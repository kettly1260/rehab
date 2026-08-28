# Rehab V7 Performance Report

## Status

Phase 13 desktop automation passed on August 28, 2026. Android thermal and battery validation is `BLOCKED_EXTERNAL_DEVICE`; see `V7_ANDROID_TEST_PLAN.md`.

## Baseline

The V6 reference is commit `ae1194b17be420a6ec6ecf8b70d1cb358a28bc7b`. Its recorded GPU-off `perf:edge` baseline is 27 scripts, 38 resources, 0 Long Tasks, 772 KB transfer and 126.5 ms `boot:first-render`. The baseline did not measure route rendering or Android power.

The final V7 GPU-off boot smoke reported 45 scripts, 50 resources, 0 Long Tasks, 884 KB transfer and 60.7 ms `boot:first-render`. Script/resource transfer increased because the V7 ESM shell is now part of the offline-capable startup graph. The timing is directionally better, but the final harness uses Playwright instead of the unstable raw CDP page socket, so the boot duration is not treated as a strict apples-to-apples benchmark.

## Test method

- System Edge/Chrome through Playwright, isolated temporary profile and extensions disabled.
- GPU is not disabled for `perf:render`, `perf:lifecycle` or `perf:effects`.
- 390 x 844 viewport; Service Worker blocked so cache state does not hide transfer and startup behavior.
- Known Kaspersky localhost injection is blocked and recorded; same-origin Rehab requests are not filtered.
- Render paths run three times and report medians. Workout running uses one real session per mode because browser-level audio/session ownership intentionally survives page route changes; lifecycle stability is covered separately by the 20-round gate.
- Long Tasks, Long Animation Frames when supported, RAF frame intervals, live RAF/timer/observer/listener proxies, DOM size, layout/style CDP metrics, transfer and visible effect cost are collected.

## GPU-on render results

System Edge `151.0.4129.107` used ANGLE D3D11 on Intel UHD Graphics. The table reports balanced-mode medians at 390 x 844. Transfer/resource figures are cumulative after lazy route warm-up and are included as diagnostics rather than per-path budgets.

| Path | Long Task ms | LoAF ms | Frame p95 ms | DOM nodes | Active RAF | Timers (timeout/interval) |
|---|---:|---:|---:|---:|---:|---:|
| Today idle | 0 | 0 | 4.3 | 1584 | 1 | 0 / 1 |
| Today scroll | 0 | 0 | 4.4 | 1584 | 1 | 0 / 1 |
| Tab switching | 0 | 0 | 4.3 | 1584 | 1 | 0 / 1 |
| Workout idle | 0 | 0 | 4.3 | 1584 | 1 | 0 / 1 |
| Workout running | 94 | 99 | 4.3 | 1599 | 1 | 1 / 4 |
| Records chart/scroll | 0 | 0 | 4.3 | 1653 | 1 | 0 / 1 |
| Coach streaming | 0 | 0 | 4.3 | 1701 | 1 | 0 / 1 |
| Profile scroll | 0 | 0 | 4.3 | 1584 | 1 | 0 / 1 |
| Modal/Sheet | 0 | 0 | 4.3 | 1584 | 1 | 0 / 1 |

The one active RAF in settled samples is the app/runtime proxy count after the harness frame sampler has been cancelled. No sampled route had a running CSS animation, permanent `will-change`, nested V7 backdrop, or visible V7 backdrop after interaction settle.

## Balanced and economy

Today idle, Records chart/scroll, Coach streaming, Modal/Sheet and Workout running were compared in both modes. Both modes had 0 settled visible/nested V7 backdrops, 0 running animations and 0 permanent `will-change` in all sampled paths. Economy Workout had 0 Long Task and 0 LoAF; balanced Workout recorded 59 ms Long Task and 64 ms LoAF in its independent session. This is evidence that economy does not add visual work, not a claim of Android battery or thermal improvement.

## Lifecycle cleanup

The 20-round GPU-on route test passed. Cold-to-warm lazy loading added persistent singletons once; warm-to-final growth was:

| Resource proxy | Round 1 | Round 20 | Growth |
|---|---:|---:|---:|
| Window listeners | 53 | 53 | 0 |
| Document listeners | 37 | 37 | 0 |
| Timeouts | 4 | 2 | -2 |
| Intervals | 2 | 2 | 0 |
| MutationObserver | 5 | 5 | 0 |
| ResizeObserver | 45 | 45 | 0 |
| Modal residue | 0 | 0 | 0 |

## Static cost audit

Counts compare V6 `ae1194b` with the final Phase 13 worktree. They are authored occurrence counts, not runtime layer counts.

| Pattern | V6 | V7 | Interpretation |
|---|---:|---:|---|
| Active backdrop declarations | 84 | 88 | Four centralized balanced-mode declarations were added; migrated settled paths show 0 visible candidates and economy forces none |
| `transition: all` | 16 | 16 | No new V7 occurrence; legacy debt unchanged |
| `will-change` | 12 | 14 | One interaction-only transform hint plus one explicit `auto` reset; 0 permanent runtime hits |
| Infinite animation | 11 | 11 | No new V7 occurrence; legacy debt unchanged |
| `requestAnimationFrame` | 47 | 52 | Added through feature lifecycle owners for route rendering/cleanup |
| `setInterval` | 12 | 13 | Added lifecycle scope API; 20-round interval growth is 0 |
| `ResizeObserver` | 18 | 18 | No authored increase |
| `MutationObserver` | 5 | 11 | One per migrated feature/secondary owner; all are disconnected through lifecycle scopes and warm-to-final growth is 0 |

The result supports the narrower conclusion required by this migration: the migrated V7 pages have materially reduced settled visual cost and do not add unowned persistent work. It does not claim that all V6 high-cost CSS has been removed from the repository.

## Automated gates

Run:

```text
npm run perf:edge
npm run perf:render
npm run perf:lifecycle
npm run perf:effects
```

All four commands passed. Runtime evidence is written to `.tmp/v7-perf/`; the 20-round lifecycle evidence is written under `.tmp/lazy-runtime-v344/playwright/lifecycle/`.

## Limitations

Headless Edge with GPU enabled is a browser rendering gate, not proof that a physical GPU handled every operation. Desktop timing varies with system load. Long Animation Frame support is browser-dependent. Workout balanced/economy sessions use separate pages in the same isolated browser context to avoid cross-session audio ownership. The tests deliberately use conservative regression budgets and do not claim that a phone will remain cool.

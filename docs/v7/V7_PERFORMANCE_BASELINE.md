# Rehab V7 Performance Baseline

## Baseline identity

- Date: 2026-08-27
- Stable branch: `perfrom`
- Commit: `ae1194b17be420a6ec6ecf8b70d1cb358a28bc7b`
- Test branch immediately after baseline capture: `v7-liquid-glass`
- Device represented by automated measurements: desktop Edge/Chromium harness only. This is **not** an Android thermal result.

## 1. Static power-risk scan

The scan searched authored/runtime `.js`, `.mjs`, `.cjs`, `.css`, `.html` while excluding `.git`, `node_modules`, `build`, `archive` and temporary directories. Counts are textual occurrences, not a claim that every occurrence is active simultaneously.

| Pattern | Baseline occurrences | Notable hotspots |
|---|---:|---|
| `backdrop-filter` | 125 | `42-health-profile.css` 16, `46-advice-ai.css` 16, `54-v6-ai.css` 16, `51-v6-today.css` 12, `52-v6-workout.css` 12 |
| CSS `filter:` | 8 | history/V6 UI/V6 AI |
| `animation:` | 56 | V6 AI/effects/profile/Today |
| `infinite` keyword | 17 | V6 AI is the main authored CSS hotspot; count also includes non-CSS code/tests |
| `will-change:` | 14 | model picker/advice/records/report surfaces |
| `transition: all` | 32 | `styles.css`, components and older feature CSS |
| `requestAnimationFrame` | 73 | `advice-panel.js` 15, `data-views.js` 5; count includes libraries/tests |
| `setInterval` | 28 | workout session modules plus tests/update/status |
| `setTimeout` | 167 | boot, Coach, weight/chart and other runtime/test code |
| `ResizeObserver` | 28 | virtual-core/test code plus virtual list/task settings |
| `IntersectionObserver` | 0 | — |
| `MutationObserver` | 13 | task settings/debug/diet plus tests |
| `pointermove` | 6 | Records intent, Coach, plan gestures |
| `touchmove` | 12 | Coach 8, weight, sheet drag, swipe actions |
| explicit scroll listeners | 4 | Coach, app shell and virtual-core |
| `position: fixed` | 34 | legacy global CSS/modals/toasts/AI |
| `position: sticky` | 8 | legacy components/AI |

Global-coupling scan across runtime source reported approximately 323 `window.<name> =` assignment forms and 2,483 `window.<name>` references. These numbers include deliberate compatibility APIs and are used only as a directional architecture baseline.

## 2. Runtime baseline: `npm run perf:edge`

The existing performance smoke test passed.

| Metric | Baseline |
|---|---:|
| Script count | 27 |
| Resource count | 38 |
| Long task count | 0 |
| Long task time | 0 ms |
| `boot:first-render` | 126.5 ms measured boot span |
| `boot:deps` | 62.4 ms |
| `boot:data-init` | 9.8 ms |
| FCP reported by harness | 8208 ms |
| Resource transfer | 772 KB |
| Network transfer | 1129 KB |
| Console errors | 0 |
| Generated CSS transfer size | 443,276 bytes |

The harness budgets were `scripts <= 70`, `resources <= 95`, `longTaskMs <= 180`, `transferKb <= 1000`; the run reported `edge-perf-smoke: OK`.

The large reported FCP is retained as observed baseline rather than normalized away. It includes the harness/startup environment and should be compared using the same test path.

## 3. Automated test baseline

- `npm run lint`: passed before V7 edits.
- `npm run typecheck`: passed before V7 edits.
- Unit/source-contract tests ran successfully until browser-backed cases were reached.
- Browser cases were blocked by a missing local Playwright Chromium executable (`chromium_headless_shell-1148`).
- A browser installation attempt reached the Playwright CDN but timed out at the network layer; this is an environment dependency, not a source assertion.

Affected baseline browser scenarios include deep-link/back-stack tests and cancelled-navigation lifecycle tests. They must be rerun as soon as an available browser executable is wired into the harness.

## 4. Lifecycle/power hotspots to prove fixed in V7

1. Records currently mounts all health subviews in one horizontal deck and performs transform/opacity work during scroll.
2. Records installs document-level pointer/focus listeners without a route-scoped disposer.
3. Coach has multiple scroll, touch/pointer and RAF paths distributed across one large controller.
4. Workout UI and workout session platform services are not yet represented by separate owners.
5. `backdrop-filter` is spread across feature CSS, so viewport-level backdrop budget cannot be audited from one owner.
6. `transition: all`, permanent/long-lived `will-change` and idle animations still exist in authored CSS.
7. `index.html` owns document-level app listeners and dynamic dependency loading, preventing feature cleanup from being the single source of truth.

## 5. V7 quantitative gates

Automated gates will be added/extended to measure:

- active page-owned RAF count after 5 seconds idle;
- active page-owned timers/observers/listeners before and after route change;
- backdrop-bearing visible elements per viewport (target <= 2, economy = 0);
- no feature-owned nested backdrop;
- no `transition: all` in V7 source;
- no permanent V7 `will-change` after an interaction settles;
- no idle filter/box-shadow animation in V7 effects;
- DOM size per main route and hidden-feature DOM retention;
- Long Tasks / Long Animation Frames / frame timing on GPU-on render paths when browser support permits.

The existing `perf:edge` test remains a boot/resource sanity test and is not evidence of GPU or thermal improvement.

## 6. Android thermal baseline status

No defensible V6/V7 Android power comparison has been run yet. Final validation must use the same physical Android phone, brightness, network and route scripts for:

```text
V6 stable
V7 balanced
V7 economy
```

The Android procedure and result template will be maintained in `V7_ANDROID_TEST_PLAN.md`; automated browser data must not be presented as a thermal conclusion.


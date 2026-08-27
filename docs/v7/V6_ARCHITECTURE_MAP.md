# Rehab V6 Architecture Map

## Baseline

- Stable/base branch: `perfrom`
- Baseline commit: `ae1194b17be420a6ec6ecf8b70d1cb358a28bc7b`
- V7 work branch: `v7-liquid-glass`
- Baseline working tree: tracked files clean; only `REHAB_V7_AGENT_TASKBOOK.md` and `docs/v7/` visual references were untracked.
- Application shape: static, local-first PWA; no backend; browser runtime is primarily classic IIFEs exposing facades on `window`.

## 1. Boot and dependency ownership

The current boot path is concentrated in `index.html`.

```text
index.html
  -> early CSS / startup recovery
  -> sync boot scripts (data-rehab-entry)
  -> inline PAGE_DEPS / SCRIPT_PREREQUISITES graph
  -> ensureDeps(page)
  -> activatePageSideEffects(page)
  -> ui._activateTab(page)
  -> data.init()
  -> data.render(activePage)
  -> lazy page modules / idle warmup
  -> deferred service-worker registration
```

Key characteristics:

- `PAGE_DEPS` and `SCRIPT_PREREQUISITES` manually encode browser dependency order.
- `loadScript()` creates classic/module script elements at runtime and records them in `_loaded`.
- Page loading and page side effects are partially separated, but lifecycle ownership is not symmetric: activation exists, page-scoped disposal generally does not.
- `index.html` owns routing glue, navigation tokens, page activation, lazy CSS, lazy JS, first-render timings, update registration and global scroll chrome behavior.
- Today is intentionally light at first paint (`history-view`, `today-view-core`), then `plan-ui` is idle-loaded as an enhancement.

## 2. Routing and navigation

Current top-level pages are:

```text
today
workout
records
ai-coach
profile
```

`app-route.js` owns hash parsing/serialization. Supported subroutes include:

- Records: `diet`, `weight`, `training`, `calendar`.
- Profile: `home`, `library`, `weightloss`, `ai`, `sync`, `experiments`.
- Coach: advice ranges `today`, `week`, `month`, `all`.

`nav-stack.js` owns Android/PWA back behavior, modal/subtab history frames and standalone root recovery. `index.html` still owns the actual top-level DOM activation through `ui._activateTab()`.

V6 navigation therefore has three cooperating owners:

1. `app-route.js` for URL state.
2. `nav-stack.js` for browser/PWA back-stack semantics.
3. inline `ui` in `index.html` for dependency loading and DOM activation.

This split is functional but makes cancellation, subroute commits and teardown hard to reason about.

## 3. Rendering ownership

`data.js` is the main compatibility facade. It merges many `window.data*` modules into one `data` object and exposes `window.data`.

`data-views.js` routes render work by active page:

- Today: fills six slot roots (`todayOverview`, quick actions, plan, diet, timeline, AI).
- Workout: renders the action list and workout plan card into mostly static markup owned by `index.html`.
- Records: renders overview plus a horizontal swipe deck containing all four health subviews.
- Coach: renders the chat panel and schedules attachment/scroll/search bindings in RAF callbacks.
- Profile: delegates to `routine-library.js`, which switches between home, library, goal and settings subviews.

Most feature modules return HTML strings or mutate known DOM ids. The page root is not yet a lifecycle boundary.

## 4. Data and persistence

### 4.1 IndexedDB

`storage/idb.js`:

- Database: `rehab_pro_storage`
- IndexedDB version: `4`
- Stores:
  - `kv`
  - `history` (`keyPath: id`, indexes `byUpdatedAt`, `byDateKey`)
  - `ai_messages` (`keyPath: id`, indexes `byUpdatedAt`, `byRole`)

### 4.2 App schema

`data.js`/`data-schema.js` currently normalize app schema version `3` and preserve health, history, plan, AI and settings data. Health state includes weight, food, exercise, reports, rehab weekly records, prescription actions, goal/body/weight/diet plans, AI advice state and derived caches.

### 4.3 Compatibility layer already present

`storage/migrate.js` and `data-store.js` already provide valuable compatibility behavior:

- localStorage fallback when IndexedDB is unavailable;
- deferred localStorage -> IndexedDB migration;
- split history and AI-message collections;
- legacy full snapshot recovery;
- AI chat version migration;
- save blocking while data readiness failed/pending;
- pagehide flush and sync scheduling.

V7 must wrap these paths rather than replacing them.

## 5. Domain/service ownership to preserve

| Area | Current owners | V7 posture |
|---|---|---|
| Workout state machine | `workout-engine.js`, `workout-state.js` | KEEP / WRAP |
| Workout UI/session orchestration | `workout-core.js`, `workout-system.js`, `workout-cardio.js` | WRAP; split UI lifecycle from session lifecycle |
| Plans/routines | `plan-*`, `routine-plan.js`, `routine-library.js` | KEEP domain, REWRITE_UI adapters |
| Health/records | `health-*`, `history-view.js`, `weekly-summary.js`, `report-panel.js` | KEEP calculations/storage, REWRITE_UI |
| AI | `ai-*` | KEEP service/routing/model logic, WRAP |
| Search/evidence | `search-*`, `food-evidence*` | KEEP / WRAP |
| Sync/backup | `sync*`, `backup.js` | KEEP / WRAP |
| Voice | `voice-*`, `workout-voice.js` | KEEP platform/service ownership |
| Wake lock | `workout-wakelock.js`, fallback in `workout-system.js` | KEEP; move session ownership out of page DOM |
| MediaSession | `workout-media-session.js`, fallback in `workout-system.js` | KEEP; session-owned |
| PIP | `workout-pip.js` | KEEP / WRAP; session-owned |
| PWA/update | `sw.js`, `app-update.js`, `pwa-support.js` | KEEP until Phase 12, then integrate |

## 6. CSS ownership

Current authored CSS is split across `css-src/` and built to `build/generated.css`, but the cascade still relies on numeric order and V6 partials. Major V6 page files are `50-v6-ui.css` through `56-v6-nav.css`, while older domain files also continue to affect those same selectors.

Problems relevant to V7:

- Glass declarations are distributed across page/domain styles instead of one effects owner.
- V6 override layers coexist with older component rules.
- Some high-cost visual rules are present in both legacy domain CSS and V6 page CSS.
- Production may remain one CSS output; the V7 change is source ownership and explicit layers, not necessarily runtime CSS splitting.

V7 target ownership:

```text
src/ui/tokens
src/ui/primitives
src/ui/effects
src/ui/navigation
src/features/<feature>/styles
```

with explicit cascade layers and page scoping.

## 7. Lifecycle gaps observed at baseline

- `app-route.init()` installs a document-lifetime `hashchange` listener.
- `nav-stack.init()` installs a document-lifetime `popstate` listener.
- `index.html` installs a document-lifetime scroll listener for top-app-bar state.
- Records installs document-level pointer/focus listeners through `bindHealthCssIntent()` and keeps a swipe-scroll timer outside a route disposer.
- Records renders all four health subpages into one swipe deck, increasing hidden DOM and making per-view cleanup difficult.
- Coach owns many gesture/scroll/stream RAF paths; it has local rebinding cleanup in places, but no single page unmount contract.
- Workout session state, wake lock, MediaSession, audio keepalive and page UI are mixed across `workout-core.js` / `workout-system.js` / adapters.
- PIP legitimately requires background/session behavior and therefore must not be tied to route visibility.

## 8. V7 architectural seam

Phase 1 will add an ES-module V7 runtime without deleting the V6 boot chain. The intended seam is:

```text
V6 persistence/domain/service facades
          ^
          | legacy adapters
          |
V7 context -> router -> lifecycle -> feature mount/unmount
          |
          +-> V7 UI primitives/effects/navigation
```

The V6 facade remains the compatibility source while new feature code stops adding new formal `window.xxx` dependencies.


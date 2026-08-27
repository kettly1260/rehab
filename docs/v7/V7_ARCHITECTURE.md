# Rehab V7 Architecture

## Phase 1 App Shell

V7 is introduced as native browser ES modules while the proven V6 boot/data/domain chain remains available as the compatibility backend.

```text
index.html legacy startup
       |
       +-- V6 entry scripts / data.init / first render
       |
       `-- dynamic import src/app/bootstrap.js
                    |
                    +-- Event Bus
                    +-- Router bridge
                    +-- Lifecycle registry
                    +-- App Context
                    `-- Feature Registry
                         +-- Today
                         +-- Workout
                         +-- Records
                         +-- Coach
                         `-- Profile
```

The five feature modules currently mount onto the existing V6 page roots. This is intentional: Phase 1 establishes ownership and teardown boundaries without duplicating business UI or data.

## App module responsibilities

- `src/app/bootstrap.js`: creates one V7 runtime, bridges the legacy activation entry, starts the router and mounts the current feature.
- `src/app/router.js`: owns the V7 navigation API and V6-compatible top-level/hash normalization. During the bridge period it delegates actual page loading/rendering to the preserved legacy tab entry.
- `src/app/lifecycle.js`: owns the single active top-level feature and disposes its registered resources before the next feature mounts.
- `src/app/context.js`: dependency carrier. New V7 modules receive services/context rather than creating new formal `window.xxx` dependencies.
- `src/app/events.js`: local publish/subscribe for app-level coordination.
- `src/app/feature-registry.js`: explicit five-feature registry using native imports rather than `PAGE_DEPS`.

## Lifecycle contract

Each V7 feature exposes `mount({ context, scope, meta })` and may expose `update()` / `unmount()`.

The provided lifecycle `scope` can own:

- event listeners;
- timers;
- intervals;
- one-shot RAF work;
- observers;
- arbitrary disposer callbacks.

Changing top-level feature disposes the previous scope before mounting the next. `window.rehabV7.diagnostics.snapshot()` is the single temporary migration/debug facade used by browser tests to observe ownership; feature-to-feature communication does not use it.

## Bridge rule

V6 remains the fallback and functional truth source until a feature phase replaces a renderer. V7 may call legacy behavior only through context/adapters. Phase 2 formalizes those adapters and data compatibility.

## Browser compatibility gate

Browser QA uses Playwright with this preference order:

1. requested Playwright channel;
2. system-installed Edge executable;
3. downloaded Playwright Chromium.

This keeps CI/developer browser contracts runnable when the Playwright CDN is unavailable.


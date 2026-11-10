# Rehab V7 Effects

## Ownership

All new V7 Glass behavior is owned by `src/ui/effects/` and `css-src/62-v7-effects.css`. Feature styles may opt into the approved effect classes, but should not add independent backdrop/filter implementations.

Approved vocabulary:

- `v7-surface`: ordinary content; no backdrop.
- `v7-soft-glass`: selected compact control/composer/filter surface.
- `v7-glass-overlay`: modal/sheet overlay only.
- `v7-liquid-control`: primary interactive control; uses pointer-local highlight without backdrop.
- `v7-liquid-indicator`: selected navigation/control indicator; uses transform/opacity only.

## Modes

- `full`: Balanced geometry plus a slightly richer bounded temporary overlay/Soft Glass budget and stronger pointer-local Liquid highlight. It does not enable page-wide blur or an idle animation loop.
- `balanced`: normal/recommended phone mode; restrained 8px navigation Soft Glass and 6px temporary overlay Glass.
- `economy`: `backdrop-filter:none`, `filter:none`, no Liquid pseudo transition and an opaque/solid fallback while preserving layout.

Reduced-motion and Save-Data environments resolve to Economy. A user-selected Full mode is a real persisted mode and survives reload on an unconstrained environment.

The setting key is `rehab.v7.effects.v1`. It is presentation-only and does not alter user health/training data.

## Cost budget

- Maximum visible V7 backdrop candidates per viewport: 2.
- Nested V7 backdrop candidates: 0.
- No full-page WebGL/canvas refraction path.
- No V7 continuous animation or filter animation.
- `will-change` exists only while an element is actively pressed/dragged.
- The effects controller schedules no RAF loop; pointer-local highlight values update only during pointer interaction.

`auditEffectBudget()` exposes a browser-testable budget snapshot.

## Final browser/performance evidence

`test/v7-effects.browser.test.mjs` verifies all three modes on the real Today CTA and Bottom Nav, including layout invariance, interaction-only Full highlight, Economy computed `none` filter/backdrop, persistence and backdrop audit. `perf:effects` on system Edge 151 at 390 x 844 completed with `ok:true`, no page errors/failures, zero running CSS animations, zero permanent `will-change` and zero nested backdrops in every Balanced/Economy scenario. Records chart/scroll frame p95 measured 12.1ms in Balanced and 6.5ms in Economy in the final run.


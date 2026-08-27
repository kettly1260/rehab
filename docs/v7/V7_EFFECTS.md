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

`balanced` is the normal mode. `economy` turns V7 backdrop filters off and uses an opaque/translucent solid fallback. Reduced-motion and Save-Data environments automatically start in economy unless the persisted state already requests economy; a persisted balanced choice is also downgraded when those constraints are active.

The setting key is `rehab.v7.effects.v1`. It is presentation-only and does not alter user health/training data.

## Cost budget

- Maximum visible V7 backdrop candidates per viewport: 2.
- Nested V7 backdrop candidates: 0.
- No full-page WebGL/canvas refraction path.
- No V7 continuous animation or filter animation.
- `will-change` exists only while an element is actively pressed/dragged.
- The effects controller schedules no RAF loop; pointer-local highlight values update only during pointer interaction.

`auditEffectBudget()` exposes a browser-testable budget snapshot.


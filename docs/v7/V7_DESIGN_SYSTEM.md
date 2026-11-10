# Rehab V7 Design System

## Visual direction

V7 treats Rehab as a health-training tool rather than a showcase for Glass. The dominant visual system is stable neutral Surface plus the user's current dynamic accent. Semantic information/warning/danger/recovery colors stay independent from the theme accent, while primary CTA, selected navigation and selected controls follow the existing Material theme.

The accepted five V7 visual references remain the hierarchy reference. They do not override V6 business functions or real data.

## Source ownership

- `css-src/60-v7-tokens.css`: semantic color, type, spacing, radius, elevation, motion, touch/icon and navigation/CTA geometry.
- `css-src/61-v7-primitives.css`: Surface, Button, Chip, Field, List Row, Tabs, Modal and Sheet geometry.
- `css-src/62-v7-effects.css` + `src/ui/effects/`: Full/Balanced/Economy effect ownership.
- `css-src/63-v7-navigation.css` + `src/ui/navigation/bottom-nav.js`: compact five-slot navigation and Liquid indicator.
- `css-src/64-v7-today.css` through `69-v7-secondary.css`: feature and secondary-surface visual ownership.
- `src/ui/tokens/`: JS token lookup names for features that require measured geometry.
- `src/ui/primitives/`: primitive class vocabulary.
- `docs/v7/component-gallery.html`: browser-verifiable component gallery.

The CSS build now uses an explicit `v7` cascade layer after legacy `components` and before `utilities`, so hidden/a11y utilities continue to win while new V7 ownership does not depend on one giant custom override file.

## Effect/render-cost rule

Ordinary content uses solid Surface. Soft Glass is limited to selected navigation/temporary overlay surfaces and is owned centrally by the effects mode. Full may strengthen a short pointer-local Liquid highlight and temporary Glass; Balanced is the normal phone mode; Economy removes V7 backdrop/filter work. There is no V7 continuous animation, permanent `will-change`, page-wide refraction or `transition: all`.

## Geometry contracts

- Minimum interactive target: `44px` equivalent (`--v7-touch-min`).
- Primary CTA: about `54px` (`--v7-cta-height`).
- Bottom navigation shell: `40px` base height plus safe area; the active capsule is approximately 63 x 32px at the 390px reference viewport.
- Main content target max width: `46rem`.
- Pill controls use one shared radius token; content Surfaces use restrained 14–24px radii rather than universal capsules.

## Theme compatibility

V7 follows the existing `theme.js` palette and `data-theme-mode="light|dark|auto"` contract. `--v7-primary`, on-primary/container roles and neutral Surface roles bridge directly to Material semantic variables instead of owning a second fixed-green palette. Preset, custom seed, Monet, dark/light/auto and reload persistence were browser-tested. A five-page green/light -> custom rose/dark matrix also verifies readable neutral surfaces and independent semantic danger colors.

## Final visual-recovery gate

The repaired 390 x 844 references are the hierarchy source for Today, Workout, Records, Coach and Profile. Each page was implemented and judged separately using reference -> real browser screenshot -> `view_image` -> mismatch ledger -> fix. Full/Balanced/Economy keep page geometry invariant, and secondary UI reuses the same Surface/radius/theme rules without replacing existing business behavior.


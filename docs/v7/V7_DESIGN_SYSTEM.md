# Rehab V7 Design System

## Visual direction

V7 treats Rehab as a health-training tool rather than a showcase for Glass. The dominant visual system is stable neutral Surface, calm health green, restrained information blue, small amounts of warm warning orange and recovery/stretch purple, near-black primary text and cool gray secondary text.

The accepted five V7 visual references remain the hierarchy reference. They do not override V6 business functions or real data.

## Source ownership

- `css-src/60-v7-tokens.css`: semantic color, type, spacing, radius, elevation, motion, touch/icon and navigation/CTA geometry.
- `css-src/61-v7-primitives.css`: Phase 3 Surface, Button, Chip, Field, List Row, Tabs, Modal, Sheet and low-cost placeholders for SoftGlass/LiquidControl.
- `src/ui/tokens/`: JS token lookup names for features that require measured geometry.
- `src/ui/primitives/`: primitive class vocabulary.
- `docs/v7/component-gallery.html`: browser-verifiable component gallery.

The CSS build now uses an explicit `v7` cascade layer after legacy `components` and before `utilities`, so hidden/a11y utilities continue to win while new V7 ownership does not depend on one giant custom override file.

## Phase 3 render-cost rule

SoftGlass and LiquidControl are only geometry/semantic placeholders in Phase 3. Their stylesheet contains no `backdrop-filter`, continuous animation, permanent `will-change`, or `transition: all`. Real effect ownership begins in Phase 4 and is subject to a viewport budget.

## Geometry contracts

- Minimum interactive target: `44px` equivalent (`--v7-touch-min`).
- Primary CTA: `56px` height.
- Bottom navigation shell: `68px` base height plus safe area in the navigation phase.
- Main content target max width: `46rem`.
- Pill controls use one shared radius token; content Surfaces use restrained 14–24px radii rather than universal capsules.

## Theme compatibility

V7 follows the existing `data-theme-mode="light|dark|auto"` contract. Explicit dark mode and system dark mode receive V7 semantic token overrides; no new theme persistence key is introduced.


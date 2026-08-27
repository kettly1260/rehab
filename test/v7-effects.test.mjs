import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveEffectsMode } from '../src/ui/effects/index.js';

const css = await readFile(new URL('../css-src/62-v7-effects.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../src/ui/effects/index.js', import.meta.url), 'utf8');

test('effect mode resolves to economy for reduced motion and Save-Data', () => {
    assert.equal(resolveEffectsMode({}), 'balanced');
    assert.equal(resolveEffectsMode({ reducedMotion: true }), 'economy');
    assert.equal(resolveEffectsMode({ saveData: true }), 'economy');
    assert.equal(resolveEffectsMode({ storedMode: 'economy' }), 'economy');
});

test('V7 effects avoid continuous expensive animation contracts', () => {
    assert.doesNotMatch(css, /animation\s*:/i);
    assert.doesNotMatch(css, /transition\s*:\s*all\b/i);
    assert.doesNotMatch(js, /requestAnimationFrame|setInterval/);
    assert.match(css, /\[data-v7-effects="economy"\][\s\S]*backdrop-filter:\s*none/i);
});

test('will-change is interaction-scoped', () => {
    const matches = css.match(/will-change\s*:/g) || [];
    assert.equal(matches.length, 1);
    assert.match(css, /\[data-v7-interacting="true"\][\s\S]*will-change:\s*transform/);
});

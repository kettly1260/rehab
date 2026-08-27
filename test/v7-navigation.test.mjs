import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css-src/63-v7-navigation.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../src/ui/navigation/bottom-nav.js', import.meta.url), 'utf8');

test('V7 bottom navigation uses five-item floating geometry and safe area', () => {
    assert.match(css, /repeat\(5,/);
    assert.match(css, /env\(safe-area-inset-bottom\)/);
    assert.match(css, /v7-bottom-nav__indicator/);
    assert.match(js, /'today', 'workout', 'records', 'ai-coach', 'profile'/);
});

test('V7 bottom navigation has no blur or continuous animation', () => {
    assert.match(css, /backdrop-filter:\s*none/);
    assert.doesNotMatch(css, /animation\s*:/i);
    assert.doesNotMatch(css, /transition\s*:\s*all\b/i);
    assert.doesNotMatch(js, /requestAnimationFrame|setInterval/);
});

test('V7 bottom navigation includes keyboard roving focus keys', () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.match(js, new RegExp(key));
});

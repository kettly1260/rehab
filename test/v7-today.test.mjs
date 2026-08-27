import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css-src/64-v7-today.css', import.meta.url), 'utf8');
const feature = await readFile(new URL('../src/features/today/index.js', import.meta.url), 'utf8');

test('V7 Today keeps ordinary cards on stable Surface', () => {
    assert.match(css, /#today[\s\S]*\.glass-card[\s\S]*backdrop-filter:\s*none/i);
    assert.match(css, /\.hero-motion-aura[\s\S]*display:\s*none/i);
    assert.doesNotMatch(css, /animation\s*:/i);
    assert.doesNotMatch(css, /transition\s*:\s*all\b/i);
});

test('V7 Today reserves Liquid behavior for one plan CTA', () => {
    assert.match(feature, /\.plan-actions \.md-btn-filled/);
    assert.match(feature, /data-v7-liquid/);
    assert.doesNotMatch(feature, /requestAnimationFrame|setInterval/);
});

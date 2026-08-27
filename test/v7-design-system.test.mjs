import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const tokens = await readFile(new URL('../css-src/60-v7-tokens.css', import.meta.url), 'utf8');
const primitives = await readFile(new URL('../css-src/61-v7-primitives.css', import.meta.url), 'utf8');
const gallery = await readFile(new URL('../docs/v7/component-gallery.html', import.meta.url), 'utf8');

test('V7 tokens include semantic palette, geometry, typography and motion', () => {
    for (const token of ['--v7-bg', '--v7-surface', '--v7-primary', '--v7-info', '--v7-warning', '--v7-stretch', '--v7-text', '--v7-text-muted', '--v7-space-4', '--v7-radius-lg', '--v7-shadow-1', '--v7-motion-normal', '--v7-icon-md', '--v7-nav-height', '--v7-cta-height']) {
        assert.ok(tokens.includes(token), `missing ${token}`);
    }
});

test('Phase 3 primitives are static surfaces without Glass render cost', () => {
    assert.doesNotMatch(primitives, /backdrop-filter/i);
    assert.doesNotMatch(primitives, /transition\s*:\s*all\b/i);
    assert.doesNotMatch(primitives, /animation\s*:/i);
    assert.doesNotMatch(primitives, /will-change\s*:/i);
});

test('Component Gallery covers the taskbook primitive set', () => {
    for (const label of ['Button', 'Chip', 'Field', 'List Row', 'Tabs', 'Surface', 'SoftGlass', 'LiquidControl', 'BottomNav', 'Modal', 'Sheet']) {
        assert.match(gallery, new RegExp(label));
    }
});

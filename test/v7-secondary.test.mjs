// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveKeyboardInset } from '../src/ui/primitives/secondary-surfaces.js';

const controllerSource = readFileSync(new URL('../src/ui/primitives/secondary-surfaces.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../css-src/69-v7-secondary.css', import.meta.url), 'utf8');
const bootstrapSource = readFileSync(new URL('../src/app/bootstrap.js', import.meta.url), 'utf8');
const swSource = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('V7 secondary owner covers modal, sheet, picker, manager, preview and status surfaces', () => {
    for (const token of ['md-modal', 'md-modal-overlay', 'ai-provider-manager', 'advice-attachment-preview', 'app-update-banner', 'app-toast', 'skeleton', 'empty-state', 'advice-error', 'ai-offline-note']) {
        assert.match(controllerSource, new RegExp(token));
    }
    assert.match(controllerSource, /dataset\?\.v7SecondaryState === 'permission'/);
    assert.match(bootstrapSource, /createSecondarySurfaceController/);
    assert.match(swSource, /src\/ui\/primitives\/secondary-surfaces\.js\?v=/);
});

test('V7 secondary owner provides body lock and virtual keyboard state without replacing close semantics', () => {
    assert.equal(resolveKeyboardInset(844, 844), 0);
    assert.equal(resolveKeyboardInset(844, 760), 0);
    assert.equal(resolveKeyboardInset(844, 500), 344);
    assert.match(controllerSource, /body\.style\.overflow = 'hidden'/);
    assert.match(controllerSource, /previousBodyOverflow/);
    assert.match(controllerSource, /visualViewport\?\.addEventListener/);
    assert.doesNotMatch(controllerSource, /navStack\.(push|open|close|requestClose)/);
});

test('V7 secondary styling removes idle blur and continuous animation from shared surfaces', () => {
    assert.match(cssSource, /\.v7-secondary-surface/);
    assert.match(cssSource, /\.md-modal-card/);
    assert.match(cssSource, /\.app-update-banner/);
    assert.match(cssSource, /\.advice-attachment-preview-card/);
    assert.match(cssSource, /\.skeleton[\s\S]*animation:\s*none/);
    assert.doesNotMatch(cssSource, /backdrop-filter:\s*blur/);
    assert.doesNotMatch(cssSource, /animation\s*:[^;]*\binfinite\b/);
    assert.doesNotMatch(cssSource, /transition\s*:\s*all/);
    assert.doesNotMatch(cssSource, /will-change/);
});

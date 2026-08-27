import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadUiState() {
  const code = readFileSync(new URL('../data-ui-state.js', import.meta.url), 'utf8');
  const sandbox = { window: {}, console, document: {
    getElementById() { return null; },
    querySelectorAll() { return []; }
  }, clearTimeout, setTimeout };
  vm.runInNewContext(code, sandbox);
  return sandbox.window.dataUiState;
}

const css38 = readFileSync(new URL('../css-src/38-record-page.css', import.meta.url), 'utf8');
const css53 = readFileSync(new URL('../css-src/53-v6-records.css', import.meta.url), 'utf8');
const src = readFileSync(new URL('../data-ui-state.js', import.meta.url), 'utf8');

test('V7 records host renders only the active page', () => {
  const api = loadUiState();
  const ctx = {
    ...api,
    healthView: 'weight',
    healthViewOrder() { return ['diet', 'weight', 'training', 'calendar']; },
    renderHealthViewByKey(view) { return `<div class="md-card">${view}</div>`; }
  };
  const html = api.renderHealthSwipeDeck.call(ctx);
  assert.equal([...html.matchAll(/class="health-swipe-page/g)].length, 1);
  assert.match(html, /data-v7-single-view="true"/);
  assert.match(html, /data-health-page="weight"[^>]*data-health-active="true"/);
  assert.doesNotMatch(html, /onscroll=/);
});

test('V7 tab switch rebuilds one active view instead of retaining a hidden deck', () => {
  assert.match(src, /data-v7-single-view="true"/);
  assert.match(src, /if \(!deck \|\| deck\.dataset\.v7SingleView === 'true'\)/);
  assert.match(src, /this\.renderRecordsPage\(\);/);
});

test('V7 records surfaces avoid idle paint cost', () => {
  const css66 = readFileSync(new URL('../css-src/66-v7-records.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css66, /backdrop-filter:\s*blur/);
  assert.doesNotMatch(css66, /animation\s*:[^;]*\binfinite\b/);
  assert.doesNotMatch(css66, /transition\s*:\s*all/);
  assert.match(css66, /\.health-swipe-deck\.v7-records-view-host[\s\S]*overflow:\s*visible/);
  assert.match(css66, /\.weight-chart-wrap[\s\S]*touch-action:\s*pan-y/);
  assert.doesNotMatch(css66, /will-change:\s*transform/);
  assert.doesNotMatch(css38, /\.health-swipe-deck\s*\{[^}]*will-change/);
  assert.doesNotMatch(css53, /\.health-swipe-deck\s*\{[^}]*will-change/);
});

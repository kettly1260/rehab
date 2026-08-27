import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const featureSource = readFileSync(new URL('../src/features/coach/index.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../css-src/67-v7-coach.css', import.meta.url), 'utf8');
const panelSource = readFileSync(new URL('../advice-panel.js', import.meta.url), 'utf8');
const streamSource = readFileSync(new URL('../advice-stream-renderer.js', import.meta.url), 'utf8');

test('V7 Coach owns the route while preserving legacy AI services', async () => {
    const { coachFeature } = await import('../src/features/coach/index.js');
    assert.equal(coachFeature.id, 'ai-coach');
    assert.doesNotMatch(featureSource, /createLegacyShellFeature/);
    assert.match(featureSource, /renderAiCoachPage/);
    assert.doesNotMatch(featureSource, /\.abort\(/);
});

test('Coach route cleanup releases visual runtime without aborting transport', () => {
    assert.match(featureSource, /unbindCoachScrollRuntime/);
    assert.match(panelSource, /removeEventListener\('scroll'/);
    assert.match(streamSource, /state\.destroyed = true/);
    assert.match(featureSource, /_adviceVirtualController\?\.destroy/);
    assert.match(featureSource, /_activeStreamRenderer = null/);
});

test('Coach V7 surfaces keep bubbles solid and glass limited to selected controls', () => {
    assert.match(cssSource, /\.v7-feature-coach/);
    assert.match(cssSource, /\.advice-bubble/);
    assert.match(cssSource, /\.v7-coach-selected-control/);
    assert.doesNotMatch(cssSource, /backdrop-filter:\s*blur/);
    assert.doesNotMatch(cssSource, /animation\s*:[^;]*\binfinite\b/);
    assert.doesNotMatch(cssSource, /transition\s*:\s*all/);
    assert.doesNotMatch(cssSource, /will-change/);
});

test('Coach feature mount restores route bindings and cleans them on exit', async () => {
    const { coachFeature } = await import('../src/features/coach/index.js');
    const classes = new Set();
    const root = {
        dataset: {},
        classList: {
            add(...names) { names.forEach((name) => classes.add(name)); },
            remove(...names) { names.forEach((name) => classes.delete(name)); }
        },
        querySelectorAll() { return []; },
        addEventListener() {},
        removeEventListener() {}
    };
    let rendered = 0;
    let unbound = 0;
    let rendererDestroyed = 0;
    let virtualDestroyed = 0;
    const data = {
        renderAiCoachPage() { rendered += 1; },
        captureAdviceDraft() {},
        captureAdviceScroll() {},
        autoResizeAdvicePrompt() {},
        bindAdviceAttachmentControls() {},
        updateAdviceSendState() {},
        refreshAdviceSearchResults() {},
        bindAdviceScrollListener() {},
        restoreAdviceScroll() {},
        _adviceScrollEl: { removeEventListener() { unbound += 1; } },
        _streamRenderers: { active: { destroy() { rendererDestroyed += 1; } } },
        _adviceVirtualController: { destroy() { virtualDestroyed += 1; } }
    };
    const document = { getElementById: (id) => id === 'ai-coach' ? root : null };
    const host = {
        document,
        data,
        advicePanel: {
            attach() {}
        },
        addEventListener() {},
        removeEventListener() {},
        setTimeout,
        clearTimeout,
        requestAnimationFrame(fn) { fn(); return 1; },
        cancelAnimationFrame() {},
        MutationObserver: class { observe() {} disconnect() {} }
    };
    document.defaultView = host;
    const scope = {
        disposed: false,
        listen() {},
        observe(observer, target, options) { observer.observe(target, options); },
        raf(fn) { fn(); },
        add(disposer) { this.disposer = disposer; return disposer; }
    };
    const cleanup = await coachFeature.mount({ context: { document, legacy: { getData: () => data } }, scope });
    assert.equal(rendered, 1);
    assert.equal(root.dataset.v7Mounted, 'true');
    assert.equal(classes.has('v7-feature-coach'), true);
    cleanup();
    assert.ok(unbound >= 1);
    assert.equal(rendererDestroyed, 1);
    assert.equal(virtualDestroyed, 1);
    assert.equal(root.dataset.v7Mounted, 'false');
});

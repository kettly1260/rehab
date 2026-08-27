import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const featureSource = readFileSync(new URL('../src/features/records/index.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../css-src/66-v7-records.css', import.meta.url), 'utf8');
const dataViewsSource = readFileSync(new URL('../data-views.js', import.meta.url), 'utf8');
const weightSource = readFileSync(new URL('../health-weight.js', import.meta.url), 'utf8');

test('V7 Records feature owns the route and preserves the legacy data adapter', async () => {
    const module = await import('../src/features/records/index.js');
    assert.equal(module.recordsFeature.id, 'records');
    assert.equal(module.resolveRecordsView({ healthView: 'weight' }), 'weight');
    assert.equal(module.resolveRecordsView({ healthView: 'unknown' }), 'diet');
    assert.doesNotMatch(featureSource, /createLegacyShellFeature/);
    assert.match(featureSource, /renderRecordsPage/);
    assert.match(featureSource, /cancelRecordsChartRuntime/);
});

test('Records renders a single active subview and rebinding only occurs for weight', () => {
    assert.match(dataViewsSource, /this\.syncHealthSwipeActive\(\)/);
    assert.match(dataViewsSource, /this\.healthView === 'weight'\) this\.scheduleWeightChartPinchBinding/);
    assert.match(weightSource, /_p/);
    assert.match(featureSource, /removeEventListener/);
});

test('Records visual owner uses stable surfaces and bounded chart interaction', () => {
    assert.match(cssSource, /\.v7-feature-records/);
    assert.match(cssSource, /\.v7-records-segmented/);
    assert.match(cssSource, /\.v7-records-surface/);
    assert.doesNotMatch(cssSource, /backdrop-filter:\s*blur/);
    assert.doesNotMatch(cssSource, /animation\s*:[^;]*\binfinite\b/);
    assert.doesNotMatch(cssSource, /transition\s*:\s*all/);
});

test('Records feature mount releases chart handlers and timers', async () => {
    const { recordsFeature } = await import('../src/features/records/index.js');
    const root = {
        classList: { add() {}, remove() {} },
        dataset: {},
        querySelectorAll() { return []; }
    };
    const listeners = new Map();
    const document = { getElementById(id) { return id === 'records' ? root : null; } };
    const host = {
        document,
        setTimeout,
        clearTimeout,
        requestAnimationFrame(fn) { return setTimeout(fn, 0); },
        cancelAnimationFrame(id) { clearTimeout(id); },
        MutationObserver: class { observe() {} disconnect() {} },
        data: {
            healthView: 'diet',
            ensureHealthViewCss() {},
            renderRecordsPage() {},
            clearWeightChartPinch() {}
        }
    };
    document.defaultView = host;
    root.addEventListener = (type, handler) => listeners.set(type, handler);
    root.removeEventListener = (type) => listeners.delete(type);
    const context = { document, legacy: { getData: () => host.data } };
    const scope = {
        disposed: false,
        listen(target, type, handler) { target.addEventListener(type, handler); return () => target.removeEventListener(type, handler); },
        observe(observer, target, options) { observer.observe(target, options); return () => observer.disconnect(); },
        add(disposer) { this.disposer = disposer; return disposer; }
    };
    const cleanup = await recordsFeature.mount.call(recordsFeature, { context, scope });
    assert.equal(root.dataset.v7Mounted, 'true');
    cleanup();
    assert.equal(root.dataset.v7Mounted, 'false');
    assert.equal(host.data._healthDeckScrollTimer, 0);
});

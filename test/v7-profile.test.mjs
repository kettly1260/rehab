import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { profileFeature, resolveProfileView } from '../src/features/profile/index.js';

const featureSource = readFileSync(new URL('../src/features/profile/index.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../css-src/68-v7-profile.css', import.meta.url), 'utf8');
const profileSource = readFileSync(new URL('../routine-library.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('V7 Profile owns every existing nested profile view', () => {
    for (const view of ['home', 'library', 'weightloss', 'ai', 'sync', 'experiments']) {
        assert.equal(resolveProfileView({ routineView: view }), view);
    }
    assert.equal(resolveProfileView({ routineView: 'unknown' }), 'home');
    assert.equal(profileFeature.id, 'profile');
    assert.doesNotMatch(featureSource, /createLegacyShellFeature/);
    assert.match(featureSource, /renderProfilePage/);
});

test('Profile home keeps health, goals, library, AI, sync, voice, appearance and diagnostics reachable', () => {
    for (const label of ['健康档案', 'AI 设置', '云端同步', '实验功能', '目标 &amp; 体型', '方案 / 动作库', '语音', '外观与偏好', '调试工具']) {
        assert.match(profileSource, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(indexSource, /profile: \[[^\]]*'health-profile'/);
    assert.match(indexSource, /profile: \['42-health-profile'\]/);
});

test('Profile V7 styling uses stable tool surfaces without persistent blur or animation', () => {
    assert.match(cssSource, /\.v7-feature-profile/);
    assert.match(cssSource, /\.v7-profile-setting-row/);
    assert.match(cssSource, /\.v7-profile-surface/);
    assert.doesNotMatch(cssSource, /backdrop-filter:\s*blur/);
    assert.doesNotMatch(cssSource, /animation\s*:[^;]*\binfinite\b/);
    assert.doesNotMatch(cssSource, /transition\s*:\s*all/);
    assert.doesNotMatch(cssSource, /will-change/);
});

test('Profile mount renders through the legacy data adapter and releases route timers', async () => {
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
    let reset = 0;
    const data = {
        routineView: 'library',
        renderProfilePage() { rendered += 1; },
        resetProfileSwipe() { reset += 1; },
        syncExperimentSettingsUi() {},
        refreshSwCacheName() {},
        syncRoutineSubpageNav() {},
        _routineViewAnimationTimer: 1,
        _libraryDeckScrollTimer: 2,
        _libraryDeckScrollFrame: 3
    };
    const document = { getElementById: (id) => id === 'profile' ? root : null };
    const host = {
        document,
        data,
        addEventListener() {},
        removeEventListener() {},
        setTimeout,
        clearTimeout() {},
        requestAnimationFrame(fn) { fn(); return 4; },
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
    const cleanup = await profileFeature.mount({ context: { document, legacy: { getData: () => data } }, scope });
    assert.equal(rendered, 1);
    assert.equal(root.dataset.v7ProfileView, 'library');
    assert.equal(classes.has('v7-feature-profile'), true);
    cleanup();
    assert.equal(reset, 1);
    assert.equal(data._routineViewAnimationTimer, 0);
    assert.equal(data._libraryDeckScrollTimer, 0);
    assert.equal(data._libraryDeckScrollFrame, 0);
    assert.equal(root.dataset.v7Mounted, 'false');
});

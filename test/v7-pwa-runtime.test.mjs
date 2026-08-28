// @ts-nocheck
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pwaSource = fs.readFileSync(path.join(root, 'pwa-support.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

function toPosix(filePath) {
    return filePath.replaceAll('\\', '/');
}

function collectModuleGraph(entry) {
    const pending = [entry];
    const collected = new Set();
    while (pending.length) {
        const relative = pending.pop();
        if (collected.has(relative)) continue;
        collected.add(relative);
        const source = fs.readFileSync(path.join(root, relative), 'utf8');
        for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
            if (!match[1].startsWith('.')) continue;
            const resolved = toPosix(path.normalize(path.join(path.dirname(relative), match[1])));
            if (resolved.startsWith('src/')) pending.push(resolved);
        }
    }
    return collected;
}

function createClassList(initial = []) {
    const names = new Set(initial);
    return {
        contains: (name) => names.has(name),
        toggle(name, force) {
            if (force === true) names.add(name);
            else if (force === false) names.delete(name);
            else if (names.has(name)) names.delete(name);
            else names.add(name);
        }
    };
}

function createInstallHarness({ prompt, standalone = false } = {}) {
    const listeners = new Map();
    const attributes = new Map();
    const banner = {
        classList: createClassList(['hidden']),
        setAttribute: (name, value) => attributes.set(name, value)
    };
    const window = {
        __rehabInstallPrompt: prompt || null,
        addEventListener(type, listener) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(listener);
        },
        removeEventListener(type, listener) {
            listeners.get(type)?.delete(listener);
        },
        matchMedia: () => ({ matches: standalone })
    };
    const context = {
        window,
        document: {
            getElementById: (id) => id === 'appInstallBanner' ? banner : null,
            querySelectorAll: () => []
        },
        navigator: { standalone },
        location: { search: '' },
        URLSearchParams,
        console
    };
    vm.runInNewContext(pwaSource, context, { filename: 'pwa-support.js' });
    return {
        api: window.pwaSupport,
        banner,
        attributes,
        dispatch(type) {
            for (const listener of listeners.get(type) || []) listener({ type });
        }
    };
}

test('V7 PWA precache contains the complete ESM bootstrap graph', () => {
    const version = sw.match(/training-assistant-v(\d+)/)?.[1];
    assert.ok(version);
    const graph = collectModuleGraph('src/app/bootstrap.js');
    assert.ok(sw.includes(`'src/app/bootstrap.js?v=${version}'`));
    for (const modulePath of graph) {
        if (modulePath === 'src/app/bootstrap.js') continue;
        assert.ok(sw.includes(`'${modulePath}'`), `missing V7 offline module: ${modulePath}`);
    }
});

test('PWA install bridge is captured early and pwa-support stays deferred', () => {
    assert.match(html, /beforeinstallprompt/);
    assert.match(html, /window\.__rehabInstallPrompt\s*=\s*event/);
    assert.match(html, /loadScript\('pwa-support'\)/);
    assert.match(html, /id="appInstallBanner"[^>]*app-install-banner/);
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.scope, './');
});

test('install prompt shows the V7 banner and is consumed only by explicit apply', async () => {
    let promptCalls = 0;
    const prompt = {
        async prompt() { promptCalls += 1; },
        userChoice: Promise.resolve({ outcome: 'accepted' })
    };
    const harness = createInstallHarness({ prompt });
    assert.equal(harness.banner.classList.contains('hidden'), false);
    assert.equal(harness.attributes.get('aria-hidden'), 'false');
    assert.equal(promptCalls, 0);
    assert.equal(await harness.api.install(), true);
    assert.equal(promptCalls, 1);
    assert.equal(harness.banner.classList.contains('hidden'), true);
    assert.equal(harness.attributes.get('aria-hidden'), 'true');
});

test('standalone and dismissed installs keep the banner hidden', () => {
    const prompt = { prompt() {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) };
    const standalone = createInstallHarness({ prompt, standalone: true });
    assert.equal(standalone.banner.classList.contains('hidden'), true);

    const browser = createInstallHarness({ prompt });
    browser.api.dismissInstall();
    browser.dispatch('rehab:install-prompt');
    assert.equal(browser.banner.classList.contains('hidden'), true);
});

import assert from 'node:assert/strict';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { launchAuditBrowser } from './helpers/browser-launch.mjs';

/* global theme */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '../../..');
const evidenceRoot = path.join(root, '.tmp', 'v7-nav');

async function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            server.close(() => resolve(port));
        });
    });
}

function mimeFor(file) {
    if (file.endsWith('.html')) return 'text/html; charset=utf-8';
    if (file.endsWith('.js') || file.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
    if (file.endsWith('.css')) return 'text/css; charset=utf-8';
    if (file.endsWith('.json') || file.endsWith('.webmanifest')) return 'application/json; charset=utf-8';
    if (file.endsWith('.svg')) return 'image/svg+xml';
    if (file.endsWith('.png')) return 'image/png';
    if (file.endsWith('.woff2')) return 'font/woff2';
    return 'application/octet-stream';
}

async function startServer() {
    const server = createServer(async (req, res) => {
        try {
            const rawUrl = new URL(req.url || '/', 'http://127.0.0.1');
            const pathname = decodeURIComponent(rawUrl.pathname === '/' ? '/index.html' : rawUrl.pathname);
            const resolved = path.resolve(root, `.${pathname}`);
            if (!resolved.startsWith(root)) throw new Error('forbidden');
            const info = await stat(resolved);
            if (!info.isFile()) throw new Error('not found');
            res.writeHead(200, { 'content-type': mimeFor(resolved), 'cache-control': 'no-store' });
            createReadStream(resolved).pipe(res);
        } catch {
            res.writeHead(404);
            res.end('Not found');
        }
    });
    const port = await freePort();
    await new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(undefined)));
    return { server, base: `http://127.0.0.1:${port}` };
}

function loadPlaywright() {
    const candidates = [path.join(root, 'node_modules', 'playwright', 'package.json'), path.join(repoRoot, 'node_modules', 'playwright', 'package.json')];
    for (const pkg of candidates) {
        if (!existsSync(pkg)) continue;
        return createRequire(pkg)('playwright');
    }
    return createRequire(path.join(root, 'package.json'))('playwright');
}

async function geometry(page) {
    await page.waitForTimeout(260);
    return page.evaluate(() => {
        const nav = /** @type {HTMLElement|null} */ (document.querySelector('.md-nav-rail.v7-bottom-nav'));
        const indicator = /** @type {HTMLElement|null} */ (document.querySelector('.v7-bottom-nav__indicator'));
        const icons = [...document.querySelectorAll('.v7-bottom-nav .material-symbols-rounded')];
        const labels = [...document.querySelectorAll('.v7-bottom-nav small')];
        if (!nav || !indicator) return null;
        const navRect = nav.getBoundingClientRect();
        const indicatorRect = indicator.getBoundingClientRect();
        const navStyle = getComputedStyle(nav);
        const indicatorStyle = getComputedStyle(indicator);
        return {
            nav: { x: navRect.x, y: navRect.y, width: navRect.width, height: navRect.height, bottom: innerHeight - navRect.bottom },
            indicator: { x: indicatorRect.x, y: indicatorRect.y, width: indicatorRect.width, height: indicatorRect.height },
            navBg: navStyle.backgroundColor,
            backdrop: navStyle.backdropFilter,
            opacity: navStyle.opacity,
            pointerEvents: navStyle.pointerEvents,
            indicatorBg: indicatorStyle.backgroundColor,
            interacting: indicator.dataset.v7Interacting || '',
            index: nav.style.getPropertyValue('--v7-nav-index'),
            iconDisplays: icons.map((icon) => getComputedStyle(icon).display),
            labels: labels.map((label) => label.textContent?.trim() || '')
        };
    });
}

test('V7 bottom navigation matches compact reference geometry and interaction states', async () => {
    await mkdir(evidenceRoot, { recursive: true });
    const http = await startServer();
    const pw = loadPlaywright();
    const { browser } = await launchAuditBrowser(pw.chromium);
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(`${http.base}/index.html#/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => (/** @type {any} */ (window)).rehabV7?.lifecycle?.activeId === 'today', null, { timeout: 45000 });

        const initial = await geometry(page);
        assert.ok(initial);
        assert.ok(initial.nav.x >= 17 && initial.nav.x <= 19, `nav x=${initial.nav.x}`);
        assert.ok(initial.nav.width >= 352 && initial.nav.width <= 356, `nav width=${initial.nav.width}`);
        assert.ok(initial.nav.height >= 38 && initial.nav.height <= 42, `nav height=${initial.nav.height}`);
        assert.ok(initial.nav.bottom >= 4 && initial.nav.bottom <= 12, `nav bottom=${initial.nav.bottom}`);
        assert.ok(initial.indicator.width >= 58 && initial.indicator.width <= 66, `indicator width=${initial.indicator.width}`);
        assert.ok(initial.indicator.height >= 28 && initial.indicator.height <= 34, `indicator height=${initial.indicator.height}`);
        assert.ok(initial.iconDisplays.every((display) => display === 'none'));
        assert.deepEqual(initial.labels, ['今日', '训练', '记录', '教练', '我的']);

        await page.evaluate(() => {
            const runtime = (/** @type {any} */ (window)).rehabV7;
            for (const route of ['workout', 'records', 'ai-coach', 'profile', 'today']) runtime.bottomNavigation.update(route);
        });
        const afterRapid = await geometry(page);
        assert.equal(afterRapid.index, '0');

        await page.evaluate(() => (/** @type {any} */ (window)).rehabV7.bottomNavigation.update('records'));
        const recordsPosition = await geometry(page);
        assert.ok(recordsPosition.indicator.x >= 158 && recordsPosition.indicator.x <= 164, `records indicator x=${recordsPosition.indicator.x}`);
        await page.evaluate(() => (/** @type {any} */ (window)).rehabV7.bottomNavigation.update('today'));

        await page.evaluate(() => theme.setPreset('green'));
        const green = await geometry(page);
        await page.evaluate(() => theme.setPreset('purple'));
        const purple = await geometry(page);
        assert.notEqual(green.indicatorBg, purple.indicatorBg);

        await page.evaluate(() => theme.setMode('dark'));
        const dark = await geometry(page);
        await page.evaluate(() => theme.setMode('light'));
        const light = await geometry(page);
        assert.notEqual(dark.navBg, light.navBg);

        await page.evaluate(() => (/** @type {any} */ (window)).rehabV7.effects.setMode('balanced'));
        const balanced = await geometry(page);
        assert.notEqual(balanced.backdrop, 'none');
        await page.evaluate(() => (/** @type {any} */ (window)).rehabV7.effects.setMode('economy'));
        const economy = await geometry(page);
        assert.equal(economy.backdrop, 'none');
        await page.evaluate(() => { document.documentElement.dataset.v7Effects = 'full'; });
        const full = await geometry(page);
        assert.notEqual(full.backdrop, 'none');

        const active = page.locator('.v7-bottom-nav .nav-item[data-v7-page="today"]');
        await active.dispatchEvent('pointerdown', { pointerId: 17, clientX: 50, clientY: 820, bubbles: true });
        const pressed = await geometry(page);
        assert.equal(pressed.interacting, 'true');
        await active.dispatchEvent('pointercancel', { pointerId: 17, clientX: 50, clientY: 820, bubbles: true });
        const cancelled = await geometry(page);
        assert.equal(cancelled.interacting, 'false');

        const keyboard = await page.evaluate(() => {
            document.documentElement.dataset.v7Keyboard = 'visible';
            const nav = /** @type {HTMLElement|null} */ (document.querySelector('.md-nav-rail.v7-bottom-nav'));
            const style = nav ? getComputedStyle(nav) : null;
            return { pointerEvents: style?.pointerEvents || '', opacity: style?.opacity || '' };
        });
        assert.equal(keyboard.pointerEvents, 'none');
        await page.evaluate(() => {
            document.documentElement.dataset.v7Keyboard = 'hidden';
            document.documentElement.dataset.v7Effects = 'balanced';
            theme.setPreset('green');
            theme.setMode('light');
        });

        await page.screenshot({ path: path.join(evidenceRoot, 'nav-390x844.png'), fullPage: false });
        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

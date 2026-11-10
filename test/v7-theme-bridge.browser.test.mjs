import assert from 'node:assert/strict';
import { createReadStream, existsSync } from 'node:fs';
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
            const { stat } = await import('node:fs/promises');
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

async function snapshot(page) {
    await page.waitForTimeout(450);
    return page.evaluate(() => {
        const rootElement = document.documentElement;
        const styles = getComputedStyle(rootElement);
        const indicator = document.querySelector('.v7-bottom-nav__indicator');
        const cta = document.querySelector('.v7-today-primary-cta');
        return {
            mdPrimary: styles.getPropertyValue('--md-sys-primary').trim(),
            v7Primary: styles.getPropertyValue('--v7-primary').trim(),
            v7Soft: styles.getPropertyValue('--v7-primary-soft').trim(),
            mode: rootElement.getAttribute('data-theme-mode'),
            indicatorColor: indicator ? getComputedStyle(indicator).backgroundColor : '',
            ctaColor: cta ? getComputedStyle(cta).backgroundColor : '',
            stored: localStorage.getItem('rehab_pro_theme_cfg') || ''
        };
    });
}

test('V7 semantic accent follows preset, custom seed, color mode and persistence', async () => {
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

        await page.evaluate(() => theme.setPreset('blue'));
        const blue = await snapshot(page);
        await page.evaluate(() => theme.setPreset('purple'));
        const purple = await snapshot(page);
        await page.evaluate(() => theme.setCustom('#d04a7a'));
        const custom = await snapshot(page);

        assert.equal(blue.v7Primary, blue.mdPrimary);
        assert.equal(purple.v7Primary, purple.mdPrimary);
        assert.equal(custom.v7Primary, custom.mdPrimary);
        assert.notEqual(blue.v7Primary, purple.v7Primary);
        assert.notEqual(purple.v7Primary, custom.v7Primary);
        assert.notEqual(blue.indicatorColor, purple.indicatorColor);
        assert.notEqual(purple.indicatorColor, custom.indicatorColor);
        assert.notEqual(blue.ctaColor, purple.ctaColor);
        assert.notEqual(purple.ctaColor, custom.ctaColor);

        await page.evaluate(() => theme.setMode('dark'));
        const dark = await snapshot(page);
        assert.equal(dark.mode, 'dark');
        assert.equal(dark.v7Primary, dark.mdPrimary);

        await page.evaluate(() => theme.setMode('light'));
        const light = await snapshot(page);
        assert.equal(light.mode, 'light');
        assert.equal(light.v7Primary, light.mdPrimary);
        assert.notEqual(light.v7Primary, dark.v7Primary);

        await page.evaluate(() => theme.setMode('auto'));
        const auto = await snapshot(page);
        assert.equal(auto.mode, 'auto');
        assert.equal(auto.v7Primary, auto.mdPrimary);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (/** @type {any} */ (window)).rehabV7?.lifecycle?.activeId === 'today', null, { timeout: 45000 });
        const reloaded = await snapshot(page);
        assert.equal(reloaded.v7Primary, reloaded.mdPrimary);
        assert.match(reloaded.stored, /d04a7a/i);
        assert.match(reloaded.stored, /"colorMode":"auto"/);
        assert.deepEqual(errors, []);

        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

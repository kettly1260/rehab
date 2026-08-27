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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '../../..');
const evidenceRoot = path.join(root, '.tmp', 'v7-pages');

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

async function withApp(hash, fn) {
    const http = await startServer();
    const pw = loadPlaywright();
    const { browser } = await launchAuditBrowser(pw.chromium);
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(`${http.base}/index.html${hash}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => !!(/** @type {any} */ (window)).rehabV7?.lifecycle?.activeId, null, { timeout: 45000 });
        await fn(page, errors);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
}

test('V7 Today renders real V6 data/function output on restrained surfaces', async () => {
    await mkdir(evidenceRoot, { recursive: true });
    await withApp('#/today', async (page, errors) => {
        await page.waitForFunction(() => document.querySelector('#todayOverview .hero'), null, { timeout: 45000 });
        const state = await page.evaluate(() => {
            const hero = /** @type {HTMLElement} */ (document.querySelector('#todayOverview .hero'));
            const card = /** @type {HTMLElement|null} */ (document.querySelector('#today .glass-card'));
            const aura = /** @type {HTMLElement|null} */ (document.querySelector('#today .hero-motion-aura'));
            return {
                active: (/** @type {any} */ (window)).rehabV7?.lifecycle?.activeId,
                greeting: document.querySelector('.today-v6-greet-line')?.textContent?.trim() || '',
                heroText: hero.textContent?.trim() || '',
                cardBackdrop: card ? getComputedStyle(card).backdropFilter : 'none',
                auraDisplay: aura ? getComputedStyle(aura).display : 'none',
                liquidCtas: document.querySelectorAll('#today .v7-today-primary-cta').length,
                effectAudit: (/** @type {any} */ (window)).rehabV7?.effects?.audit?.(),
                overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
            };
        });
        assert.equal(state.active, 'today');
        assert.ok(state.greeting.length > 0);
        assert.ok(state.heroText.length > 0);
        assert.equal(state.cardBackdrop, 'none');
        assert.equal(state.auraDisplay, 'none');
        assert.ok(state.liquidCtas <= 1);
        assert.equal(state.effectAudit?.withinBudget, true);
        assert.ok(state.overflow <= 1);
        assert.deepEqual(errors, []);
        await page.screenshot({ path: path.join(evidenceRoot, 'today-390x844.png'), fullPage: true });
    });
});


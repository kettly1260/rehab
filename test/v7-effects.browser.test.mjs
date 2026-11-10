// @ts-nocheck
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
const evidenceRoot = path.join(root, '.tmp', 'v7-effects');

async function freePort() {
    return await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
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
            const info = await stat(resolved);
            if (!resolved.startsWith(root) || !info.isFile()) throw new Error('not found');
            res.writeHead(200, { 'content-type': mimeFor(resolved), 'cache-control': 'no-store' });
            createReadStream(resolved).pipe(res);
        } catch {
            res.writeHead(404);
            res.end('Not found');
        }
    });
    const port = await freePort();
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
    return { server, base: `http://127.0.0.1:${port}` };
}

function loadPlaywright() {
    const candidates = [
        path.join(root, 'node_modules', 'playwright', 'package.json'),
        path.join(repoRoot, 'node_modules', 'playwright', 'package.json')
    ];
    for (const pkg of candidates) {
        if (!existsSync(pkg)) continue;
        return createRequire(pkg)('playwright');
    }
    return createRequire(path.join(root, 'package.json'))('playwright');
}

function assertRectNear(actual, expected, name) {
    for (const key of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(actual[key] - expected[key]) <= 1, `${name}.${key}: ${actual[key]} vs ${expected[key]}`);
    }
}

test('V7 Full, Balanced and Economy preserve layout while changing only bounded effects', { timeout: 30000 }, async () => {
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
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'today' && document.querySelector('#today.v7-feature-today'), null, { timeout: 45000 });
        await page.waitForSelector('#today .today-primary-launch.v7-liquid-control');

        const capture = async (mode) => {
            await page.evaluate((next) => window.rehabV7.effects.setMode(next), mode);
            await page.waitForFunction((next) => document.documentElement.dataset.v7Effects === next, mode);
            await page.waitForTimeout(80);
            await page.evaluate(() => {
                const indicator = document.querySelector('.v7-bottom-nav__indicator');
                const cta = document.querySelector('#today .today-primary-launch.v7-liquid-control');
                cta.dataset.v7Interacting = 'true';
                indicator.dataset.v7Interacting = 'true';
            });
            await page.waitForTimeout(260);
            const result = await page.evaluate(() => {
                const nav = document.querySelector('.v7-bottom-nav');
                const indicator = document.querySelector('.v7-bottom-nav__indicator');
                const cta = document.querySelector('#today .today-primary-launch.v7-liquid-control');
                const card = document.querySelector('#today .today-readiness-card');
                const rect = (element) => {
                    const value = element.getBoundingClientRect();
                    return { x: value.x, y: value.y, width: value.width, height: value.height };
                };
                return {
                    mode: document.documentElement.dataset.v7Effects,
                    navRect: rect(nav),
                    indicatorRect: rect(indicator),
                    ctaRect: rect(cta),
                    cardRect: rect(card),
                    navBackdrop: getComputedStyle(nav).backdropFilter,
                    navFilter: getComputedStyle(nav).filter,
                    ctaFilter: getComputedStyle(cta).filter,
                    ctaHighlight: Number(getComputedStyle(cta, '::before').opacity),
                    indicatorHighlight: Number(getComputedStyle(indicator, '::before').opacity),
                    indicatorShadow: getComputedStyle(indicator).boxShadow,
                    audit: window.rehabV7.effects.audit()
                };
            });
            await page.evaluate(() => {
                const indicator = document.querySelector('.v7-bottom-nav__indicator');
                const cta = document.querySelector('#today .today-primary-launch.v7-liquid-control');
                cta.dataset.v7Interacting = 'false';
                indicator.dataset.v7Interacting = 'false';
            });
            await page.waitForTimeout(220);
            result.idleCtaHighlight = await page.evaluate(() => Number(getComputedStyle(document.querySelector('#today .today-primary-launch.v7-liquid-control'), '::before').opacity));
            return result;
        };

        const balanced = await capture('balanced');
        await page.screenshot({ path: path.join(evidenceRoot, 'effects-balanced-390x844.png'), fullPage: true });
        const full = await capture('full');
        await page.screenshot({ path: path.join(evidenceRoot, 'effects-full-390x844.png'), fullPage: true });
        const economy = await capture('economy');
        await page.screenshot({ path: path.join(evidenceRoot, 'effects-economy-390x844.png'), fullPage: true });

        assert.equal(balanced.mode, 'balanced');
        assert.equal(full.mode, 'full');
        assert.equal(economy.mode, 'economy');
        assert.match(balanced.navBackdrop, /blur\(8px\)/);
        assert.match(full.navBackdrop, /blur\(10px\)/);
        assert.equal(economy.navBackdrop, 'none');
        assert.equal(economy.navFilter, 'none');
        assert.equal(economy.ctaFilter, 'none');
        assert.ok(full.ctaHighlight > balanced.ctaHighlight, `${full.ctaHighlight} <= ${balanced.ctaHighlight}`);
        assert.ok(full.indicatorHighlight > balanced.indicatorHighlight, `${full.indicatorHighlight} <= ${balanced.indicatorHighlight}`);
        assert.equal(economy.ctaHighlight, 0);
        assert.equal(economy.indicatorHighlight, 0);
        assert.equal(full.idleCtaHighlight, 0);
        assert.notEqual(full.indicatorShadow, balanced.indicatorShadow);
        for (const result of [balanced, full, economy]) {
            assert.equal(result.audit?.nestedBackdropCandidates, 0);
            assert.ok(result.audit?.visibleBackdropCandidates <= 2);
            assert.equal(result.audit?.withinBudget, true);
        }
        for (const result of [full, economy]) {
            assertRectNear(result.navRect, balanced.navRect, `${result.mode}.nav`);
            assertRectNear(result.indicatorRect, balanced.indicatorRect, `${result.mode}.indicator`);
            assertRectNear(result.ctaRect, balanced.ctaRect, `${result.mode}.cta`);
            assertRectNear(result.cardRect, balanced.cardRect, `${result.mode}.card`);
        }

        await page.evaluate(() => window.rehabV7.effects.setMode('full'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'today');
        assert.equal(await page.evaluate(() => document.documentElement.dataset.v7Effects), 'full');
        await page.evaluate(() => window.rehabV7.effects.setMode('balanced'));
        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

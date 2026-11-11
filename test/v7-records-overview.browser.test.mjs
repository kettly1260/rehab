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

/* global data, theme */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '../../..');
const evidenceRoot = path.join(root, '.tmp', 'v7-records');

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

async function visualSnapshot(page) {
    await page.waitForTimeout(300);
    return page.evaluate(() => {
        const rect = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const box = element.getBoundingClientRect();
            return { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom };
        };
        const line = document.querySelector('.v7-records-trend-line');
        return {
            title: document.querySelector('#records .app-title')?.textContent?.trim() || '',
            overview: document.getElementById('records')?.dataset.v7RecordsOverview,
            summary: rect('.v7-records-summary'),
            trend: rect('.v7-records-trend-card'),
            calendar: rect('.v7-records-calendar-card'),
            recent: rect('.v7-records-recent-card'),
            nav: rect('.md-nav-rail.v7-bottom-nav'),
            trendStroke: line ? getComputedStyle(line).stroke : '',
            rows: document.querySelectorAll('.v7-records-recent-row').length,
            dots: document.querySelectorAll('.v7-records-calendar-days .has-record').length,
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
        };
    });
}

test('V7 Records default route renders overview anatomy and preserves real subviews', async () => {
    await mkdir(evidenceRoot, { recursive: true });
    const http = await startServer();
    const pw = loadPlaywright();
    const { browser } = await launchAuditBrowser(pw.chromium);
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(`${http.base}/index.html#/records`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => (/** @type {any} */ (window)).rehabV7?.lifecycle?.activeId === 'records', null, { timeout: 45000 });

        await page.evaluate(() => {
            theme.setPreset('green');
            theme.setMode('light');
            const today = data.logicalDateKey();
            const dateFrom = (offset) => {
                const base = data.dateFromKey?.(today) || new Date(`${today}T12:00:00`);
                const date = new Date(base.getTime() + offset * 86400000);
                return data.dateKey?.(date) || date.toISOString().slice(0, 10);
            };
            const names = ['肩关节稳定训练', '低强度有氧', '下肢稳定训练', '胸椎活动训练', '全身力量训练'];
            const durations = [1200, 1800, 2100, 1500, 2400];
            (/** @type {any} */ (data.db)).history = names.map((name, index) => ({
                id: `v7-record-${index}`,
                date: dateFrom(index - 4),
                duration: durations[index],
                type: index === 1 ? 'cardio' : 'strength',
                actions: [{ name }],
                cardio: index === 1 ? { calories: 180 } : undefined,
                updatedAt: Date.now() + index
            }));
            data.healthView = 'weight';
            data.renderRecordsPage();
        });
        await page.waitForFunction(() => document.querySelectorAll('.v7-records-recent-row').length === 2, null, { timeout: 10000 });
        const green = await visualSnapshot(page);
        assert.equal(green.title, '训练记录');
        assert.equal(green.overview, 'true');
        assert.ok(green.summary?.height >= 108 && green.summary?.height <= 116, `summary height=${green.summary?.height}`);
        assert.ok(green.trend?.height >= 190 && green.trend?.height <= 198, `trend height=${green.trend?.height}`);
        assert.ok(green.calendar?.height >= 134 && green.calendar?.height <= 142, `calendar height=${green.calendar?.height}`);
        assert.equal(green.rows, 2);
        assert.ok(green.dots >= 5);
        assert.ok(green.overflow <= 1);
        await page.screenshot({ path: path.join(evidenceRoot, 'records-overview-390x844.png'), fullPage: false });

        await page.evaluate(() => theme.setPreset('purple'));
        const purple = await visualSnapshot(page);
        assert.notEqual(purple.trendStroke, green.trendStroke);

        // Verify switching to each subview (especially 'diet' which serializes to #/records)
        // stays on that subview when clicking inside it, and returns to overview only via 总览.
        await page.locator('#records .v7-records-subnav [data-v7-records-view="diet"]').click();
        await page.waitForFunction(() => document.getElementById('records')?.dataset.v7RecordsOverview === 'false' && document.getElementById('records')?.dataset.v7RecordsView === 'diet');
        await page.locator('#records #recordsContent').click({ position: { x: 20, y: 120 } });
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => document.getElementById('records')?.dataset.v7RecordsOverview), 'false');
        assert.equal(await page.evaluate(() => document.getElementById('records')?.dataset.v7RecordsView), 'diet');

        await page.locator('#records .record-tab[data-health-view="weight"]').click();
        await page.waitForFunction(() => document.getElementById('records')?.dataset.v7RecordsView === 'weight');
        assert.equal(await page.evaluate(() => document.getElementById('records')?.dataset.v7RecordsOverview), 'false');

        await page.locator('#records .v7-records-overview-link').click();
        await page.waitForFunction(() => document.getElementById('records')?.dataset.v7RecordsOverview === 'true');
        assert.equal(await page.evaluate(() => document.querySelector('#records .app-title')?.textContent?.trim()), '训练记录');

        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

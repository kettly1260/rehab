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

test('V7 Records owns one active subview and releases chart interaction on route exit', async () => {
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
        await page.waitForFunction(() => document.querySelector('#records.v7-feature-records') && window.rehabV7?.lifecycle?.activeId === 'records', null, { timeout: 45000 });

        await page.evaluate(() => {
            const day = window.data.logicalDateKey();
            const prior = new Date(window.data.dateFromKey(day));
            prior.setDate(prior.getDate() - 1);
            const prior2 = new Date(prior);
            prior2.setDate(prior2.getDate() - 1);
            window.data.db.health.weights = [
                { id: 'v7-w1', date: window.data.dateKey(prior2), weight: 72.4, updatedAt: 1 },
                { id: 'v7-w2', date: window.data.dateKey(prior), weight: 72.0, updatedAt: 2 },
                { id: 'v7-w3', date: day, weight: 71.8, updatedAt: 3 }
            ];
            window.data.db.health.foodLogs = [{ id: 'v7-food', date: day, meal: 'lunch', name: '测试餐', grams: 100, cal: 500, pro: 30, carb: 50, fat: 15, updatedAt: 4 }];
            window.data.db.health.exerciseLogs = [{ id: 'v7-ex', date: day, type: 'walk', minutes: 30, calories: 120, updatedAt: 5 }];
            window.data.db.history = [{
                id: 'v7-history',
                date: `${day} 08:00`,
                duration: 1800,
                type: 'strength',
                actions: [{ name: '深蹲', sets: 3, reps: 8 }],
                actualSets: [{ action: '深蹲', weightKg: 40, reps: 8, rpe: 7 }],
                updatedAt: 6
            }];
            window.data.healthView = 'diet';
            window.data.renderRecordsPage();
        });

        const landing = await page.evaluate(() => ({
            active: window.rehabV7?.lifecycle?.activeId,
            view: document.querySelector('#records')?.dataset.v7RecordsView,
            pages: document.querySelectorAll('#records .health-swipe-page').length,
            tabs: document.querySelectorAll('#records .record-tab').length,
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
            backdrop: getComputedStyle(document.querySelector('#records .stat-tile')).backdropFilter
        }));
        assert.equal(landing.active, 'records');
        assert.equal(landing.view, 'diet');
        assert.equal(landing.pages, 1);
        assert.equal(landing.tabs, 4);
        assert.ok(landing.overflow <= 1);
        assert.equal(landing.backdrop, 'none');

        await page.evaluate(() => window.data.scrollToHealthView('weight'));
        await page.waitForFunction(() => document.querySelector('#records')?.dataset.v7RecordsView === 'weight' && document.querySelector('.weight-chart-wrap[data-pinch-chart]')?._b === true);
        const weight = await page.evaluate(() => ({
            pages: document.querySelectorAll('#records .health-swipe-page').length,
            activePage: document.querySelector('#records .health-swipe-page')?.dataset.healthPage,
            chartPaths: document.querySelectorAll('#records .weight-chart-wrap path').length,
            chartBackdrop: getComputedStyle(document.querySelector('#records .weight-chart-wrap')).backdropFilter,
            reportEntry: !!document.querySelector('#records .weight-report-btn')
        }));
        assert.equal(weight.pages, 1);
        assert.equal(weight.activePage, 'weight');
        assert.ok(weight.chartPaths > 0);
        assert.equal(weight.chartBackdrop, 'none');
        assert.equal(weight.reportEntry, true);

        await page.evaluate(() => window.data.scrollToHealthView('training'));
        await page.waitForFunction(() => document.querySelector('#records .health-swipe-page')?.dataset.healthPage === 'training');
        assert.equal(await page.locator('#records .manual-exercise-card, #records .health-profile-card').count() > 0, true);

        await page.evaluate(() => {
            window.data.scrollToHealthView('calendar');
            window.data.selectCalendarDate(window.data.logicalDateKey());
        });
        await page.waitForFunction(() => document.querySelector('#records .day-detail-card'));
        assert.equal(await page.locator('#records .calendar-card').count(), 1);

        await page.evaluate(() => window.data.openWeeklySummarySheet());
        await page.waitForSelector('#summarySheetOverlay');
        await page.evaluate(() => window.data.closeSummarySheet());
        await page.waitForFunction(() => !document.querySelector('#summarySheetOverlay'));
        assert.equal(await page.locator('#summarySheetOverlay').count(), 0);

        await page.evaluate(() => window.data.scrollToHealthView('weight'));
        await page.waitForFunction(() => document.querySelector('.weight-chart-wrap[data-pinch-chart]')?._b === true);
        await page.evaluate(() => {
            window.__v7RecordsWeightWrap = document.querySelector('.weight-chart-wrap[data-pinch-chart]');
            const nav = [...document.querySelectorAll('.nav-item')].find((item) => item.dataset.v7Page === 'today');
            return window.ui.tab('today', nav);
        });
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'today');
        assert.equal(await page.evaluate(() => window.__v7RecordsWeightWrap?._b === true), false);

        await page.evaluate(async () => {
            const nav = [...document.querySelectorAll('.nav-item')].find((item) => item.dataset.v7Page === 'records');
            await window.ui.tab('records', nav);
        });
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'records');
        await page.waitForTimeout(400);
        await page.evaluate(() => { const root = document.querySelector('#records'); if (root) root.scrollTop = 0; });
        const finalRoute = await page.evaluate(() => ({
            active: window.rehabV7?.lifecycle?.activeId,
            nav: document.querySelector('.nav-item.active')?.dataset.v7Page || ''
        }));
        assert.equal(finalRoute.active, 'records');
        assert.equal(finalRoute.nav, 'records');
        await page.screenshot({ path: path.join(evidenceRoot, 'records-weight-390x844.png'), fullPage: true });
        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

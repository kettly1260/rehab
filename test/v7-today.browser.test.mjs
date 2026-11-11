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
const evidenceRoot = path.join(root, '.tmp', 'v7-today');

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

async function snapshot(page) {
    await page.waitForTimeout(320);
    return page.evaluate(() => {
        const rect = (selector) => {
            const node = /** @type {HTMLElement|null} */ (document.querySelector(selector));
            if (!node) return null;
            const r = node.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
        };
        const cta = /** @type {HTMLElement|null} */ (document.querySelector('.today-primary-launch'));
        const nav = /** @type {HTMLElement|null} */ (document.querySelector('.md-nav-rail.v7-bottom-nav'));
        return {
            readiness: rect('.today-readiness-card'),
            plan: rect('#todayPlanStatus .plan-card'),
            status: rect('.today-status-strip'),
            trend: rect('.today-trend-card'),
            cta: rect('.today-primary-launch'),
            nav: rect('.md-nav-rail.v7-bottom-nav'),
            rings: document.querySelectorAll('#today .rings, #today .ring-train').length,
            planRows: document.querySelectorAll('#today .today-plan-row').length,
            trendSvg: !!document.querySelector('#today .today-trend-chart'),
            ctaText: cta?.textContent?.trim() || '',
            ctaColor: cta ? getComputedStyle(cta).backgroundColor : '',
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
            overlap: cta && nav ? Math.max(0, cta.getBoundingClientRect().bottom - nav.getBoundingClientRect().top) : 0
        };
    });
}

test('V7 Today matches repaired reference hierarchy in empty and populated real-data states', async () => {
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
        await page.evaluate(() => { theme.setPreset('green'); theme.setMode('light'); });

        const empty = await snapshot(page);
        assert.equal(empty.rings, 0);
        assert.ok(empty.readiness && empty.readiness.height >= 145 && empty.readiness.height <= 175);
        assert.ok(empty.plan && empty.plan.height < 180, `empty plan height=${empty.plan?.height}`);
        assert.ok(empty.status && empty.trend && empty.cta && empty.nav);
        assert.ok(empty.overlap <= 1, `empty CTA/nav overlap=${empty.overlap}`);
        assert.ok(empty.overflow <= 1, `empty horizontal overflow=${empty.overflow}`);
        assert.match(empty.ctaText, /创建计划/);
        await page.screenshot({ path: path.join(evidenceRoot, 'today-empty-390x844.png'), fullPage: false });

        await page.evaluate(() => {
            const day = data.logicalDateKey();
            const dateFrom = (offset) => {
                const base = data.dateFromKey?.(day) || new Date(`${day}T12:00:00`);
                const next = new Date(base.getTime() + offset * 86400000);
                return data.dateKey?.(next) || next.toISOString().slice(0, 10);
            };
            const makePlan = (date, index, rates) => ({
                id: `v7-visual-plan-${index}`,
                date,
                type: 'rehab',
                title: index === 6 ? '肩颈恢复 · 轻量训练' : `恢复训练 ${index + 1}`,
                updatedAt: Date.now() + index,
                items: rates.map((done, itemIndex) => ({
                    id: `v7-visual-task-${index}-${itemIndex}`,
                    name: ['肩部活动度', '弹力带划船', '胸椎伸展'][itemIndex] || `动作 ${itemIndex + 1}`,
                    category: itemIndex === 0 ? 'warmup' : itemIndex === 2 ? 'cooldown' : 'main',
                    status: done ? 'done' : 'todo',
                    spec: { sets: itemIndex === 2 ? 2 : 3, reps: itemIndex === 2 ? 0 : 10, work: itemIndex === 2 ? 30 : 0, actionRest: 30 },
                    feedback: done ? { doneAt: Date.now() - (6 - index) * 86400000, painScore: index === 6 ? 1 : 0 } : undefined
                }))
            });
            data.db.dailyPlans = [
                makePlan(dateFrom(-6), 0, [1, 0, 0]),
                makePlan(dateFrom(-5), 1, [1, 1, 0]),
                makePlan(dateFrom(-4), 2, [1, 1, 1]),
                makePlan(dateFrom(-3), 3, [1, 0, 0]),
                makePlan(dateFrom(-2), 4, [1, 1, 0]),
                makePlan(dateFrom(-1), 5, [1, 1, 1]),
                makePlan(day, 6, [1, 0, 0])
            ];
            data.selectedPlanId = 'v7-visual-plan-6';
            const health = /** @type {any} */ (data.db.health);
            health.dietGoal = { ...(health.dietGoal || {}), dailyCal: 1800 };
            health.foodLogs = [
                { id: 'v7-food-1', date: day, name: '早餐', meal: 'breakfast', cal: 420, pro: 28, carb: 48, fat: 12, createdAt: Date.now() },
                { id: 'v7-food-2', date: day, name: '午餐', meal: 'lunch', cal: 510, pro: 36, carb: 55, fat: 18, createdAt: Date.now() + 1 }
            ];
            data.renderTodayPage();
        });
        await page.waitForFunction(() => document.querySelectorAll('#today .today-plan-row').length === 3, null, { timeout: 10000 });
        const populated = await snapshot(page);
        assert.equal(populated.rings, 0);
        assert.equal(populated.planRows, 3);
        assert.equal(populated.trendSvg, true);
        assert.ok(populated.overlap <= 1, `populated CTA/nav overlap=${populated.overlap}`);
        assert.ok(populated.overflow <= 1, `populated horizontal overflow=${populated.overflow}`);
        assert.match(populated.ctaText, /开始今日训练/);
        await page.screenshot({ path: path.join(evidenceRoot, 'today-populated-390x844.png'), fullPage: false });

        const greenCta = populated.ctaColor;
        await page.evaluate(() => theme.setCustom('#d04a7a'));
        const custom = await snapshot(page);
        assert.notEqual(custom.ctaColor, greenCta);
        await page.screenshot({ path: path.join(evidenceRoot, 'today-custom-390x844.png'), fullPage: false });

        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

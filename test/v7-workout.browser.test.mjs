// @ts-nocheck
/* global theme */
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
const evidenceRoot = path.join(root, '.tmp', 'v7-workout');

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

test('V7 Workout keeps a running session across route unmount and rebuilds the visible UI', async () => {
    await mkdir(evidenceRoot, { recursive: true });
    const http = await startServer();
    const pw = loadPlaywright();
    const { browser } = await launchAuditBrowser(pw.chromium);
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(`${http.base}/index.html#/workout`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => document.querySelector('#workout.v7-feature-workout') && window.rehabV7?.lifecycle?.activeId === 'workout', null, { timeout: 45000 });

        const visual = await page.evaluate(() => {
            const timer = document.querySelector('#workout .timer-panel');
            const list = document.querySelector('#workout #currentActionList');
            return {
                active: window.rehabV7?.lifecycle?.activeId,
                state: document.querySelector('#workout')?.dataset.v7WorkoutState,
                timerBackdrop: timer ? getComputedStyle(timer).backdropFilter : '',
                listBackdrop: list ? getComputedStyle(list).backdropFilter : '',
                liquidControls: document.querySelectorAll('#workout .v7-workout-primary-cta[data-v7-liquid]').length,
                pipVisible: !document.getElementById('pipBtn')?.classList.contains('hidden'),
                recoveryEntry: !!document.querySelector('#actionPhase option[value="cooldown"]'),
                overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
            };
        });
        assert.equal(visual.active, 'workout');
        assert.equal(visual.state, 'idle');
        assert.equal(visual.timerBackdrop, 'none');
        assert.equal(visual.listBackdrop, 'none');
        assert.equal(visual.liquidControls, 1);
        assert.equal(visual.pipVisible, true);
        assert.equal(visual.recoveryEntry, true);
        assert.ok(visual.overflow <= 1);

        await page.evaluate(() => {
            theme.setPreset('green');
            theme.setMode('light');
            window.data.db.actions = [
                { id: 'v7-idle-1', name: '深蹲', phase: 'main', nature: 'training', sets: 3, reps: 8, work: 5, repRest: 0, actionRest: 45, groupRest: 0, isAlt: false, libOnly: false, deleted: false, updatedAt: Date.now() },
                { id: 'v7-idle-2', name: '坐姿划船', phase: 'main', nature: 'training', sets: 3, reps: 10, work: 5, repRest: 0, actionRest: 45, groupRest: 0, isAlt: false, libOnly: false, deleted: false, updatedAt: Date.now() + 1 },
                { id: 'v7-idle-3', name: '臀桥', phase: 'main', nature: 'recovery', sets: 3, reps: 12, work: 4, repRest: 0, actionRest: 30, groupRest: 0, isAlt: false, libOnly: false, deleted: false, updatedAt: Date.now() + 2 }
            ];
            window.data.render('workout');
            window.dispatchEvent(new CustomEvent('workout:state', { detail: { status: 'idle' } }));
        });
        await page.waitForFunction(() => document.querySelectorAll('#workout .v7-workout-plan-row').length === 3, null, { timeout: 10000 });
        await page.evaluate(() => {
            const root = document.getElementById('workout');
            if (root) root.scrollTop = 0;
        });
        await page.waitForTimeout(300);
        const idleVisual = await page.evaluate(() => {
            const root = document.getElementById('workout');
            const readiness = document.querySelector('#workout .v7-workout-readiness-card');
            const plan = document.querySelector('#workout .v7-workout-plan-card');
            const strip = document.querySelector('#workout .v7-workout-session-strip');
            const play = document.getElementById('playBtn');
            const nav = document.querySelector('.md-nav-rail.v7-bottom-nav');
            const timer = document.querySelector('#workout .timer-panel');
            const rect = (node) => node ? node.getBoundingClientRect() : null;
            const playRect = rect(play);
            const navRect = rect(nav);
            return {
                state: root?.dataset.v7WorkoutState,
                readiness: rect(readiness),
                plan: rect(plan),
                strip: rect(strip),
                play: playRect,
                nav: navRect,
                timerDisplay: timer ? getComputedStyle(timer).display : '',
                modeLabels: [...document.querySelectorAll('#workout .v7-workout-mode-tabs button')].map((button) => button.textContent?.trim()),
                planRows: document.querySelectorAll('#workout .v7-workout-plan-row').length,
                overlap: playRect && navRect ? Math.max(0, playRect.bottom - navRect.top) : 0,
                overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
            };
        });
        assert.equal(idleVisual.state, 'idle');
        assert.equal(idleVisual.timerDisplay, 'none');
        assert.deepEqual(idleVisual.modeLabels, ['力量', '有氧', '康复', '拉伸']);
        assert.equal(idleVisual.planRows, 3);
        assert.ok(idleVisual.readiness?.height >= 128 && idleVisual.readiness?.height <= 142, `idle readiness height=${idleVisual.readiness?.height}`);
        assert.ok(idleVisual.plan?.height >= 246 && idleVisual.plan?.height <= 258, `idle plan height=${idleVisual.plan?.height}`);
        assert.ok(idleVisual.strip?.height >= 68 && idleVisual.strip?.height <= 76, `idle summary height=${idleVisual.strip?.height}`);
        assert.ok(idleVisual.overlap <= 1, `idle play/nav overlap=${idleVisual.overlap}`);
        assert.ok(idleVisual.overflow <= 1);
        await page.screenshot({ path: path.join(evidenceRoot, 'workout-idle-390x844.png'), fullPage: false });

        await page.locator('#workout .v7-workout-mode-tabs button[data-v7-workout-mode="recovery"]').click();
        await page.waitForFunction(() => document.querySelector('#workout .v7-workout-mode-tabs button[data-v7-workout-mode="recovery"]')?.getAttribute('aria-selected') === 'true');
        await page.locator('#workout .v7-workout-mode-tabs button[data-v7-workout-mode="strength"]').click();
        await page.waitForFunction(() => document.querySelector('#workout .v7-workout-mode-tabs button[data-v7-workout-mode="strength"]')?.getAttribute('aria-selected') === 'true');

        await page.evaluate(() => document.querySelector('#workout [data-v7-workout-editor-toggle]')?.click());
        await page.waitForFunction(() => document.querySelector('#workout')?.dataset.v7WorkoutEditor === 'open');
        const advanced = await page.evaluate(() => {
            const card = document.querySelector('#workout #strengthCard');
            const controls = document.querySelector('#workout .workout-controls');
            card?.scrollIntoView?.({ block: 'start' });
            return {
                visible: card?.getClientRects().length > 0,
                backdrop: card ? getComputedStyle(card).backdropFilter : '',
                controlsPosition: controls ? getComputedStyle(controls).position : '',
                overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
            };
        });
        assert.equal(advanced.visible, true);
        assert.equal(advanced.backdrop, 'none');
        assert.equal(advanced.controlsPosition, 'static');
        assert.ok(advanced.overflow <= 1);
        await page.waitForTimeout(120);
        await page.screenshot({ path: path.join(evidenceRoot, 'workout-advanced-390x844.png'), fullPage: false });
        await page.evaluate(() => {
            document.querySelector('#workout [data-v7-workout-editor-toggle]')?.click();
            const root = document.getElementById('workout');
            if (root) root.scrollTop = 0;
        });
        await page.waitForFunction(() => document.querySelector('#workout')?.dataset.v7WorkoutEditor === 'closed');

        const started = await page.evaluate(async () => {
            window.alert = () => {};
            window.confirm = () => true;
            Object.assign(window.workout, {
                speak: async () => {},
                playCue: () => {},
                acquireWakeLock: async () => {},
                releaseWakeLock: () => {},
                setupMediaSession: () => {},
                keepAudioAlive: () => {},
                initBackGuard: () => {},
                closePip: () => {}
            });
            window.data.db.actions = [{
                id: 'v7-browser-action',
                name: 'V7 测试动作',
                phase: 'main',
                nature: 'training',
                sets: 1,
                reps: 1,
                work: 30,
                repRest: 0,
                actionRest: 0,
                groupRest: 0,
                isAlt: false,
                libOnly: false,
                deleted: false,
                updatedAt: Date.now()
            }];
            window.data.render('workout');
            await window.workout.toggle();
            window.workout.setTrainingPaused(true);
            const paused = document.querySelector('#workout')?.dataset.v7WorkoutState;
            window.workout.setTrainingPaused(false);
            window.workout.skip();
            return {
                paused,
                playing: window.workout.isPlaying,
                journal: !!window.workoutState.readJournal(),
                hotkeys: window.workout._kbdBound
            };
        });
        assert.equal(started.paused, 'paused');
        assert.equal(started.playing, true);
        assert.equal(started.journal, true);
        assert.equal(started.hotkeys, true);

        await page.evaluate(async () => {
            const nav = [...document.querySelectorAll('.nav-item')].find((item) => item.dataset.v7Page === 'today');
            await window.ui.tab('today', nav);
        });
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'today', null, { timeout: 30000 });
        const away = await page.evaluate(() => ({
            playing: window.workout.isPlaying,
            journal: !!window.workoutState.readJournal(),
            hotkeys: window.workout._kbdBound
        }));
        assert.equal(away.playing, true);
        assert.equal(away.journal, true);
        assert.equal(away.hotkeys, false);

        await page.evaluate(async () => {
            const nav = [...document.querySelectorAll('.nav-item')].find((item) => item.dataset.v7Page === 'workout');
            await window.ui.tab('workout', nav);
        });
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'workout', null, { timeout: 30000 });
        const returned = await page.evaluate(() => ({
            playing: window.workout.isPlaying,
            state: document.querySelector('#workout')?.dataset.v7WorkoutState,
            label: document.querySelector('#playBtn .fab-label')?.textContent?.trim(),
            hotkeys: window.workout._kbdBound
        }));
        assert.equal(returned.playing, true);
        assert.ok(returned.state === 'running' || returned.state === 'resting');
        assert.equal(returned.label, '暂停训练');
        assert.equal(returned.hotkeys, true);
        await page.waitForTimeout(350);
        const bottomClearance = await page.evaluate(() => {
            const root = document.querySelector('#workout');
            if (root) root.scrollTop = root.scrollHeight;
            const controls = document.querySelector('#workout .workout-controls');
            const candidates = [...document.querySelectorAll([
                '#workout button',
                '#workout input',
                '#workout select',
                '#workout textarea',
                '#workout .list-item',
                '#workout .v7-workout-surface'
            ].join(','))].filter((element) => {
                if (element.closest('.workout-controls')) return false;
                const style = getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
            });
            const lastBottom = candidates.reduce((bottom, element) => Math.max(bottom, element.getBoundingClientRect().bottom), 0);
            return controls ? controls.getBoundingClientRect().top - lastBottom : 0;
        });
        assert.ok(bottomClearance >= 8, `fixed workout controls cover the final interactive content: ${bottomClearance}px`);
        await page.screenshot({ path: path.join(evidenceRoot, 'workout-running-390x844.png'), fullPage: true });

        const finished = await page.evaluate(() => {
            const before = window.data.db.history.length;
            window.workout.totalSec = 25;
            window.workout.finish();
            return {
                before,
                after: window.data.db.history.length,
                playing: window.workout.isPlaying,
                journal: window.workoutState.readJournal(),
                state: document.querySelector('#workout')?.dataset.v7WorkoutState
            };
        });
        assert.equal(finished.playing, false);
        assert.equal(finished.journal, null);
        assert.equal(finished.after, finished.before + 1);
        assert.equal(finished.state, 'finished');
        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

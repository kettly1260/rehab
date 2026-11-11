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
const evidenceRoot = path.join(root, '.tmp', 'quick-record-fab');

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

test('Bottom navigation, FAB, Quick Record sheet and Homepage hierarchy verification', async () => {
    await mkdir(evidenceRoot, { recursive: true });
    const http = await startServer();
    const pw = loadPlaywright();
    const { browser } = await launchAuditBrowser(pw.chromium);

    try {
        const viewports = [
            { name: '360x800', width: 360, height: 800 },
            { name: '390x844', width: 390, height: 844 },
            { name: '430x932', width: 430, height: 932 },
            { name: 'desktop-1024x768', width: 1024, height: 768 }
        ];

        // 1. Multi-viewport and basic navigation check
        for (const vp of viewports) {
            const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, serviceWorkers: 'block' });
            const page = await context.newPage();
            await page.goto(`${http.base}/index.html#/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForFunction(() => (/** @type {any} */ (window)).rehabV7?.lifecycle?.activeId === 'today', null, { timeout: 45000 });

            const navInfo = await page.evaluate(() => {
                const nav = document.querySelector('.md-nav-rail.v7-bottom-nav');
                const items = [...document.querySelectorAll('.v7-bottom-nav .nav-item')];
                const icons = [...document.querySelectorAll('.v7-bottom-nav .material-symbols-rounded')];
                const labels = [...document.querySelectorAll('.v7-bottom-nav small')];
                const rect = nav ? nav.getBoundingClientRect() : null;
                return {
                    height: rect?.height || 0,
                    width: rect?.width || 0,
                    itemCount: items.length,
                    iconDisplays: icons.map(i => getComputedStyle(i).display),
                    labels: labels.map(l => l.textContent?.trim() || ''),
                    itemSizes: items.map(it => {
                        const r = it.getBoundingClientRect();
                        return { width: r.width, height: r.height };
                    })
                };
            });

            assert.equal(navInfo.itemCount, 5, `Must have 5 nav items in ${vp.name}`);
            assert.ok(navInfo.height >= 70 && navInfo.height <= 76, `Nav height must be ~72px, got ${navInfo.height} in ${vp.name}`);
            assert.ok(navInfo.iconDisplays.every(d => d !== 'none'), `All icons must be visible in ${vp.name}`);
            assert.deepEqual(navInfo.labels, ['今日', '训练', '记录', '教练', '我的'], `Labels must match in ${vp.name}`);
            assert.ok(navInfo.itemSizes.every(s => s.width >= 40 && s.height >= 48), `Touch target area must be large enough in ${vp.name}`);

            await page.screenshot({ path: path.join(evidenceRoot, `nav-${vp.name}.png`), fullPage: false });
            await context.close();
        }

        // 2. Main functional test on standard 390x844
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
        await page.goto(`${http.base}/index.html#/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => (/** @type {any} */ (window)).rehabV7?.lifecycle?.activeId === 'today', null, { timeout: 45000 });

        // Check FAB visibility on Today page
        const fabToday = await page.evaluate(() => {
            const fab = document.getElementById('quickRecordFab');
            if (!fab) return null;
            const style = getComputedStyle(fab);
            const rect = fab.getBoundingClientRect();
            return {
                display: style.display,
                width: rect.width,
                height: rect.height,
                ariaExpanded: fab.getAttribute('aria-expanded'),
                ariaHasPopup: fab.getAttribute('aria-haspopup'),
                ariaLabel: fab.getAttribute('aria-label')
            };
        });
        assert.ok(fabToday);
        assert.ok(fabToday.display === 'flex' || fabToday.display === 'inline-flex', 'FAB must be visible on Today page');
        assert.equal(fabToday.width, 56, 'FAB width must be 56px');
        assert.equal(fabToday.height, 56, 'FAB height must be 56px');
        assert.equal(fabToday.ariaLabel, '快捷记录');
        assert.equal(fabToday.ariaHasPopup, 'dialog');

        // Check FAB visibility on Records page
        await page.evaluate(() => (/** @type {any} */ (window)).ui.tab('records', document.querySelector('[data-v7-page="records"]')));
        await page.waitForTimeout(300);
        const fabRecords = await page.evaluate(() => {
            const fab = document.getElementById('quickRecordFab');
            return fab ? getComputedStyle(fab).display : null;
        });
        assert.ok(fabRecords === 'flex' || fabRecords === 'inline-flex', 'FAB must be visible on Records page');

        // Check FAB hidden on Workout, AI-coach, Profile pages
        for (const tab of ['workout', 'ai-coach', 'profile']) {
            await page.evaluate((t) => (/** @type {any} */ (window)).ui.tab(t, document.querySelector(`[data-v7-page="${t}"]`)), tab);
            await page.waitForTimeout(300);
            const fabHidden = await page.evaluate(() => {
                const fab = document.getElementById('quickRecordFab');
                return fab ? getComputedStyle(fab).display : null;
            });
            assert.equal(fabHidden, 'none', `FAB must be hidden on ${tab} page`);
        }

        // Return to Today page
        await page.evaluate(() => (/** @type {any} */ (window)).ui.tab('today', document.querySelector('[data-v7-page="today"]')));
        await page.waitForTimeout(300);

        // Verify no double circle on active bottom nav item, and primary launch button is a full pill
        const uiCheck = await page.evaluate(() => {
            const activeContent = document.querySelector('.v7-bottom-nav .nav-item.active .nav-content');
            const contentStyle = activeContent ? getComputedStyle(activeContent) : null;
            const launchBtn = document.querySelector('#today .today-plan-empty .plan-actions .today-primary-launch');
            const launchRect = launchBtn ? launchBtn.getBoundingClientRect() : null;
            return {
                activeContentBg: contentStyle?.backgroundColor || '',
                activeContentShadow: contentStyle?.boxShadow || '',
                launchWidth: launchRect?.width || 0,
                launchHeight: launchRect?.height || 0
            };
        });
        assert.equal(uiCheck.activeContentBg, 'rgba(0, 0, 0, 0)', 'Active nav-content must not draw a second circle background');
        assert.equal(uiCheck.activeContentShadow, 'none', 'Active nav-content must not have inset box-shadow');
        assert.ok(uiCheck.launchWidth >= 100 && uiCheck.launchWidth > uiCheck.launchHeight * 2, `Primary launch button must wrap text as a pill (width=${uiCheck.launchWidth}, height=${uiCheck.launchHeight})`);

        // Verify Today Overview unified card default tab is status and switches smoothly with recovery
        const initialOverviewTab = await page.evaluate(() => {
            const card = document.querySelector('#todayOverview .today-readiness-card');
            const statusPane = card?.querySelector('[data-overview-pane="status"]');
            const recPane = card?.querySelector('[data-overview-pane="recovery"]');
            return {
                tab: card?.getAttribute('data-overview-tab'),
                statusVisible: statusPane ? getComputedStyle(statusPane).display !== 'none' : false,
                recHidden: recPane ? getComputedStyle(recPane).display === 'none' : false
            };
        });
        assert.equal(initialOverviewTab.tab, 'status', 'Overview card must default to status tab');
        assert.equal(initialOverviewTab.statusVisible, true, 'Status pane must be visible by default');
        assert.equal(initialOverviewTab.recHidden, true, 'Recovery pane must be hidden by default');

        await page.click('#todayOverview [data-overview-tab="recovery"]');
        await page.waitForTimeout(150);
        const recoveryTabActive = await page.evaluate(() => {
            const card = document.querySelector('#todayOverview .today-readiness-card');
            const statusPane = card?.querySelector('[data-overview-pane="status"]');
            const recPane = card?.querySelector('[data-overview-pane="recovery"]');
            return {
                tab: card?.getAttribute('data-overview-tab'),
                statusHidden: statusPane ? getComputedStyle(statusPane).display === 'none' : false,
                recVisible: recPane ? getComputedStyle(recPane).display !== 'none' : false
            };
        });
        assert.equal(recoveryTabActive.tab, 'recovery', 'Overview card must switch to recovery tab');
        assert.equal(recoveryTabActive.recVisible, true, 'Recovery pane must be visible');
        assert.equal(recoveryTabActive.statusHidden, true, 'Status pane must be hidden');

        await page.click('#todayOverview [data-overview-tab="status"]');
        await page.waitForTimeout(150);

        // Screenshot: Today page with FAB
        await page.screenshot({ path: path.join(evidenceRoot, '01-today-page-with-fab.png'), fullPage: false });

        // 3. Click FAB to open Quick Record sheet
        await page.click('#quickRecordFab');
        await page.waitForTimeout(250);

        const sheetState = await page.evaluate(() => {
            const sheet = document.getElementById('quickRecordSheet');
            const fab = document.getElementById('quickRecordFab');
            const title = document.getElementById('quickRecordSheetTitle')?.textContent?.trim();
            const items = [...document.querySelectorAll('.quick-record-row')].map(r => ({
                action: r.getAttribute('onclick')?.match(/choose\(['"]([^'"]+)['"]\)/)?.[1] || '',
                icon: r.querySelector('.material-symbols-rounded')?.textContent?.trim() || '',
                label: r.querySelector('.quick-record-label')?.textContent?.trim() || ''
            }));
            return {
                isOpen: sheet && !sheet.classList.contains('hidden'),
                ariaExpanded: fab?.getAttribute('aria-expanded'),
                title,
                items
            };
        });

        assert.equal(sheetState.isOpen, true, 'Sheet must be open after clicking FAB');
        assert.equal(sheetState.ariaExpanded, 'true', 'FAB aria-expanded must be true');
        assert.equal(sheetState.title, '快捷记录', 'Sheet title must be 快捷记录');
        assert.deepEqual(sheetState.items, [
            { action: 'diet', icon: 'restaurant', label: '记饮食' },
            { action: 'exercise', icon: 'fitness_center', label: '记运动' },
            { action: 'weight', icon: 'monitor_weight', label: '记体重' }
        ], 'Sheet rows must match the required 3 items');

        // Screenshot: Quick Record Sheet opened
        await page.screenshot({ path: path.join(evidenceRoot, '02-quick-record-sheet-opened.png'), fullPage: false });

        // Dark mode screenshot
        await page.waitForFunction(() => typeof (/** @type {any} */ (window)).theme?.setMode === 'function', null, { timeout: 10000 });
        await page.evaluate(() => (/** @type {any} */ (window)).theme.setMode('dark'));
        await page.waitForTimeout(300);
        const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme-mode') === 'dark');
        assert.equal(isDark, true, 'Theme mode should be dark');
        await page.screenshot({ path: path.join(evidenceRoot, '03-quick-record-sheet-dark.png'), fullPage: false });
        await page.evaluate(() => (/** @type {any} */ (window)).theme.setMode('light'));
        await page.waitForTimeout(300);

        // Test Escape to close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
        const closedByEscape = await page.evaluate(() => {
            const sheet = document.getElementById('quickRecordSheet');
            return sheet ? sheet.classList.contains('hidden') : false;
        });
        assert.equal(closedByEscape, true, 'Sheet must close on Escape key');

        // Re-open and test Cancel button
        await page.click('#quickRecordFab');
        await page.waitForTimeout(200);
        await page.click('.quick-record-cancel-btn');
        await page.waitForTimeout(200);
        const closedByCancel = await page.evaluate(() => {
            const sheet = document.getElementById('quickRecordSheet');
            return sheet ? sheet.classList.contains('hidden') : false;
        });
        assert.equal(closedByCancel, true, 'Sheet must close on Cancel button');

        // 4. Test 2-click path to modals: Diet, Exercise, Weight
        // 4a. Diet modal
        await page.click('#quickRecordFab');
        await page.waitForTimeout(200);
        await page.click('.quick-record-row[data-q="diet"]');
        await page.waitForTimeout(400);
        const dietModalOpen = await page.evaluate(() => {
            const sheet = document.getElementById('quickRecordSheet');
            const dietModal = document.getElementById('dietModal');
            return {
                sheetClosed: sheet?.classList.contains('hidden'),
                modalVisible: dietModal && !dietModal.classList.contains('hidden')
            };
        });
        assert.equal(dietModalOpen.sheetClosed, true, 'Sheet must be closed when opening diet modal');
        assert.equal(dietModalOpen.modalVisible, true, 'Diet modal must be visible');
        await page.screenshot({ path: path.join(evidenceRoot, '04-opened-diet-modal.png'), fullPage: false });
        // Close diet modal
        await page.evaluate(() => (/** @type {any} */ (window)).data?._closeActiveModal?.() || document.getElementById('dietModal')?.classList.add('hidden'));
        await page.waitForTimeout(300);

        // 4b. Exercise modal
        await page.click('#quickRecordFab');
        await page.waitForTimeout(200);
        await page.click('.quick-record-row[data-q="cardio"]');
        await page.waitForTimeout(400);
        const exerciseModalOpen = await page.evaluate(() => {
            const sheet = document.getElementById('quickRecordSheet');
            const exModal = document.getElementById('exerciseModal');
            return {
                sheetClosed: sheet?.classList.contains('hidden'),
                modalVisible: exModal && !exModal.classList.contains('hidden')
            };
        });
        assert.equal(exerciseModalOpen.sheetClosed, true, 'Sheet must be closed when opening exercise modal');
        assert.equal(exerciseModalOpen.modalVisible, true, 'Exercise modal must be visible');
        await page.screenshot({ path: path.join(evidenceRoot, '05-opened-exercise-modal.png'), fullPage: false });
        // Close exercise modal
        await page.evaluate(() => (/** @type {any} */ (window)).data?._closeActiveModal?.() || document.getElementById('exerciseModal')?.classList.add('hidden'));
        await page.waitForTimeout(300);

        // 4c. Weight modal
        await page.click('#quickRecordFab');
        await page.waitForTimeout(200);
        await page.click('.quick-record-row[data-q="weight"]');
        await page.waitForTimeout(400);
        const weightModalOpen = await page.evaluate(() => {
            const sheet = document.getElementById('quickRecordSheet');
            const wtModal = document.getElementById('weightModal');
            return {
                sheetClosed: sheet?.classList.contains('hidden'),
                modalVisible: wtModal && !wtModal.classList.contains('hidden')
            };
        });
        assert.equal(weightModalOpen.sheetClosed, true, 'Sheet must be closed when opening weight modal');
        assert.equal(weightModalOpen.modalVisible, true, 'Weight modal must be visible');
        await page.screenshot({ path: path.join(evidenceRoot, '06-opened-weight-modal.png'), fullPage: false });
        // Close weight modal
        await page.evaluate(() => (/** @type {any} */ (window)).data?._closeActiveModal?.() || document.getElementById('weightModal')?.classList.add('hidden'));
        await page.waitForTimeout(300);

        // 5. Real recording roundtrip via FAB and verification after reload
        // 5a. Record Diet
        await page.click('#quickRecordFab');
        await page.waitForTimeout(200);
        await page.click('.quick-record-row[data-q="diet"]');
        await page.waitForTimeout(400);
        await page.evaluate(() => {
            const nameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('foodName'));
            const gramsInput = /** @type {HTMLInputElement|null} */ (document.getElementById('foodGrams'));
            const calInput = /** @type {HTMLInputElement|null} */ (document.getElementById('foodCal'));
            if (nameInput) nameInput.value = '测试全麦面包';
            if (gramsInput) gramsInput.value = '100';
            if (calInput) calInput.value = '800';
            (/** @type {any} */ (window)).data?.addFoodLog?.();
            (/** @type {any} */ (window)).data?._closeActiveModal?.();
        });
        await page.waitForTimeout(300);

        // 5b. Record Exercise
        await page.click('#quickRecordFab');
        await page.waitForTimeout(200);
        await page.click('.quick-record-row[data-q="cardio"]');
        await page.waitForTimeout(400);
        await page.evaluate(() => {
            const minInput = /** @type {HTMLInputElement|null} */ (document.getElementById('manualExerciseMinutes'));
            const calInput = /** @type {HTMLInputElement|null} */ (document.getElementById('manualExerciseCalories'));
            if (minInput) minInput.value = '25';
            if (calInput) calInput.value = '120';
            (/** @type {any} */ (window)).data?.addExerciseFromModal?.();
            (/** @type {any} */ (window)).data?._closeActiveModal?.();
        });
        await page.waitForTimeout(300);

        // 5c. Record Weight
        await page.click('#quickRecordFab');
        await page.waitForTimeout(200);
        await page.click('.quick-record-row[data-q="weight"]');
        await page.waitForTimeout(400);
        await page.evaluate(() => {
            const valInput = /** @type {HTMLInputElement|null} */ (document.getElementById('modalWeightValue'));
            if (valInput) valInput.value = '66.8';
            (/** @type {any} */ (window)).data?.addWeight?.();
            (/** @type {any} */ (window)).data?._closeActiveModal?.();
        });
        await page.waitForTimeout(300);

        // Check in-memory DB
        const savedMemory = await page.evaluate(() => {
            const health = (/** @type {any} */ (window)).data?.db?.health || {};
            return {
                foodCount: (health.foodLogs || []).filter(f => f.name === '测试全麦面包').length,
                exerciseCount: (health.exerciseLogs || []).filter(c => c.minutes === 25).length,
                weightCount: (health.weights || []).filter(w => Number(w.weight) === 66.8).length
            };
        });
        assert.ok(savedMemory.foodCount >= 1, 'Diet log should be saved');
        assert.ok(savedMemory.exerciseCount >= 1, 'Exercise log should be saved');
        assert.ok(savedMemory.weightCount >= 1, 'Weight log should be saved');

        // Reload page to verify persistence across sessions
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (/** @type {any} */ (window)).rehabV7?.lifecycle?.activeId === 'today', null, { timeout: 45000 });
        const reloadedDb = await page.evaluate(() => {
            const health = (/** @type {any} */ (window)).data?.db?.health || {};
            return {
                foodCount: (health.foodLogs || []).filter(f => f.name === '测试全麦面包').length,
                exerciseCount: (health.exerciseLogs || []).filter(c => c.minutes === 25).length,
                weightCount: (health.weights || []).filter(w => Number(w.weight) === 66.8).length
            };
        });
        assert.ok(reloadedDb.foodCount >= 1, 'Diet log should persist after reload');
        assert.ok(reloadedDb.exerciseCount >= 1, 'Exercise log should persist after reload');
        assert.ok(reloadedDb.weightCount >= 1, 'Weight log should persist after reload');

        // 6. Verify Homepage hierarchy & empty/populated trend card
        const hierarchyCheck = await page.evaluate(() => {
            const emptyTrend = document.querySelector('.today-trend-compact');
            const planPrimaryCta = document.querySelector('#todayPlanStatus .today-primary-launch');
            const timelineTrailingCta = document.querySelector('#todayTimeline .today-primary-launch');
            const oldQuickSection = document.getElementById('todayQuickActions');
            return {
                hasEmptyTrend: !!emptyTrend,
                hasPlanCta: !!planPrimaryCta,
                planCtaText: planPrimaryCta?.textContent?.trim() || '',
                hasTimelineTrailingCta: !!timelineTrailingCta,
                isOldQuickActionsHidden: !oldQuickSection || getComputedStyle(oldQuickSection).display === 'none'
            };
        });
        assert.equal(hierarchyCheck.hasEmptyTrend, true, 'Trend card should be compact when no data');
        assert.equal(hierarchyCheck.hasPlanCta, true, 'Plan section must contain the primary action CTA');
        assert.match(hierarchyCheck.planCtaText, /创建计划/, 'Empty plan CTA should be 创建计划');
        assert.equal(hierarchyCheck.hasTimelineTrailingCta, false, 'No trailing primary CTA after timeline');
        assert.equal(hierarchyCheck.isOldQuickActionsHidden, true, 'Old quick actions dock must be hidden');

        // Screenshot: Final homepage
        await page.screenshot({ path: path.join(evidenceRoot, '07-today-page-hierarchy.png'), fullPage: false });

        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

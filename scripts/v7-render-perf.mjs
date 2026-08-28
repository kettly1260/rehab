// @ts-nocheck
// GPU-enabled V7 render/effects audit using the system Edge/Chrome.
// Usage: node scripts/v7-render-perf.mjs --suite=render|effects [--runs=3]
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchAuditBrowser } from '../test/helpers/browser-launch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const blockedExternalPatterns = ['*://*.kaspersky-labs.com/*'];

function option(name, fallback) {
    const prefix = `--${name}=`;
    const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
    return match ? match.slice(prefix.length) : fallback;
}

function numberOption(name, fallback) {
    const value = Number(option(name, String(fallback)));
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function freePort() {
    return await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
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
    const port = await freePort();
    const server = createServer(async (req, res) => {
        try {
            const requestUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
            const pathname = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
            const resolved = path.resolve(root, `.${pathname}`);
            if (!resolved.startsWith(root)) throw new Error('outside root');
            const info = await stat(resolved);
            if (!info.isFile()) throw new Error('not a file');
            res.writeHead(200, { 'content-type': mimeFor(resolved), 'cache-control': 'no-store' });
            createReadStream(resolved).pipe(res);
        } catch {
            res.writeHead(404);
            res.end('Not found');
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });
    return { server, url: `http://127.0.0.1:${port}/index.html` };
}

const PROBE_SCRIPT = `(() => {
    const probe = window.__v7Perf = {
        raf: new Set(), timeouts: new Set(), intervals: new Set(),
        mutationObservers: 0, resizeObservers: 0,
        windowListeners: 0, documentListeners: 0,
        longTasks: [], loaf: [], frames: [], frameId: 0
    };
    try {
        new PerformanceObserver((list) => probe.longTasks.push(...list.getEntries().map((entry) => ({
            startTime: entry.startTime, duration: entry.duration
        })))).observe({ type: 'longtask', buffered: true });
    } catch {}
    try {
        new PerformanceObserver((list) => probe.loaf.push(...list.getEntries().map((entry) => ({
            startTime: entry.startTime, duration: entry.duration, blockingDuration: entry.blockingDuration || 0
        })))).observe({ type: 'long-animation-frame', buffered: true });
    } catch {}

    const requestFrame = window.requestAnimationFrame.bind(window);
    const cancelFrame = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
        let id = 0;
        id = requestFrame((stamp) => {
            probe.raf.delete(id);
            callback(stamp);
        });
        probe.raf.add(id);
        return id;
    };
    window.cancelAnimationFrame = (id) => {
        probe.raf.delete(id);
        return cancelFrame(id);
    };

    const setTimeoutOriginal = window.setTimeout.bind(window);
    const clearTimeoutOriginal = window.clearTimeout.bind(window);
    const setIntervalOriginal = window.setInterval.bind(window);
    const clearIntervalOriginal = window.clearInterval.bind(window);
    window.setTimeout = (callback, wait, ...args) => {
        let id = 0;
        id = setTimeoutOriginal((...inner) => {
            probe.timeouts.delete(id);
            if (typeof callback === 'function') callback(...inner);
        }, wait, ...args);
        probe.timeouts.add(id);
        return id;
    };
    window.clearTimeout = (id) => {
        probe.timeouts.delete(id);
        return clearTimeoutOriginal(id);
    };
    window.setInterval = (callback, wait, ...args) => {
        const id = setIntervalOriginal(callback, wait, ...args);
        probe.intervals.add(id);
        return id;
    };
    window.clearInterval = (id) => {
        probe.intervals.delete(id);
        return clearIntervalOriginal(id);
    };

    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (this === window) probe.windowListeners += 1;
        if (this === document) probe.documentListeners += 1;
        return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
        if (this === window) probe.windowListeners = Math.max(0, probe.windowListeners - 1);
        if (this === document) probe.documentListeners = Math.max(0, probe.documentListeners - 1);
        return remove.call(this, type, listener, options);
    };

    const wrapObserver = (name, key) => {
        const Original = window[name];
        if (typeof Original !== 'function') return;
        window[name] = function (callback) {
            const instance = new Original(callback);
            probe[key] += 1;
            let live = true;
            const disconnect = instance.disconnect.bind(instance);
            instance.disconnect = () => {
                if (live) probe[key] = Math.max(0, probe[key] - 1);
                live = false;
                return disconnect();
            };
            return instance;
        };
        window[name].prototype = Original.prototype;
    };
    wrapObserver('MutationObserver', 'mutationObservers');
    wrapObserver('ResizeObserver', 'resizeObservers');

    window.__v7StartFrames = () => {
        probe.frames = [];
        let previous = 0;
        const tick = (stamp) => {
            if (previous) probe.frames.push(stamp - previous);
            previous = stamp;
            probe.frameId = window.requestAnimationFrame(tick);
        };
        probe.frameId = window.requestAnimationFrame(tick);
    };
    window.__v7StopFrames = () => {
        window.cancelAnimationFrame(probe.frameId);
        probe.frameId = 0;
        return probe.frames.slice();
    };
})();`;

function percentile(values, fraction) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function median(values) {
    return percentile(values, 0.5);
}

async function waitBoot(page) {
    await page.waitForFunction(() => document.getElementById('appShell') && !document.getElementById('appShell').hidden, null, { timeout: 60000 });
    await page.waitForFunction(() => window.data?._readyState === 'ready' || typeof window.data?.render === 'function', null, { timeout: 60000 });
    await delay(600);
}

async function setEffects(page, mode) {
    await page.evaluate((nextMode) => {
        localStorage.setItem('rehab.v7.effects.v1', nextMode);
        document.documentElement.dataset.v7Effects = nextMode;
    }, mode);
}

async function navigate(page, pageId) {
    const order = { today: 0, workout: 1, records: 2, 'ai-coach': 3, profile: 4 };
    await page.evaluate(async ({ id, index }) => {
        const item = document.querySelectorAll('.nav-item')[index];
        if (typeof window.ui?.tab === 'function') await window.ui.tab(id, item);
        else item?.click?.();
    }, { id: pageId, index: order[pageId] });
    await page.waitForFunction((id) => document.querySelector('.page.active')?.id === id, pageId, { timeout: 30000 });
    await delay(180);
}

async function scrollActive(page) {
    await page.evaluate(async () => {
        const active = document.querySelector('.page.active');
        const scroller = active && active.scrollHeight > active.clientHeight ? active : document.scrollingElement;
        for (const ratio of [0.25, 0.6, 1, 0.35, 0]) {
            scroller?.scrollTo?.({ top: Math.max(0, (scroller.scrollHeight - scroller.clientHeight) * ratio), behavior: 'instant' });
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
    });
}

const scenarios = {
    async 'today-idle'(page) {
        await navigate(page, 'today');
        await delay(500);
    },
    async 'today-scroll'(page) {
        await navigate(page, 'today');
        await scrollActive(page);
    },
    async 'tab-switching'(page) {
        for (const id of ['workout', 'records', 'ai-coach', 'profile', 'today']) await navigate(page, id);
    },
    async 'workout-idle'(page) {
        await navigate(page, 'workout');
        await delay(500);
    },
    async 'workout-running'(page) {
        await navigate(page, 'workout');
        await page.evaluate(async () => {
            const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
            set('name', 'Performance Gate'); set('sets', '2'); set('reps', '2');
            set('work', '2'); set('repRest', '1'); set('actionRest', '1'); set('groupRest', '1');
            if (!window.data?.db?.actions?.length) await window.data?.addAction?.();
            window.workout?.toggle?.();
        });
        await delay(900);
    },
    async 'records-chart-scroll'(page) {
        await navigate(page, 'records');
        await page.evaluate(() => {
            document.getElementById('v7PerfChartTarget')?.remove();
            const host = document.getElementById('records');
            const target = document.createElement('div');
            target.id = 'v7PerfChartTarget';
            const points = Array.from({ length: 28 }, (_, index) => ({
                date: `2026-08-${String(index + 1).padStart(2, '0')}`,
                axisLabel: `08-${String(index + 1).padStart(2, '0')}`,
                weight: 70 + Math.sin(index / 3) * 0.8
            }));
            target.innerHTML = window.data?.renderWeightChart?.(points, {
                id: 'v7PerfWeightChart',
                enablePinch: true,
                pinchKind: 'trend'
            }) || '';
            host?.appendChild(target);
        });
        await delay(120);
        await scrollActive(page);
    },
    async 'coach-streaming'(page) {
        await navigate(page, 'ai-coach');
        await page.evaluate(async () => {
            const host = document.getElementById('ai-coach');
            const target = document.createElement('div');
            target.id = 'v7PerfStreamTarget';
            target.className = 'advice-content';
            host?.appendChild(target);
            const renderer = window.adviceStreamRenderer?.create?.(target, { chunkPerFrame: 12 });
            const chunks = Array.from({ length: 36 }, (_, i) => `Section ${i + 1}: controlled streaming render content.\n\n`);
            for (const chunk of chunks) renderer?.enqueue?.(chunk);
            await new Promise((resolve) => setTimeout(resolve, 700));
            renderer?.flushAll?.();
            await new Promise((resolve) => setTimeout(resolve, 120));
            renderer?.destroy?.();
        });
    },
    async 'profile-scroll'(page) {
        await navigate(page, 'profile');
        await scrollActive(page);
    },
    async 'modal-sheet'(page) {
        await navigate(page, 'profile');
        await page.evaluate(() => window.theme?.openSheet?.());
        await delay(450);
        await page.evaluate(() => window.theme?.closeSheet?.());
    }
};

async function readCdpMetrics(cdp) {
    const perf = await cdp.send('Performance.getMetrics');
    return Object.fromEntries((perf.metrics || []).map((item) => [item.name, item.value]));
}

async function browserMetrics(page, cdp, start, cdpStart) {
    const metricMap = await readCdpMetrics(cdp);
    const value = await page.evaluate((started) => {
        const probe = window.__v7Perf;
        const visible = (element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
        };
        const visibleElements = [...document.querySelectorAll('body *')].filter(visible);
        const backdropCandidates = [...document.querySelectorAll('.v7-soft-glass, .v7-glass-overlay')].filter(visible);
        const resources = performance.getEntriesByType('resource');
        return {
            durationMs: performance.now() - started,
            longTasks: probe.longTasks.filter((entry) => entry.startTime >= started),
            loaf: probe.loaf.filter((entry) => entry.startTime >= started),
            activeRaf: probe.raf.size,
            activeTimeouts: probe.timeouts.size,
            activeIntervals: probe.intervals.size,
            mutationObservers: probe.mutationObservers,
            resizeObservers: probe.resizeObservers,
            windowListeners: probe.windowListeners,
            documentListeners: probe.documentListeners,
            domNodes: document.querySelectorAll('*').length,
            visibleBackdrops: backdropCandidates.length,
            nestedBackdrops: backdropCandidates.filter((element) => element.parentElement?.closest?.('.v7-soft-glass, .v7-glass-overlay')).length,
            runningAnimations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
            permanentWillChange: visibleElements.filter((element) => getComputedStyle(element).willChange !== 'auto').length,
            transferKb: Math.round(resources.reduce((sum, entry) => sum + Number(entry.transferSize || 0), 0) / 1024),
            resourceCount: resources.length,
            effectMode: document.documentElement.dataset.v7Effects || ''
        };
    }, start);
    return {
        ...value,
        cdp: {
            layoutCount: (metricMap.LayoutCount || 0) - (cdpStart.LayoutCount || 0),
            recalcStyleCount: (metricMap.RecalcStyleCount || 0) - (cdpStart.RecalcStyleCount || 0),
            layoutDurationMs: ((metricMap.LayoutDuration || 0) - (cdpStart.LayoutDuration || 0)) * 1000,
            recalcStyleDurationMs: ((metricMap.RecalcStyleDuration || 0) - (cdpStart.RecalcStyleDuration || 0)) * 1000,
            taskDurationMs: ((metricMap.TaskDuration || 0) - (cdpStart.TaskDuration || 0)) * 1000,
            jsHeapKb: Math.round((metricMap.JSHeapUsedSize || 0) / 1024)
        }
    };
}

async function runScenario(page, cdp, name) {
    const cdpStart = await readCdpMetrics(cdp);
    await page.evaluate(() => window.__v7StartFrames());
    const start = await page.evaluate(() => performance.now());
    await scenarios[name](page);
    const frames = await page.evaluate(() => window.__v7StopFrames());
    await delay(420);
    const metrics = await browserMetrics(page, cdp, start, cdpStart);
    metrics.frame = {
        samples: frames.length,
        medianMs: Number(median(frames).toFixed(2)),
        p95Ms: Number(percentile(frames, 0.95).toFixed(2)),
        over32ms: frames.filter((value) => value > 32).length
    };
    metrics.longTaskMs = Math.round(metrics.longTasks.reduce((sum, item) => sum + item.duration, 0));
    metrics.loafMs = Math.round(metrics.loaf.reduce((sum, item) => sum + item.duration, 0));
    if (name === 'workout-running') {
        await page.evaluate(() => {
            const runtime = window.workout;
            if (!runtime) return;
            runtime.isPlaying = false;
            runtime.isPaused = false;
            runtime.abortCurrentPhaseWait?.();
            clearInterval(runtime.timer);
            clearInterval(runtime.sessionInt);
            clearInterval(runtime._speechWatchdog);
            clearInterval(runtime._audioKeepAliveInt);
            runtime.timer = null;
            runtime.sessionInt = null;
            runtime._speechWatchdog = null;
            runtime._audioKeepAliveInt = null;
            runtime.updateStateClasses?.();
            window.workoutVoice?.cancel?.();
            window.workoutState?.clear?.();
            if (window.workoutEngine) window.workoutEngine.state = null;
            const bar = document.getElementById('globalTrainingBar');
            bar?.classList.add('hidden');
        });
        await delay(180);
    }
    await page.evaluate(() => {
        document.getElementById('v7PerfStreamTarget')?.remove();
        document.getElementById('v7PerfChartTarget')?.remove();
    });
    return metrics;
}

function summarize(samples) {
    const numeric = ['durationMs', 'longTaskMs', 'loafMs', 'activeRaf', 'activeTimeouts', 'activeIntervals',
        'mutationObservers', 'resizeObservers', 'windowListeners', 'documentListeners', 'domNodes',
        'visibleBackdrops', 'nestedBackdrops', 'runningAnimations', 'permanentWillChange', 'transferKb', 'resourceCount'];
    const result = {};
    for (const key of numeric) result[key] = Number(median(samples.map((sample) => Number(sample[key] || 0))).toFixed(2));
    result.frameMedianMs = Number(median(samples.map((sample) => sample.frame.medianMs)).toFixed(2));
    result.frameP95Ms = Number(median(samples.map((sample) => sample.frame.p95Ms)).toFixed(2));
    result.frameOver32ms = Number(median(samples.map((sample) => sample.frame.over32ms)).toFixed(2));
    result.effectMode = samples[0]?.effectMode || '';
    return result;
}

function validateRender(rows) {
    const failures = [];
    for (const row of rows) {
        if (row.median.longTaskMs > 350) failures.push(`${row.scenario}: long tasks ${row.median.longTaskMs}ms > 350ms`);
        if (row.median.frameP95Ms > 80) failures.push(`${row.scenario}: frame p95 ${row.median.frameP95Ms}ms > 80ms`);
        if (row.median.domNodes > 5000) failures.push(`${row.scenario}: DOM ${row.median.domNodes} > 5000`);
        if (row.median.nestedBackdrops > 0) failures.push(`${row.scenario}: nested backdrops ${row.median.nestedBackdrops} > 0`);
    }
    return failures;
}

function validateEffects(rows) {
    const failures = [];
    for (const row of rows) {
        const balanced = row.balanced;
        const economy = row.economy;
        if (balanced.visibleBackdrops > 2) failures.push(`${row.scenario}: balanced backdrops ${balanced.visibleBackdrops} > 2`);
        if (economy.visibleBackdrops > 0) failures.push(`${row.scenario}: economy backdrops ${economy.visibleBackdrops} > 0`);
        if (balanced.nestedBackdrops > 0 || economy.nestedBackdrops > 0) failures.push(`${row.scenario}: nested backdrop detected`);
        if (economy.runningAnimations > balanced.runningAnimations) failures.push(`${row.scenario}: economy animations exceed balanced`);
        if (economy.permanentWillChange > 0) failures.push(`${row.scenario}: economy permanent will-change ${economy.permanentWillChange}`);
    }
    return failures;
}

async function main() {
    const suite = option('suite', 'render');
    if (!['render', 'effects'].includes(suite)) throw new Error(`Unknown suite: ${suite}`);
    const runs = numberOption('runs', suite === 'render' ? 3 : 2);
    const requestedScenario = option('scenario', '');
    const http = await startServer();
    const launch = await launchAuditBrowser(chromium, { headless: true });
    const browser = launch.browser;
    const pageErrors = [];
    try {
        const context = await browser.newContext({
            serviceWorkers: 'block',
            viewport: { width: 390, height: 844 },
            reducedMotion: 'no-preference'
        });
        await context.route(/kaspersky-labs\.com/i, (route) => route.abort());
        const page = await context.newPage();
        page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));
        await page.addInitScript(PROBE_SCRIPT);
        await page.goto(http.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitBoot(page);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Performance.enable');

        for (const pageId of ['workout', 'records', 'ai-coach', 'profile', 'today']) {
            console.log(`v7-perf-${suite}: warm ${pageId}`);
            await navigate(page, pageId);
        }

        let rows = [];
        if (suite === 'render') {
            await setEffects(page, 'balanced');
            const names = requestedScenario
                ? [requestedScenario]
                : ['today-idle', 'today-scroll', 'tab-switching', 'workout-idle', 'records-chart-scroll',
                    'coach-streaming', 'profile-scroll', 'modal-sheet', 'workout-running'];
            for (const name of names) {
                if (!scenarios[name]) throw new Error(`Unknown scenario: ${name}`);
                const scenarioRuns = name === 'workout-running' ? 1 : runs;
                console.log(`v7-perf-${suite}: ${name} (${scenarioRuns} run${scenarioRuns === 1 ? '' : 's'})`);
                const samples = [];
                for (let run = 0; run < scenarioRuns; run += 1) {
                    console.log(`v7-perf-${suite}: ${name} run ${run + 1}/${scenarioRuns}`);
                    samples.push(await runScenario(page, cdp, name));
                }
                rows.push({ scenario: name, median: summarize(samples), samples });
            }
        } else {
            const focus = requestedScenario
                ? [requestedScenario]
                : ['today-idle', 'records-chart-scroll', 'coach-streaming', 'modal-sheet', 'workout-running'];
            for (const name of focus) {
                const modes = {};
                for (const mode of ['balanced', 'economy']) {
                    const scenarioRuns = name === 'workout-running' ? 1 : runs;
                    console.log(`v7-perf-${suite}: ${name} ${mode} (${scenarioRuns} run${scenarioRuns === 1 ? '' : 's'})`);
                    let runPage = page;
                    let runCdp = cdp;
                    let disposablePage = false;
                    if (name === 'workout-running' && mode === 'economy') {
                        runPage = await context.newPage();
                        disposablePage = true;
                        runPage.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));
                        await runPage.addInitScript(PROBE_SCRIPT);
                        await runPage.goto(http.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                        await waitBoot(runPage);
                        runCdp = await context.newCDPSession(runPage);
                        await runCdp.send('Performance.enable');
                    }
                    await setEffects(runPage, mode);
                    const samples = [];
                    for (let run = 0; run < scenarioRuns; run += 1) {
                        samples.push(await runScenario(runPage, runCdp, name));
                    }
                    modes[mode] = summarize(samples);
                    if (disposablePage) await runPage.close();
                }
                rows.push({ scenario: name, ...modes });
            }
        }

        const gpu = await browser.newBrowserCDPSession().then((session) => session.send('SystemInfo.getInfo')).catch(() => null);
        const failures = suite === 'render' ? validateRender(rows) : validateEffects(rows);
        const report = {
            suite,
            generatedAt: new Date().toISOString(),
            browser: { channel: launch.channel, version: browser.version() },
            launchPolicy: { gpuDisabled: false, extensionsDisabled: true, isolatedProfile: true, headless: true },
            gpu: gpu?.gpu?.auxAttributes || null,
            viewport: { width: 390, height: 844 },
            runsPerScenario: { default: runs, 'workout-running': 1 },
            blockedExternalPatterns,
            rows,
            pageErrors,
            failures,
            ok: failures.length === 0 && pageErrors.length === 0
        };
        await mkdir(path.join(root, '.tmp', 'v7-perf'), { recursive: true });
        await writeFile(path.join(root, '.tmp', 'v7-perf', `${suite}.json`), JSON.stringify(report, null, 2), 'utf8');
        console.log(JSON.stringify(report, null, 2));
        if (!report.ok) {
            console.error(`v7-perf-${suite}: FAIL\n${[...failures, ...pageErrors].map((item) => `  - ${item}`).join('\n')}`);
            process.exitCode = 1;
        } else {
            console.log(`v7-perf-${suite}: OK`);
        }
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
}

main().catch((error) => {
    console.error(`v7-render-perf: ERROR ${error?.stack || error}`);
    process.exitCode = 1;
});

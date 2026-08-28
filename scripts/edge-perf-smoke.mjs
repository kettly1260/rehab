// @ts-nocheck
// node scripts/edge-perf-smoke.mjs [--url=http://127.0.0.1:8080/index.html]
// Optional budgets: --max-scripts=70 --max-resources=95 --max-long-task-ms=180 --max-transfer-kb=1000
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchAuditBrowser } from '../test/helpers/browser-launch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

function argValue(name, fallback = '') {
    const prefix = `--${name}=`;
    const hit = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : fallback;
}

function numericOption(name, envName, fallback) {
    const value = Number(argValue(name, process.env[envName] || String(fallback)));
    return Number.isFinite(value) ? value : fallback;
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
    if (file.endsWith('.ico')) return 'image/x-icon';
    if (file.endsWith('.png')) return 'image/png';
    if (file.endsWith('.webp')) return 'image/webp';
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

const LONG_TASK_PROBE = `(() => {
    window.__edgePerfLongTasks = [];
    try {
        new PerformanceObserver((list) => {
            window.__edgePerfLongTasks.push(...list.getEntries().map((entry) => ({
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration,
                attribution: (entry.attribution || []).map((item) => ({
                    name: item.name || '', entryType: item.entryType || '',
                    startTime: item.startTime || 0, duration: item.duration || 0,
                    containerType: item.containerType || '', containerSrc: item.containerSrc || '',
                    containerId: item.containerId || '', containerName: item.containerName || ''
                }))
            })));
        }).observe({ type: 'longtask', buffered: true });
    } catch {}
})();`;

async function main() {
    const explicitUrl = argValue('url');
    const waitMs = numericOption('wait-ms', 'PERF_WAIT_MS', 500);
    const budgets = {
        scripts: numericOption('max-scripts', 'PERF_MAX_SCRIPTS', 70),
        resources: numericOption('max-resources', 'PERF_MAX_RESOURCES', 95),
        longTaskMs: numericOption('max-long-task-ms', 'PERF_MAX_LONG_TASK_MS', 180),
        transferKb: numericOption('max-transfer-kb', 'PERF_MAX_TRANSFER_KB', 1000)
    };
    const local = explicitUrl ? { url: explicitUrl, server: null } : await startServer();
    const launch = await launchAuditBrowser(chromium, {
        headless: true,
        args: ['--disable-gpu', '--disable-extensions', '--disable-background-networking', '--disable-component-update']
    });
    const browser = launch.browser;
    const exceptions = [];
    const consoleErrors = [];
    const requestFailures = [];
    let blockedExternalCount = 0;
    const blockedExternalPatterns = ['*://*.kaspersky-labs.com/*'];
    try {
        const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
        await context.route(/kaspersky-labs\.com/i, (route) => {
            blockedExternalCount += 1;
            return route.abort();
        });
        const page = await context.newPage();
        page.on('pageerror', (error) => exceptions.push(String(error?.message || error)));
        page.on('requestfailed', (request) => {
            if (/kaspersky-labs\.com/i.test(request.url())) return;
            requestFailures.push(`${request.url()}: ${request.failure()?.errorText || 'request failed'}`);
        });
        page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
        });
        await page.addInitScript(LONG_TASK_PROBE);
        await page.goto(local.url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForFunction(() => performance.getEntriesByName('boot:first-render', 'measure').length > 0, null, { timeout: 15000 }).catch(() => {});
        await delay(waitMs);

        const metrics = await page.evaluate(() => {
            const resources = performance.getEntriesByType('resource').map((entry) => ({
                name: entry.name,
                initiatorType: entry.initiatorType,
                transferSize: entry.transferSize || 0,
                startTime: entry.startTime || 0,
                responseEnd: entry.responseEnd || 0,
                duration: entry.duration || 0
            }));
            const scripts = new Set(resources.filter((entry) => entry.initiatorType === 'script').map((entry) => entry.name));
            document.querySelectorAll('script[src]').forEach((script) => scripts.add(script.src));
            return {
                scriptCount: scripts.size,
                resourceCount: resources.length,
                transferSize: resources.reduce((sum, entry) => sum + Number(entry.transferSize || 0), 0),
                longTasks: window.__edgePerfLongTasks || [],
                bootMeasures: performance.getEntriesByType('measure')
                    .filter((entry) => entry.name.startsWith('boot:'))
                    .map((entry) => ({ name: entry.name, duration: entry.duration })),
                fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
                largestResources: resources.slice().sort((a, b) => b.transferSize - a.transferSize).slice(0, 8),
                slowestResources: resources.slice().sort((a, b) => b.duration - a.duration).slice(0, 8)
            };
        });

        const transferKb = Math.round(metrics.transferSize / 1024);
        const longTaskMs = Math.round(metrics.longTasks.reduce((sum, task) => sum + Number(task.duration || 0), 0));
        const failures = [];
        if (metrics.scriptCount > budgets.scripts) failures.push(`scripts ${metrics.scriptCount} > ${budgets.scripts}`);
        if (metrics.resourceCount > budgets.resources) failures.push(`resources ${metrics.resourceCount} > ${budgets.resources}`);
        if (longTaskMs > budgets.longTaskMs) failures.push(`long task total ${longTaskMs}ms > ${budgets.longTaskMs}ms`);
        if (transferKb > budgets.transferKb) failures.push(`transfer ${transferKb}KB > ${budgets.transferKb}KB`);
        if (exceptions.length) failures.push(`runtime exceptions: ${exceptions.slice(0, 3).join(' | ')}`);
        const productConsoleErrors = consoleErrors.filter((message) => {
            return !(blockedExternalCount > 0 && message === 'Failed to load resource: net::ERR_FAILED');
        });
        if (requestFailures.length) failures.push(`request failures: ${requestFailures.slice(0, 3).join(' | ')}`);
        if (productConsoleErrors.length) failures.push(`console errors: ${productConsoleErrors.slice(0, 3).join(' | ')}`);
        console.log(JSON.stringify({
            url: local.url,
            browser: { channel: launch.channel, version: browser.version() },
            launchPolicy: { gpuDisabled: true, extensionsDisabled: true, isolatedProfile: true },
            scriptCount: metrics.scriptCount,
            resourceCount: metrics.resourceCount,
            longTaskCount: metrics.longTasks.length,
            longTaskMs,
            longTasks: metrics.longTasks,
            bootMeasures: metrics.bootMeasures,
            fcp: Math.round(metrics.fcp),
            transferKb,
            consoleErrors: productConsoleErrors,
            blockedExternalCount,
            requestFailures,
            blockedExternalPatterns,
            largestResources: metrics.largestResources,
            slowestResources: metrics.slowestResources,
            budgets
        }, null, 2));
        if (failures.length) {
            console.error(`edge-perf-smoke: FAIL\n${failures.map((item) => `  - ${item}`).join('\n')}`);
            process.exitCode = 1;
        } else {
            console.log('edge-perf-smoke: OK');
        }
    } finally {
        await browser.close();
        if (local.server) await new Promise((resolve) => local.server.close(resolve));
    }
}

main().catch((error) => {
    console.error(`edge-perf-smoke: ERROR ${error?.stack || error}`);
    process.exitCode = 1;
});

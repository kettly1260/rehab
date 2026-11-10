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
const evidenceRoot = path.join(root, '.tmp', 'v7-theme-matrix');

const pages = [
    { id: 'today', root: '#today', surface: '.today-readiness-card', cta: '.today-primary-launch' },
    { id: 'workout', root: '#workout', surface: '.v7-workout-readiness-card', cta: '#playBtn' },
    { id: 'records', root: '#records', surface: '.v7-records-summary' },
    { id: 'ai-coach', root: '#ai-coach', surface: '.ai-insight', cta: '.ai-send' },
    { id: 'profile', root: '#profile', surface: '.v7-profile-identity-card' }
];

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

async function snapshot(page, config) {
    return await page.evaluate(({ rootSelector, surfaceSelector, ctaSelector }) => {
        const parseColor = (value) => {
            const rgb = String(value || '').match(/rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/i);
            if (rgb) return rgb.slice(1, 4).map(Number);
            const srgb = String(value || '').match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
            if (srgb) return srgb.slice(1, 4).map((item) => Number(item) * 255);
            return null;
        };
        const luminance = (value) => {
            const rgb = parseColor(value);
            if (!rgb) return null;
            const channel = rgb.map((item) => {
                const n = item / 255;
                return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * channel[0] + 0.7152 * channel[1] + 0.0722 * channel[2];
        };
        const contrast = (a, b) => {
            const la = luminance(a);
            const lb = luminance(b);
            if (la == null || lb == null) return null;
            return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        };
        const rootNode = document.querySelector(rootSelector);
        const surface = rootNode?.querySelector(surfaceSelector);
        const cta = ctaSelector ? rootNode?.querySelector(ctaSelector) : null;
        const indicator = document.querySelector('.v7-bottom-nav__indicator');
        const rootStyle = getComputedStyle(document.documentElement);
        const surfaceStyle = surface ? getComputedStyle(surface) : null;
        const dangerProbe = document.createElement('span');
        dangerProbe.style.color = 'var(--v7-danger)';
        dangerProbe.style.position = 'fixed';
        dangerProbe.style.visibility = 'hidden';
        document.body.appendChild(dangerProbe);
        const dangerColor = getComputedStyle(dangerProbe).color;
        dangerProbe.remove();
        return {
            primary: rootStyle.getPropertyValue('--md-sys-primary').trim(),
            mode: document.documentElement.dataset.themeMode || document.documentElement.getAttribute('data-theme-mode'),
            surfaceBg: surfaceStyle?.backgroundColor || '',
            surfaceColor: surfaceStyle?.color || '',
            surfaceContrast: surfaceStyle ? contrast(surfaceStyle.color, surfaceStyle.backgroundColor) : null,
            dangerColor,
            indicatorBg: indicator ? getComputedStyle(indicator).backgroundColor : '',
            ctaBg: cta ? getComputedStyle(cta).backgroundColor : '',
            navCurrent: document.querySelector('.nav-item[aria-current="page"]')?.dataset.v7Page || '',
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
            surfaceVisible: !!surface?.getClientRects().length,
            effectAudit: window.rehabV7.effects.audit()
        };
    }, { rootSelector: config.root, surfaceSelector: config.surface, ctaSelector: config.cta || '' });
}

test('all five V7 pages keep neutral surfaces and responsive accents in light and dark themes', { timeout: 45000 }, async () => {
    await mkdir(evidenceRoot, { recursive: true });
    const http = await startServer();
    const pw = loadPlaywright();
    const { browser } = await launchAuditBrowser(pw.chromium);
    try {
        await Promise.all(pages.map(async (config) => {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
            const page = await context.newPage();
            const errors = [];
            page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
            try {
                await page.goto(`${http.base}/index.html#/${config.id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
                await page.waitForFunction((target) => window.rehabV7?.lifecycle?.activeId === target, config.id, { timeout: 45000 });
                await page.waitForSelector(`${config.root} ${config.surface}`, { timeout: 30000 });
                await page.evaluate((selector) => {
                    const rootNode = document.querySelector(selector);
                    if (rootNode) rootNode.scrollTop = 0;
                    theme.setPreset('green');
                    theme.setMode('light');
                }, config.root);
                await page.waitForTimeout(650);
                const light = await snapshot(page, config);

                await page.evaluate(() => { theme.setCustom('#b63868'); theme.setMode('dark'); });
                await page.waitForTimeout(650);
                const dark = await snapshot(page, config);
                await page.screenshot({ path: path.join(evidenceRoot, `${config.id}-rose-dark-390x844.png`), fullPage: false });

                assert.equal(light.mode, 'light');
                assert.equal(dark.mode, 'dark');
                assert.equal(light.navCurrent, config.id);
                assert.equal(dark.navCurrent, config.id);
                assert.equal(light.surfaceVisible, true);
                assert.equal(dark.surfaceVisible, true);
                assert.ok(light.overflow <= 1, `${config.id} light overflow=${light.overflow}`);
                assert.ok(dark.overflow <= 1, `${config.id} dark overflow=${dark.overflow}`);
                assert.notEqual(light.primary, dark.primary, `${config.id} accent did not change`);
                assert.notEqual(light.indicatorBg, dark.indicatorBg, `${config.id} nav indicator did not follow accent`);
                assert.notEqual(light.surfaceBg, light.primary, `${config.id} light surface collapsed into accent`);
                assert.notEqual(dark.surfaceBg, dark.primary, `${config.id} dark surface collapsed into accent`);
                assert.notEqual(light.surfaceColor, light.surfaceBg, `${config.id} light text/surface collapsed`);
                assert.notEqual(dark.surfaceColor, dark.surfaceBg, `${config.id} dark text/surface collapsed`);
                assert.ok(light.surfaceContrast >= 4.5, `${config.id} light contrast=${light.surfaceContrast}`);
                assert.ok(dark.surfaceContrast >= 4.5, `${config.id} dark contrast=${dark.surfaceContrast}`);
                assert.notEqual(light.dangerColor, light.primary, `${config.id} light semantic danger collapsed into accent`);
                assert.notEqual(dark.dangerColor, dark.primary, `${config.id} dark semantic danger collapsed into accent`);
                if (config.cta) assert.notEqual(light.ctaBg, dark.ctaBg, `${config.id} primary action did not follow accent`);
                assert.equal(light.effectAudit?.nestedBackdropCandidates, 0);
                assert.equal(dark.effectAudit?.nestedBackdropCandidates, 0);
                assert.ok(light.effectAudit?.visibleBackdropCandidates <= 2);
                assert.ok(dark.effectAudit?.visibleBackdropCandidates <= 2);
                assert.deepEqual(errors, []);
            } finally {
                await context.close();
            }
        }));
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

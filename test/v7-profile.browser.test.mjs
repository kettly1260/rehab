// @ts-nocheck
import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { launchAuditBrowser } from './helpers/browser-launch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceRoot = path.join(root, '.tmp', 'v7-profile');

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

async function startServer() {
    const server = createServer(async (req, res) => {
        try {
            const rawUrl = new URL(req.url || '/', 'http://127.0.0.1');
            const pathname = decodeURIComponent(rawUrl.pathname === '/' ? '/index.html' : rawUrl.pathname);
            const resolved = path.resolve(root, `.${pathname}`);
            const info = await stat(resolved);
            if (!resolved.startsWith(root) || !info.isFile()) throw new Error('not found');
            const type = resolved.endsWith('.html') ? 'text/html; charset=utf-8'
                : resolved.endsWith('.js') || resolved.endsWith('.mjs') ? 'text/javascript; charset=utf-8'
                    : resolved.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/octet-stream';
            res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
            createReadStream(resolved).pipe(res);
        } catch {
            res.writeHead(404);
            res.end('Not found');
        }
    });
    const port = await freePort();
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
    return { server, url: `http://127.0.0.1:${port}/index.html` };
}

test('V7 Profile exposes the full settings inventory and preserves nested back navigation', async () => {
    await mkdir(evidenceRoot, { recursive: true });
    const http = await startServer();
    const pw = await import('playwright');
    const { browser } = await launchAuditBrowser(pw.chromium);
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(`${http.url}#/profile`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => document.querySelector('#profile.v7-feature-profile') && window.rehabV7?.lifecycle?.activeId === 'profile', null, { timeout: 45000 });
        await page.waitForFunction(() => typeof window.data?.openProfileModal === 'function');

        const home = await page.evaluate(() => ({
            text: document.querySelector('#profileOverview')?.textContent || '',
            view: document.querySelector('#profile')?.dataset.v7ProfileView,
            backdrop: getComputedStyle(document.querySelector('#profile .profile-hero')).backdropFilter,
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
        }));
        assert.equal(home.view, 'home');
        for (const label of ['健康档案', 'AI 设置', '云端同步', '实验功能', '目标', '方案 / 动作库', '语音', '外观与偏好', '调试工具', '检测更新']) {
            assert.match(home.text, new RegExp(label));
        }
        assert.equal(home.backdrop, 'none');
        assert.ok(home.overflow <= 1);

        await page.evaluate(() => window.data.openProfileModal());
        await page.waitForSelector('#profileModal');
        await page.evaluate(() => window.data.closeProfileModal());

        await page.evaluate(() => window.data.setRoutineView('weightloss'));
        await page.waitForFunction(() => document.querySelector('#profile')?.dataset.v7ProfileView === 'weightloss');
        assert.match(page.url(), /#\/profile\/weightloss$/);

        await page.evaluate(() => window.data.setRoutineView('library'));
        await page.waitForFunction(() => document.querySelector('#profile')?.dataset.v7ProfileView === 'library');
        await page.waitForSelector('#profileContent [data-library-view]');

        await page.goBack({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelector('#profile')?.dataset.v7ProfileView === 'home');

        await page.evaluate(() => window.data.setRoutineView('library'));
        await page.waitForFunction(() => document.querySelector('#profile')?.dataset.v7ProfileView === 'library');
        await page.evaluate(() => window.navStack.requestClose('subtab', 'routine'));
        await page.waitForFunction(() => document.querySelector('#profile')?.dataset.v7ProfileView === 'home');

        await page.evaluate(() => window.data.setRoutineView('ai'));
        await page.waitForFunction(() => document.querySelector('#profile')?.dataset.v7ProfileView === 'ai');
        await page.waitForSelector('#profileSettings [data-settings="ai"]:not(.hidden)');
        await page.evaluate(() => window.searchSettings.open());
        await page.waitForSelector('#searchProviderManager:not(.hidden)');
        await page.evaluate(() => window.searchSettings.close());

        await page.evaluate(() => window.data.setRoutineView('sync'));
        await page.waitForSelector('#profileSettings [data-settings="sync"]:not(.hidden)');
        assert.equal(await page.locator('#profileSettings [data-settings="sync"] button').count() >= 6, true);

        await page.evaluate(() => window.data.setRoutineView('experiments'));
        await page.waitForSelector('#profileSettings [data-settings="experiments"]:not(.hidden)');

        await page.evaluate(() => window.data.setRoutineView('home'));
        await page.evaluate(() => window.workoutVoice.openSettings());
        await page.waitForSelector('#voiceSettingsSheet:not(.hidden)');
        await page.evaluate(() => window.workoutVoice.closeSettings());
        await page.locator('#profile .theme-trigger').click();
        await page.waitForSelector('#themeSheet:not(.hidden)');
        await page.locator('#themeSheet [data-modal-close]').click();

        await page.screenshot({ path: path.join(evidenceRoot, 'profile-390x844.png'), fullPage: true });
        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

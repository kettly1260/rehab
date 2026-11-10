// @ts-nocheck
/* global theme */
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

        await page.evaluate(() => {
            const today = window.data.logicalDateKey();
            const dateOffset = (days) => {
                const date = window.data.dateFromKey(today);
                date.setDate(date.getDate() + days);
                return window.data.dateKey(date);
            };
            window.data.db.profile = { ...(window.data.db.profile || {}), name: 'R', height: 175 };
            window.data.db.health.weights = [{ id: 'v7-profile-weight', date: today, weight: 69.9, updatedAt: 10 }];
            window.data.db.history = [0, -2, -4].map((offset, index) => ({
                id: `v7-profile-history-${index}`,
                date: `${dateOffset(offset)} 18:00`,
                duration: 1800,
                type: 'strength',
                actions: [],
                updatedAt: index + 1
            }));
            window.data.db.dailyPlans = [{
                id: 'v7-profile-rehab-plan',
                date: today,
                type: 'rehab',
                title: '康复计划',
                items: [{
                    id: 'v7-profile-item',
                    name: '肩部活动',
                    status: 'done',
                    feedback: { painScore: 2, doneAt: Date.now() }
                }],
                updatedAt: Date.now()
            }];
            window.data.renderProfilePage();
        });
        await page.waitForFunction(() => document.querySelector('#profile .v7-profile-home')?.textContent?.includes('69.9'));

        const home = await page.evaluate(() => ({
            text: document.querySelector('#profileOverview')?.textContent || '',
            view: document.querySelector('#profile')?.dataset.v7ProfileView,
            backdrop: getComputedStyle(document.querySelector('#profile .v7-profile-card')).backdropFilter,
            serviceLabels: [...document.querySelectorAll('#profile .v7-profile-service-row b')].map((node) => node.textContent.trim()),
            identityMetrics: [...document.querySelectorAll('#profile .v7-profile-identity-stats b')].map((node) => node.textContent.trim()),
            healthMetrics: [...document.querySelectorAll('#profile .v7-profile-health-metrics b')].map((node) => node.textContent.trim()),
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
            bottomClearance: (() => {
                const status = document.querySelector('#profile .v7-profile-status-card');
                const nav = document.querySelector('.v7-bottom-nav');
                return status && nav ? nav.getBoundingClientRect().top - status.getBoundingClientRect().bottom : -1;
            })()
        }));
        assert.equal(home.view, 'home');
        for (const label of ['训练档案', '恢复训练', '健康档案', '训练计划', 'AI 设置与语音', '设备与同步', '外观与偏好', '实验功能', '目标', '语音', '调试工具', '检测更新']) {
            assert.match(home.text, new RegExp(label));
        }
        assert.equal(home.backdrop, 'none');
        assert.deepEqual(home.serviceLabels, ['训练计划', 'AI 设置与语音', '设备与同步', '外观与偏好']);
        assert.match(home.identityMetrics[0], /69\.9/);
        assert.equal(home.identityMetrics[1], '3 次');
        assert.match(home.healthMetrics[0], /175/);
        assert.match(home.healthMetrics[1], /69\.9/);
        assert.equal(home.healthMetrics[2], '恢复训练');
        assert.ok(home.overflow <= 1);
        assert.ok(home.bottomClearance >= 4, `Profile status/nav overlap=${-home.bottomClearance}`);

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
        await page.locator('#profile .v7-profile-service-row', { hasText: '外观与偏好' }).click();
        await page.waitForSelector('#themeSheet:not(.hidden)');
        const appearance = await page.evaluate(() => ({
            presets: document.querySelectorAll('#themeSheet [data-theme]').length,
            custom: !!document.querySelector('#themeSheet #themeColorSheet'),
            colorModes: document.querySelectorAll('#themeSheet [data-color-mode]').length,
            monet: !!document.querySelector('#themeSheet .theme-monet'),
            effects: [...document.querySelectorAll('#themeSheet [data-v7-effects-mode]')].map((button) => button.dataset.v7EffectsMode)
        }));
        assert.ok(appearance.presets >= 5);
        assert.equal(appearance.custom, true);
        assert.equal(appearance.colorModes, 3);
        assert.equal(appearance.monet, true);
        assert.deepEqual(appearance.effects, ['full', 'balanced', 'economy']);
        await page.locator('#themeSheet [data-v7-effects-mode="full"]').click();
        assert.equal(await page.evaluate(() => document.documentElement.dataset.v7Effects), 'full');
        await page.locator('#themeSheet [data-v7-effects-mode="economy"]').click();
        assert.equal(await page.evaluate(() => document.documentElement.dataset.v7Effects), 'economy');
        await page.locator('#themeSheet [data-v7-effects-mode="balanced"]').click();
        assert.equal(await page.evaluate(() => document.documentElement.dataset.v7Effects), 'balanced');
        await page.locator('#themeSheet [data-modal-close]').click();

        await page.evaluate(() => {
            theme.setPreset('green');
            const root = document.getElementById('profile');
            if (root) root.scrollTop = 0;
        });
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(evidenceRoot, 'profile-390x844.png'), fullPage: true });
        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

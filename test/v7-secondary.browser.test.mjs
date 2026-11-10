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
const evidenceRoot = path.join(root, '.tmp', 'v7-secondary');

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
                    : resolved.endsWith('.css') ? 'text/css; charset=utf-8'
                        : resolved.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/octet-stream';
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

test('V7 secondary surfaces preserve nested back, focus, backdrop, scroll lock and state visuals', async () => {
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
        await page.waitForFunction(() => window.rehabV7?.secondarySurfaces && window.workoutVoice?.openSettings, null, { timeout: 45000 });
        await page.waitForFunction(() => document.querySelector('#voiceSettingsSheet')?.dataset.v7Secondary === 'sheet');

        await page.evaluate(() => window.workoutVoice.openSettings());
        await page.waitForSelector('#voiceSettingsSheet:not(.hidden)');
        await page.waitForFunction(() => document.body.style.overflow === 'hidden');
        const sheet = await page.evaluate(() => ({
            kind: document.querySelector('#voiceSettingsSheet')?.dataset.v7Secondary,
            role: document.querySelector('#voiceSettingsSheet')?.getAttribute('role'),
            modal: document.querySelector('#voiceSettingsSheet')?.getAttribute('aria-modal'),
            bodyOverflow: document.body.style.overflow,
            backdrop: getComputedStyle(document.querySelector('#voiceSettingsSheet .md-modal-backdrop')).backdropFilter,
            cardBackdrop: getComputedStyle(document.querySelector('#voiceSettingsSheet .md-modal-card')).backdropFilter,
            focusInside: document.querySelector('#voiceSettingsSheet')?.contains(document.activeElement),
            effectAudit: window.rehabV7.effects.audit()
        }));
        assert.equal(sheet.kind, 'sheet');
        assert.equal(sheet.role, 'dialog');
        assert.equal(sheet.modal, 'true');
        assert.equal(sheet.bodyOverflow, 'hidden');
        assert.match(sheet.backdrop, /blur\(6px\)/);
        assert.equal(sheet.cardBackdrop, 'none');
        assert.equal(sheet.focusInside, true);
        assert.equal(sheet.effectAudit?.nestedBackdropCandidates, 0);
        assert.ok(sheet.effectAudit?.visibleBackdropCandidates <= 2);
        assert.equal(sheet.effectAudit?.withinBudget, true);
        await page.evaluate(() => window.rehabV7.effects.setMode('economy'));
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#voiceSettingsSheet .md-modal-backdrop')).backdropFilter), 'none');
        await page.evaluate(() => window.rehabV7.effects.setMode('balanced'));
        await page.screenshot({ path: path.join(evidenceRoot, 'voice-sheet-390x844.png'), fullPage: false });

        await page.evaluate(() => window.workoutVoice.openImportDialog());
        await page.waitForSelector('#voiceImportDialog:not(.hidden)');
        assert.equal(await page.evaluate(() => window.navStack.top()?.id), 'voiceImportDialog');
        await page.goBack();
        await page.waitForFunction(() => document.querySelector('#voiceImportDialog')?.classList.contains('hidden'));
        assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
        assert.equal(await page.evaluate(() => document.querySelector('#voiceSettingsSheet')?.contains(document.activeElement)), true);
        await page.goBack();
        await page.waitForFunction(() => document.querySelector('#voiceSettingsSheet')?.classList.contains('hidden'));
        await page.waitForFunction(() => document.body.style.overflow !== 'hidden');
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');

        await page.evaluate(async () => {
            await window.data._openModal({
                title: '确认操作',
                icon: 'check_circle',
                bodyHtml: '<p id="v7ConfirmCopy">保留现有确认语义</p>',
                actionsHtml: '<button class="md-btn" data-modal-close type="button">取消</button><button class="md-btn md-btn-filled" type="button">确定</button>'
            });
        });
        await page.waitForSelector('.md-modal[data-rl-modal="1"][data-v7-secondary="modal"]');
        await page.screenshot({ path: path.join(evidenceRoot, 'modal-390x844.png'), fullPage: false });
        await page.locator('.md-modal[data-rl-modal="1"] .md-modal-backdrop').click({ position: { x: 4, y: 4 } });
        await page.waitForFunction(() => !document.querySelector('.md-modal[data-rl-modal="1"]'));

        await page.evaluate(() => {
            window.toast.show('Secondary toast', 'success', 5000);
            const banner = document.getElementById('appUpdateBanner');
            banner.classList.remove('hidden');
            banner.setAttribute('aria-hidden', 'false');
            const preview = document.createElement('div');
            preview.id = 'v7AttachmentPreview';
            preview.className = 'advice-attachment-preview hidden';
            preview.innerHTML = '<div class="advice-attachment-preview-backdrop"></div><div class="advice-attachment-preview-card"><button data-modal-close type="button">关闭</button></div>';
            document.body.appendChild(preview);
            const states = [
                ['v7Loading', 'skeleton', ''],
                ['v7Empty', 'empty-state', ''],
                ['v7Error', 'advice-error', ''],
                ['v7Offline', 'ai-offline-note', ''],
                ['v7Permission', '', 'permission']
            ];
            states.forEach(([id, className, state]) => {
                const node = document.createElement('div');
                node.id = id;
                node.className = className;
                if (state) node.dataset.v7SecondaryState = state;
                document.body.appendChild(node);
            });
        });
        await page.waitForFunction(() => document.querySelector('#v7Permission')?.dataset.v7Secondary === 'permission');
        const states = await page.evaluate(() => ({
            toast: document.querySelector('#appToast')?.dataset.v7Secondary,
            banner: document.querySelector('#appUpdateBanner')?.dataset.v7Secondary,
            preview: document.querySelector('#v7AttachmentPreview')?.dataset.v7Secondary,
            loading: document.querySelector('#v7Loading')?.dataset.v7Secondary,
            empty: document.querySelector('#v7Empty')?.dataset.v7Secondary,
            error: document.querySelector('#v7Error')?.dataset.v7Secondary,
            offline: document.querySelector('#v7Offline')?.dataset.v7Secondary,
            permission: document.querySelector('#v7Permission')?.dataset.v7Secondary,
            picker: document.querySelector('#aiModelPickerSheet')?.dataset.v7Secondary,
            keyboard: document.documentElement.dataset.v7Keyboard,
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
        }));
        assert.deepEqual(states, {
            toast: 'toast', banner: 'banner', preview: 'preview', loading: 'loading', empty: 'empty',
            error: 'error', offline: 'offline', permission: 'permission', picker: 'picker', keyboard: 'hidden', overflow: 0
        });
        const bannerGeometry = await page.evaluate(() => {
            const banner = document.getElementById('appUpdateBanner');
            const buttons = [...banner.querySelectorAll('.md-btn')].map((button) => button.getBoundingClientRect());
            const rect = banner.getBoundingClientRect();
            return {
                height: rect.height,
                buttonY: buttons.map((value) => value.y),
                buttonHeight: buttons.map((value) => value.height)
            };
        });
        assert.ok(bannerGeometry.height <= 110, `update banner height=${bannerGeometry.height}`);
        assert.ok(Math.abs(bannerGeometry.buttonY[0] - bannerGeometry.buttonY[1]) <= 1);
        assert.ok(bannerGeometry.buttonHeight.every((value) => value <= 38));
        await page.screenshot({ path: path.join(evidenceRoot, 'banner-toast-390x844.png'), fullPage: false });
        await page.evaluate(() => {
            document.getElementById('appUpdateBanner')?.classList.add('hidden');
            document.getElementById('appToast')?.classList.remove('show');
            ['v7AttachmentPreview', 'v7Loading', 'v7Empty', 'v7Error', 'v7Offline', 'v7Permission'].forEach((id) => document.getElementById(id)?.remove());
        });
        await page.waitForFunction(() => Number.parseFloat(getComputedStyle(document.getElementById('appToast')).opacity) === 0);
        await page.locator('#profile .theme-trigger').click();
        await page.waitForSelector('#themeSheet:not(.hidden)');
        await page.screenshot({ path: path.join(evidenceRoot, 'theme-sheet-390x844.png'), fullPage: false });
        await page.locator('#themeSheet [data-modal-close]').click();

        await page.evaluate(async () => {
            const nav = [...document.querySelectorAll('.nav-item')].find((item) => item.dataset.v7Page === 'ai-coach');
            await window.ui.tab('ai-coach', nav);
        });
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'ai-coach' && typeof window.data?.openAdviceModelPicker === 'function', null, { timeout: 30000 });
        await page.evaluate(() => window.data.openAdviceModelPicker());
        await page.waitForSelector('#aiModelPickerSheet:not(.hidden)');
        await page.screenshot({ path: path.join(evidenceRoot, 'model-picker-390x844.png'), fullPage: false });
        await page.evaluate(() => window.data.closeAdviceModelPicker());
        await page.evaluate(async () => {
            const file = new File(['secondary attachment'], 'plan-note.txt', { type: 'text/plain' });
            await window.data.handleAdviceSelectedFiles([file], 'file');
        });
        await page.waitForSelector('#ai-coach .advice-attachment-chip');
        await page.screenshot({ path: path.join(evidenceRoot, 'attachments-390x844.png'), fullPage: false });
        await page.evaluate(() => window.data.clearAdviceAttachments());

        await page.evaluate(async () => {
            const nav = [...document.querySelectorAll('.nav-item')].find((item) => item.dataset.v7Page === 'profile');
            await window.ui.tab('profile', nav);
        });
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'profile' && typeof window.searchSettings?.open === 'function', null, { timeout: 30000 });
        await page.evaluate(() => {
            window.data.setRoutineView('ai');
            window.searchSettings.open();
        });
        await page.waitForSelector('#searchProviderManager:not(.hidden)');
        const managerLayer = await page.evaluate(() => ({
            manager: Number(getComputedStyle(document.querySelector('#searchProviderManager')).zIndex || 0),
            nav: Number(getComputedStyle(document.querySelector('.v7-bottom-nav')).zIndex || 0),
            navVisibility: getComputedStyle(document.querySelector('.v7-bottom-nav')).visibility,
            managerBottom: document.querySelector('#searchProviderManager').getBoundingClientRect().bottom,
            viewportBottom: innerHeight
        }));
        assert.ok(managerLayer.manager > managerLayer.nav);
        assert.equal(managerLayer.navVisibility, 'hidden');
        assert.ok(managerLayer.managerBottom >= managerLayer.viewportBottom - 1);
        await page.screenshot({ path: path.join(evidenceRoot, 'search-manager-390x844.png'), fullPage: false });
        await page.evaluate(() => window.searchSettings.close());
        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

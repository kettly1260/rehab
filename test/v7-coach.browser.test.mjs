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
const evidenceRoot = path.join(root, '.tmp', 'v7-coach');

async function freePort() {
    return await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            server.close(() => resolve(port));
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

test('V7 Coach renders a stable chat surface and survives active-stream route changes', { timeout: 25000 }, async () => {
    await mkdir(evidenceRoot, { recursive: true });
    const http = await startServer();
    const pw = await import('playwright');
    const { browser } = await launchAuditBrowser(pw.chromium);
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        page.setDefaultTimeout(5000);
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(`${http.url}#/ai-coach`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => document.querySelector('#ai-coach.v7-feature-coach') && window.rehabV7?.lifecycle?.activeId === 'ai-coach', null, { timeout: 45000 });

        await page.evaluate(() => {
            const day = window.data.logicalDateKey();
            window.data.db.health.aiAdviceChat = [
                { id: 'v7-user', role: 'user', content: '今天肩部有一点紧，训练要调整吗？', at: `${day}T08:00:00.000Z`, updatedAt: 1 },
                { id: 'v7-assistant', role: 'assistant', content: '建议轻微调整，不需要取消训练。\n\n- 主训练负荷降低约 10%\n- 保留核心稳定与下肢动作\n- 肩部推举改为疼痛范围内活动\n- 结束后增加 8-10 分钟放松', at: `${day}T08:01:00.000Z`, updatedAt: 2, searchEvidence: [{ title: '训练证据', url: 'https://example.com/evidence' }] }
            ];
            window.data.adviceRange = 'today';
            window.data.renderAiCoachPage();
        });
        await page.waitForSelector('#ai-coach .advice-bubble');
        await page.waitForFunction(() => document.querySelectorAll('#ai-coach .v7-coach-action-toggle').length >= 2);
        const initial = await page.evaluate(() => ({
            bubbles: document.querySelectorAll('#ai-coach .advice-bubble').length,
            root: document.querySelector('#ai-coach')?.dataset.v7Feature,
            bubbleBackdrop: getComputedStyle(document.querySelector('#ai-coach .advice-bubble')).backdropFilter,
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
            railDisplay: getComputedStyle(document.querySelector('#ai-coach .advice-scroll-rail')).display,
            modelVisible: document.querySelector('#ai-coach .v7-coach-model-entry')?.getClientRects().length > 0,
            modelHasIcon: !!document.querySelector('#ai-coach .v7-coach-model-entry .advice-model-icon'),
            modelText: document.querySelector('#ai-coach .v7-coach-model-entry .v7-coach-model-name')?.textContent?.trim() || '',
            composerReasoning: document.querySelectorAll('#ai-coach .advice-composer-stack .advice-reasoning-chip').length,
            promptWidths: [...document.querySelectorAll('#ai-coach .v7-coach-suggestion-controls > button')].slice(0, 3).map((button) => button.getBoundingClientRect().width),
            promptLabels: [...document.querySelectorAll('#ai-coach .v7-coach-suggestion-controls > button')].slice(0, 3).map((button) => button.textContent.trim()),
            actionToggles: document.querySelectorAll('#ai-coach .v7-coach-action-toggle').length,
            actionsDisplay: getComputedStyle(document.querySelector('#ai-coach .advice-bubble-actions')).display,
            composerClearance: (() => {
                const composer = document.querySelector('#ai-coach .advice-composer-stack');
                const nav = document.querySelector('.v7-bottom-nav');
                return composer && nav ? nav.getBoundingClientRect().top - composer.getBoundingClientRect().bottom : -1;
            })()
        }));
        assert.equal(initial.root, 'ai-coach');
        assert.ok(initial.bubbles >= 2);
        assert.equal(initial.bubbleBackdrop, 'none');
        assert.ok(initial.overflow <= 1);
        assert.equal(initial.railDisplay, 'none');
        assert.equal(initial.modelVisible, true);
        assert.equal(initial.modelHasIcon, true);
        assert.ok(initial.modelText.length > 0);
        assert.equal(initial.composerReasoning, 0);

        await page.evaluate(() => {
            if (window.ai?.cfg) {
                window.ai.cfg.provider = 'deepseek';
                window.ai.cfg.model = 'deepseek-chat';
            }
            window.data.refreshAdviceModelChip?.();
        });
        await page.waitForFunction(() => document.querySelector('#ai-coach .v7-coach-model-entry .v7-coach-model-name')?.textContent?.includes('deepseek-chat'));
        assert.equal(await page.evaluate(() => document.querySelector('#ai-coach .v7-coach-model-entry .v7-coach-model-name')?.textContent?.trim()), 'deepseek-chat');
        assert.match(await page.evaluate(() => document.querySelector('#ai-coach .v7-coach-model-entry .advice-model-icon')?.getAttribute('src') || ''), /deepseek/i);
        assert.equal(initial.promptWidths.length, 3);
        assert.ok(Math.max(...initial.promptWidths) - Math.min(...initial.promptWidths) <= 1);
        assert.ok(initial.promptLabels.every((label) => label.length > 0 && label.length <= 8));
        assert.ok(initial.actionToggles >= 2);
        assert.equal(initial.actionsDisplay, 'none');
        assert.ok(initial.composerClearance >= 6, `Coach composer/nav overlap=${-initial.composerClearance}`);

        await page.locator('#ai-coach .v7-coach-action-toggle').first().click();
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#ai-coach .advice-bubble.v7-actions-open .advice-bubble-actions')).display), 'flex');
        await page.locator('#ai-coach .v7-coach-action-toggle').first().click();
        assert.equal(await page.evaluate(() => document.querySelectorAll('#ai-coach .advice-bubble.v7-actions-open').length), 0);

        const themeBefore = await page.evaluate(() => {
            const send = document.querySelector('#ai-coach .ai-send');
            const rootStyles = getComputedStyle(document.documentElement);
            return {
                primary: rootStyles.getPropertyValue('--v7-primary').trim(),
                send: getComputedStyle(send).backgroundColor
            };
        });
        await page.evaluate(() => theme.setCustom('#d04a7a'));
        await page.waitForTimeout(350);
        const themeResponse = await page.evaluate(() => {
            const send = document.querySelector('#ai-coach .ai-send');
            const rootStyles = getComputedStyle(document.documentElement);
            const after = getComputedStyle(send).backgroundColor;
            document.documentElement.dataset.v7Effects = 'economy';
            const composerBackdrop = getComputedStyle(document.querySelector('#ai-coach .advice-composer-stack')).backdropFilter;
            document.documentElement.dataset.v7Effects = 'balanced';
            return { primary: rootStyles.getPropertyValue('--v7-primary').trim(), after, composerBackdrop };
        });
        assert.notEqual(themeBefore.primary, themeResponse.primary);
        assert.notEqual(themeBefore.send, themeResponse.after);
        assert.equal(themeResponse.composerBackdrop, 'none');
        await page.evaluate(() => theme.setPreset('green'));
        await page.waitForTimeout(350);

        await page.evaluate(() => window.data.openAdviceModelPicker());
        await page.waitForSelector('#aiModelPickerSheet:not(.hidden)');
        await page.evaluate(() => window.data.closeAdviceModelPicker());

        assert.equal(await page.locator('#ai-coach .v7-coach-advanced-tools').count(), 0);
        assert.equal(await page.locator('#ai-coach .v7-coach-usage-btn').count(), 1);
        assert.equal(await page.locator('#ai-coach .v7-coach-regenerate-btn').count(), 1);

        // Verify '+' button opens input tools menu (images, files, context)
        await page.locator('#ai-coach #adviceAttachButton').click();
        await page.waitForSelector('#ai-coach .v7-coach-plus-menu:not(.hidden)');
        assert.equal(await page.locator('#ai-coach .v7-coach-menu-item').count(), 3);
        await page.locator('#ai-coach #adviceAttachButton').click();
        await page.waitForSelector('#ai-coach .v7-coach-plus-menu', { state: 'hidden' });

        await page.evaluate(() => window.data.toggleAdviceSearch());
        await page.waitForSelector('#ai-coach #adviceSearchInput');
        await page.locator('#adviceSearchInput').fill('训练');
        await page.waitForTimeout(350);
        await page.evaluate(() => window.data.clearAdviceSearch());

        await page.evaluate(async () => {
            const file = new File(['coach attachment'], 'coach.txt', { type: 'text/plain' });
            await window.data.handleAdviceSelectedFiles([file], 'file');
        });
        assert.equal(await page.locator('#ai-coach .advice-attachment-chip').count() > 0, true);
        await page.evaluate(() => window.data.clearAdviceAttachments());

        await page.evaluate(() => {
            const list = document.querySelector('#ai-coach .advice-v6-chat-list');
            const pending = window.data.db.health.aiAdviceChat.find((item) => item.role === 'assistant');
            window.data._adviceSending = true;
            window.data._activeAdvicePendingId = pending.id;
            window.data._adviceAbortController = { abort() { window.__v7AbortCalls = (window.__v7AbortCalls || 0) + 1; } };
            const bubble = document.createElement('div');
            bubble.className = 'v7-stream-test-target';
            list.append(bubble);
            const renderer = window.adviceStreamRenderer.create(bubble, { renderMarkdown: (text) => `<span>${text}</span>` });
            renderer.seed('流式');
            renderer.enqueue(' 输出');
            window.data._activeStreamRenderer = renderer;
            window.data._streamRenderers = { [pending.id]: renderer };
            list.scrollTop = 0;
            window.data._adviceUserScrollIntent = true;
            window.data.pauseStreamForScroll();
        });
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => window.data._adviceUserScrollPaused), true);

        await page.evaluate(async () => {
            const nav = [...document.querySelectorAll('.nav-item')].find((item) => item.dataset.v7Page === 'today');
            await window.ui.tab('today', nav);
        });
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'today', null, { timeout: 30000 });
        const away = await page.evaluate(() => ({ aborts: window.__v7AbortCalls || 0, renderer: !!window.data._activeStreamRenderer }));
        assert.equal(away.aborts, 0);
        assert.equal(away.renderer, false);

        await page.evaluate(async () => {
            const nav = [...document.querySelectorAll('.nav-item')].find((item) => item.dataset.v7Page === 'ai-coach');
            await window.ui.tab('ai-coach', nav);
        });
        await page.waitForFunction(() => window.rehabV7?.lifecycle?.activeId === 'ai-coach', null, { timeout: 30000 });
        await page.evaluate(() => window.data.renderAiCoachPage());
        await page.waitForSelector('#ai-coach .advice-bubble');
        assert.equal(await page.locator('#ai-coach .advice-bubble').count() >= 2, true);
        await page.screenshot({ path: path.join(evidenceRoot, 'coach-390x844.png'), fullPage: true });
        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});

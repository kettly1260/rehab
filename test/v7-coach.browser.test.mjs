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

test('V7 Coach renders a stable chat surface and survives active-stream route changes', async () => {
    await mkdir(evidenceRoot, { recursive: true });
    const http = await startServer();
    const pw = await import('playwright');
    const { browser } = await launchAuditBrowser(pw.chromium);
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(`${http.url}#/ai-coach`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => document.querySelector('#ai-coach.v7-feature-coach') && window.rehabV7?.lifecycle?.activeId === 'ai-coach', null, { timeout: 45000 });

        await page.evaluate(() => {
            const day = window.data.logicalDateKey();
            window.data.db.health.aiAdviceChat = [
                { id: 'v7-user', role: 'user', content: '今天训练怎么安排？', at: `${day}T08:00:00.000Z`, updatedAt: 1 },
                { id: 'v7-assistant', role: 'assistant', content: '建议先完成热身，再做主训练。', at: `${day}T08:01:00.000Z`, updatedAt: 2, searchEvidence: [{ title: '训练证据', url: 'https://example.com/evidence' }] }
            ];
            window.data.adviceRange = 'today';
            window.data.renderAiCoachPage();
        });
        await page.waitForSelector('#ai-coach .advice-bubble');
        const initial = await page.evaluate(() => ({
            bubbles: document.querySelectorAll('#ai-coach .advice-bubble').length,
            root: document.querySelector('#ai-coach')?.dataset.v7Feature,
            bubbleBackdrop: getComputedStyle(document.querySelector('#ai-coach .advice-bubble')).backdropFilter,
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
        }));
        assert.equal(initial.root, 'ai-coach');
        assert.ok(initial.bubbles >= 2);
        assert.equal(initial.bubbleBackdrop, 'none');
        assert.ok(initial.overflow <= 1);

        await page.evaluate(() => window.data.openAdviceModelPicker());
        await page.waitForSelector('#aiModelPickerSheet:not(.hidden)');
        await page.evaluate(() => window.data.closeAdviceModelPicker());
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
            const bubble = document.querySelector(`[data-advice-id="${pending.id}"] .advice-bubble-content`)
                || document.querySelector('#ai-coach .advice-bubble.assistant .advice-bubble-content');
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

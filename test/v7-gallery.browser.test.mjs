import assert from 'node:assert/strict';
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { launchAuditBrowser } from './helpers/browser-launch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '../../..');

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
    if (file.endsWith('.css')) return 'text/css; charset=utf-8';
    if (file.endsWith('.js') || file.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
    return 'application/octet-stream';
}

async function startServer() {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url || '/', 'http://127.0.0.1');
            const resolved = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
            if (!resolved.startsWith(root) || !existsSync(resolved)) throw new Error('not found');
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
    const candidates = [path.join(root, 'node_modules', 'playwright', 'package.json'), path.join(repoRoot, 'node_modules', 'playwright', 'package.json')];
    for (const pkg of candidates) {
        if (!existsSync(pkg)) continue;
        return createRequire(pkg)('playwright');
    }
    return createRequire(path.join(root, 'package.json'))('playwright');
}

test('Phase 3 gallery renders V7 tokens and primitives without mobile overflow', async () => {
    const http = await startServer();
    const pw = loadPlaywright();
    const { browser } = await launchAuditBrowser(pw.chromium);
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(`${http.base}/docs/v7/component-gallery.html`, { waitUntil: 'networkidle', timeout: 60000 });
        const result = await page.evaluate(() => {
            const rootStyle = getComputedStyle(document.documentElement);
            return {
                background: rootStyle.getPropertyValue('--v7-bg').trim(),
                primary: rootStyle.getPropertyValue('--v7-primary').trim(),
                navCount: document.querySelectorAll('.v7-bottom-nav-preview__item').length,
                surfaceCount: document.querySelectorAll('.v7-surface, .v7-soft-glass, .v7-liquid-control').length,
                overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
            };
        });
        assert.equal(result.background, '#f4f7f5');
        assert.equal(result.primary, '#2b6b4a');
        assert.equal(result.navCount, 5);
        assert.ok(result.surfaceCount >= 3);
        assert.ok(result.overflow <= 1, `horizontal overflow=${result.overflow}`);
        assert.deepEqual(errors, []);
        await context.close();
    } finally {
        await browser.close();
        await new Promise((resolve) => http.server.close(resolve));
    }
});


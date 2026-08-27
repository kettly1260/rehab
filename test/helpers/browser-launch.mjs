import { existsSync } from 'node:fs';
import path from 'node:path';

function systemChromiumCandidates() {
    const candidates = [
        process.env.PLAYWRIGHT_EXECUTABLE_PATH,
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    /** @type {string[]} */
    const available = [];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate && existsSync(candidate)) available.push(candidate);
    }
    return [...new Set(available)];
}

/**
 * Launch a Chromium-family browser for browser-contract tests without requiring
 * Playwright's downloaded Chromium when a system Edge installation is present.
 */
export async function launchAuditBrowser(chromium, options = {}) {
    if (!chromium?.launch) throw new Error('playwright.chromium.launch unavailable');
    const headless = options.headless !== false;
    const explicitChannel = process.env.AUDIT_CHANNEL || '';
    const preferred = explicitChannel || options.channel || 'msedge';
    let lastError = null;

    try {
        return {
            browser: await chromium.launch({ channel: preferred, headless }),
            channel: preferred
        };
    } catch (error) {
        lastError = error;
        if (explicitChannel) throw error;
    }

    for (const executablePath of systemChromiumCandidates()) {
        try {
            return {
                browser: await chromium.launch({ executablePath, headless }),
                channel: path.basename(executablePath).replace(/\.exe$/i, '') + '-system'
            };
        } catch (error) {
            lastError = error;
        }
    }

    try {
        return {
            browser: await chromium.launch({ headless }),
            channel: 'chromium'
        };
    } catch (error) {
        throw lastError || error;
    }
}


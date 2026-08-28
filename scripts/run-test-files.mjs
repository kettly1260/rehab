// @ts-nocheck
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const testDir = path.join(root, 'test');
const files = readdirSync(testDir)
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => path.join('test', name));
const browserFiles = files.filter((file) => file.endsWith('.browser.test.mjs'));
const unitFiles = files.filter((file) => !file.endsWith('.browser.test.mjs'));
const unitOnly = process.argv.includes('--unit-only');
const browserOnly = process.argv.includes('--browser-only');

function sleep(milliseconds) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function run(label, testFiles, timeout, retries = 0) {
    if (!testFiles.length) return;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const suffix = attempt ? ` (retry ${attempt}/${retries})` : '';
        console.log(`\n[test-runner] ${label}: ${testFiles.length} file(s)${suffix}`);
        const result = spawnSync(process.execPath, [
            '--test',
            '--test-force-exit',
            '--test-concurrency=1',
            ...testFiles
        ], {
            cwd: root,
            stdio: 'inherit',
            timeout,
            windowsHide: true
        });
        if (!result.error && result.status === 0) return;
        const timedOut = result.error?.code === 'ETIMEDOUT';
        if (timedOut && attempt < retries) {
            console.warn(`[test-runner] ${label} timed out; retrying in 2 seconds`);
            sleep(2000);
            continue;
        }
        if (result.error) console.error(`[test-runner] ${label} failed: ${result.error.message}`);
        process.exit(result.status || 1);
    }
}

if (!browserOnly) run('unit', unitFiles, 180_000);
if (!unitOnly) {
    for (const file of browserFiles) {
        run(file, [file], 300_000, 1);
        sleep(1000);
    }
}

const completed = unitOnly ? unitFiles.length : browserOnly ? browserFiles.length : files.length;
console.log(`\n[test-runner] complete: ${completed} files`);

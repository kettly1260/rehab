import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../scripts/edge-perf-smoke.mjs', import.meta.url), 'utf8');

test('edge perf smoke excludes known third-party security injection from localhost measurements', () => {
    assert.match(source, /Network\.setBlockedURLs/);
    assert.match(source, /kaspersky-labs\.com/);
    assert.match(source, /blockedExternalPatterns/);
});

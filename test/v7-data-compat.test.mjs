import test from 'node:test';
import assert from 'node:assert/strict';

import { createLegacyAdapters } from '../src/legacy/adapters/index.js';

function hostFixture() {
    const db = {
        schemaVersion: 3,
        actions: [{ id: 'a1' }, { id: 'a-deleted', deletedAt: 1 }],
        routines: [{ id: 'r1' }],
        history: [{ id: 'h1' }],
        dailyPlans: [{ id: 'p1' }],
        aiProfiles: [{ id: 'profile-1', provider: 'openai' }],
        aiTaskRoutes: { coach: 'profile-1' },
        health: {
            weights: [{ id: 'w1' }],
            foodLogs: [{ id: 'f1' }],
            exerciseLogs: [{ id: 'e1' }],
            rehabWeekly: [{ id: 'rw1' }],
            reports: [{ id: 'rp1' }],
            bodyPlan: { goal: 'maintain' },
            weightPlan: { target: 70 },
            dietGoal: { dailyCal: 2100 }
        }
    };
    const data = {
        DB_KEY: 'rehab_pro_universal_db',
        SCHEMA_VERSION: 3,
        db,
        cfg: { mode: 'none', s3: {}, dav: {} },
        activeRecords(records) { return records.filter((item) => !item.deletedAt); },
        save() { return true; }
    };
    return {
        data,
        dataStore: { _readyState: 'ready', _storageMode: 'idb' },
        storageIdb: {
            DB_NAME: 'rehab_pro_storage',
            DB_VERSION: 4,
            STORE_NAME: 'kv',
            HISTORY_STORE_NAME: 'history',
            AI_MESSAGES_STORE_NAME: 'ai_messages'
        }
    };
}

test('V7 adapter reads V6 core data without cloning or mutating schema', () => {
    const host = hostFixture();
    const before = structuredClone(host.data.db);
    const legacy = createLegacyAdapters(host);

    assert.equal(legacy.data.schemaVersion, 3);
    assert.deepEqual(legacy.data.actions.map((item) => item.id), ['a1']);
    assert.deepEqual(legacy.data.routines.map((item) => item.id), ['r1']);
    assert.deepEqual(legacy.data.workoutHistory.map((item) => item.id), ['h1']);
    assert.equal(legacy.data.health.weights.length, 1);
    assert.equal(legacy.data.plans?.dailyPlans.length, 1);
    assert.deepEqual(host.data.db, before);
});

test('V7 compatibility summary covers training, health, settings and AI without secrets', () => {
    const legacy = createLegacyAdapters(hostFixture());
    assert.deepEqual(legacy.data.summary(), {
        schemaVersion: 3,
        readyState: 'ready',
        actions: 1,
        routines: 1,
        history: 1,
        dailyPlans: 1,
        weights: 1,
        foodLogs: 1,
        exerciseLogs: 1,
        rehabWeekly: 1,
        reports: 1,
        hasSyncConfig: true,
        hasAiConfig: true
    });
});

test('V7 storage adapter preserves V6 database/store identifiers', () => {
    const legacy = createLegacyAdapters(hostFixture());
    assert.deepEqual(legacy.storage.describe(), {
        databaseName: 'rehab_pro_storage',
        indexedDbVersion: 4,
        kvStore: 'kv',
        historyStore: 'history',
        aiMessagesStore: 'ai_messages',
        appDatabaseKey: 'rehab_pro_universal_db',
        storageMode: 'idb'
    });
});


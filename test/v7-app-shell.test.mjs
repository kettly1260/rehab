import test from 'node:test';
import assert from 'node:assert/strict';

import { createEventBus } from '../src/app/events.js';
import { createLifecycle } from '../src/app/lifecycle.js';
import { createRouter, normalizePage, parseV7Hash } from '../src/app/router.js';

test('V7 router normalizes five top-level routes and legacy aliases', () => {
    assert.equal(normalizePage('today'), 'today');
    assert.equal(normalizePage('workout'), 'workout');
    assert.equal(normalizePage('records'), 'records');
    assert.equal(normalizePage('advice'), 'ai-coach');
    assert.equal(normalizePage('me'), 'profile');
    assert.equal(normalizePage('missing'), 'today');
    assert.deepEqual(parseV7Hash('#/profile/library'), { page: 'profile', routineView: 'library' });
    assert.deepEqual(parseV7Hash('#/records/weight'), { page: 'records', healthView: 'weight' });
    assert.deepEqual(parseV7Hash('#/records/diet'), { page: 'records', healthView: 'diet' });
    assert.deepEqual(parseV7Hash('#/ai/advice?range=week'), { page: 'ai-coach', adviceRange: 'week' });
});

test('V7 lifecycle disposes the previous feature before mounting the next', async () => {
    const events = createEventBus();
    const log = [];
    const lifecycle = createLifecycle({ events, host: globalThis });
    const feature = (id) => ({
        id,
        mount({ scope }) {
            log.push(`mount:${id}`);
            scope.add(() => log.push(`dispose:${id}`));
        },
        unmount() { log.push(`unmount:${id}`); }
    });

    await lifecycle.transition(feature('today'), {});
    await lifecycle.transition(feature('records'), {});
    assert.deepEqual(log, ['mount:today', 'dispose:today', 'unmount:today', 'mount:records']);
    assert.equal(lifecycle.snapshot().activeId, 'records');
});

test('V7 router patches the legacy tab entry without creating feature globals', async () => {
    const calls = [];
    const ui = {
        async tab(page, element) { calls.push([page, element]); return true; }
    };
    const router = createRouter({
        legacy: {
            getUi: () => ui,
            historyBack() {},
            historyForward() {}
        },
        events: createEventBus()
    });
    router.start();
    await ui.tab('profile', 'nav');
    assert.deepEqual(calls, [['profile', 'nav']]);
    router.stop();
});


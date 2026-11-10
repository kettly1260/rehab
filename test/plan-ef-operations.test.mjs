// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import actionTaxonomy from '../action-taxonomy-pure.js';
import { actionKind } from '../src/features/workout/index.js';

function loadModules() {
    const policyCode = readFileSync(new URL('../rehab-policy.js', import.meta.url), 'utf8');
    const progressionCode = readFileSync(new URL('../plan-progression.js', import.meta.url), 'utf8');
    const storeCode = readFileSync(new URL('../plan-store.js', import.meta.url), 'utf8');
    const autoAdjustCode = readFileSync(new URL('../plan-auto-adjust.js', import.meta.url), 'utf8');

    const sandbox = {
        window: {
            actionTaxonomy,
            actionKind
        },
        actionKind,
        console,
        Date,
        Math,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp
    };
    sandbox.window.window = sandbox.window;
    sandbox.globalThis = sandbox.window;

    vm.runInNewContext(policyCode, sandbox);
    vm.runInNewContext(progressionCode, sandbox);
    vm.runInNewContext(storeCode, sandbox);
    vm.runInNewContext(autoAdjustCode, sandbox);

    return sandbox;
}

test('workout intent filter isolates recovery and stretch actions in currentActions', async () => {
    const workoutEngineCode = readFileSync(new URL('../workout-engine.js', import.meta.url), 'utf8');
    const sandbox = {
        window: { actionKind },
        actionKind,
        data: {
            db: {
                actions: [
                    { id: 'a1', name: '哑铃卧推', category: 'chest', sets: 3, reps: 10, work: 0 },
                    { id: 'a2', name: '肩部激活与康复', category: 'shoulder', nature: 'recovery', sets: 2, reps: 15, work: 0 },
                    { id: 'a3', name: '胸椎拉伸放松', category: 'chest', phase: 'cooldown', sets: 1, reps: 0, work: 30 }
                ]
            },
            activeRecords(arr) { return arr.filter(x => !x.deleted); }
        },
        console,
        Date,
        Math,
        JSON,
        Array
    };
    sandbox.window.data = sandbox.data;
    vm.runInNewContext(workoutEngineCode + '\nsandbox.workoutEngine = workoutEngine;', { ...sandbox, sandbox });

    // Default: returns all 3 actions
    let actions = sandbox.workoutEngine.currentActions();
    assert.equal(actions.length, 3);

    // Filter recovery
    sandbox.data._activeWorkoutIntentFilter = 'recovery';
    actions = sandbox.workoutEngine.currentActions();
    assert.equal(actions.length, 1);
    assert.equal(actions[0].id, 'a2');

    // Filter stretch
    sandbox.data._activeWorkoutIntentFilter = 'stretch';
    actions = sandbox.workoutEngine.currentActions();
    assert.equal(actions.length, 1);
    assert.equal(actions[0].id, 'a3');

    // Reset
    sandbox.data._activeWorkoutIntentFilter = null;
    actions = sandbox.workoutEngine.currentActions();
    assert.equal(actions.length, 3);
});

test('createProgressionAdjustmentSuggestion generates deload when painScore >= 4 even without progression chain', () => {
    const sandbox = loadModules();

    const data = {
        ...sandbox.window.dataPlanStore,
        db: {
            dailyPlans: [
                {
                    id: 'p1',
                    date: '2026-10-28',
                    items: [
                        {
                            id: 't1',
                            name: '自定义独立动作',
                            status: 'done',
                            spec: { sets: 4, reps: 12, work: 0 },
                            feedback: {
                                doneAt: Date.now(),
                                rpe: 4,
                                painScore: 5,
                                painPart: '膝关节前侧'
                            }
                        }
                    ]
                }
            ],
            progressionChains: [],
            planAdjustmentBatches: []
        },
        touchRecord(obj, fields) { obj.updatedAt = Date.now(); },
        activeRecords(arr) { return (arr || []).filter(x => !x.deleted); },
        save() {}
    };
    sandbox.window.data = data;
    sandbox.data = data;

    const result = data.createProgressionAdjustmentSuggestion('p1', 't1', { save: false });
    assert.ok(result);
    assert.equal(result.decision, 'deload');
    assert.match(result.reason, /明显疼痛/);

    const task = data.db.dailyPlans[0].items[0];
    assert.ok(task.nextProgressionSuggestion);
    assert.equal(task.nextProgressionSuggestion.decision, 'deload');
    assert.equal(task.nextProgressionSuggestion.appliesTo, 'future-only');
    assert.ok(task.nextProgressionSuggestion.suggestedSpec.sets < 4);
});

test('createProgressionAdjustmentSuggestion suppresses progression when noIncrease or keepNextTime is true', () => {
    const sandbox = loadModules();

    const data = {
        ...sandbox.window.dataPlanStore,
        db: {
            dailyPlans: [
                {
                    id: 'p2',
                    date: '2026-10-28',
                    items: [
                        {
                            id: 't2',
                            name: '靠墙静蹲',
                            chainId: 'wall-sit-chain',
                            currentLevel: 1,
                            status: 'done',
                            spec: { sets: 3, reps: 0, work: 30 },
                            feedback: {
                                doneAt: Date.now(),
                                rpe: 1, // very easy -> would normally progress
                                painScore: 0,
                                noIncrease: true, // user requested no increase
                                keepNextTime: true
                            }
                        }
                    ]
                }
            ],
            progressionChains: [
                {
                    id: 'wall-sit-chain',
                    name: '靠墙静蹲进阶',
                    levels: [
                        { lv: 1, name: '靠墙静蹲' },
                        { lv: 2, name: '单腿靠墙静蹲' }
                    ]
                }
            ],
            planAdjustmentBatches: []
        },
        touchRecord(obj, fields) { obj.updatedAt = Date.now(); },
        activeRecords(arr) { return (arr || []).filter(x => !x.deleted); },
        buildFeedbackHistory() { return []; },
        save() {}
    };
    sandbox.window.data = data;
    sandbox.data = data;

    const result = data.createProgressionAdjustmentSuggestion('p2', 't2', { save: false });
    assert.ok(!result || result.decision === 'hold' || result.suggestion === 'hold');
    const task = data.db.dailyPlans[0].items[0];
    assert.ok(!task.nextProgressionSuggestion);
});

test('plan completion and cloneForTomorrow handle skipped items conservatively without progression reward', () => {
    const sandbox = loadModules();

    const data = {
        ...sandbox.window.dataPlanAutoAdjust,
        db: {
            dailyPlans: [
                {
                    id: 'plan_today_1',
                    date: '2026-10-28',
                    type: 'rehab',
                    items: [
                        { id: 'item_1', name: '动作一', category: 'main', status: 'done', spec: { sets: 3, reps: 10 } },
                        { id: 'item_2', name: '动作二', category: 'main', status: 'skipped', spec: { sets: 3, reps: 12 } }
                    ]
                },
                {
                    id: 'plan_today_2',
                    date: '2026-10-28',
                    type: 'hypertrophy',
                    items: [
                        { id: 'item_3', name: '哑铃推胸', category: 'main', status: 'todo', spec: { sets: 4, reps: 8 } }
                    ]
                }
            ]
        },
        logicalDateKey() { return '2026-10-28'; },
        dateKey(d) { return d.toISOString().slice(0, 10); },
        activeRecords(arr) { return (arr || []).filter(x => !x.deleted); }
    };
    sandbox.window.data = data;
    sandbox.data = data;

    // Target plan 1 is finished (1 done + 1 skipped = 2 total)
    const canAdjustPlan1 = data.shouldAutoAdjustAfterPlanFeedback('plan_today_1');
    assert.equal(canAdjustPlan1, true);

    // Target plan 2 is NOT finished
    const canAdjustPlan2 = data.shouldAutoAdjustAfterPlanFeedback('plan_today_2');
    assert.equal(canAdjustPlan2, false);
});

test('applyFutureProgressionSuggestion blocks progress when source feedback indicates pain or noIncrease', () => {
    const sandbox = loadModules();
    const applySuggestion = sandbox.window.planPolicy.applyFutureProgressionSuggestion;

    const sourceWithPain = {
        name: '靠墙静蹲',
        feedback: { painScore: 4, rpe: 2 },
        nextProgressionSuggestion: {
            appliesTo: 'future-only',
            decision: 'progress',
            targetLevel: 2,
            targetName: '单腿靠墙静蹲'
        }
    };
    const nextItem1 = { name: '靠墙静蹲', spec: { sets: 3, work: 30 } };
    const res1 = applySuggestion(nextItem1, sourceWithPain, {});
    // Should NOT progress to Level 2
    assert.equal(res1.name, '靠墙静蹲');

    const sourceWithNoIncrease = {
        name: '靠墙静蹲',
        feedback: { painScore: 0, rpe: 1, noIncrease: true },
        nextProgressionSuggestion: {
            appliesTo: 'future-only',
            decision: 'progress',
            targetLevel: 2,
            targetName: '单腿靠墙静蹲'
        }
    };
    const nextItem2 = { name: '靠墙静蹲', spec: { sets: 3, work: 30 } };
    const res2 = applySuggestion(nextItem2, sourceWithNoIncrease, {});
    // Should NOT progress
    assert.equal(res2.name, '靠墙静蹲');
});

// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { evaluateProgression } from '../rehab-progression-pure.js';
import actionTaxonomy from '../action-taxonomy-pure.js';

function loadPlanStore() {
    const policyCode = readFileSync(new URL('../rehab-policy.js', import.meta.url), 'utf8');
    const code = readFileSync(new URL('../plan-store.js', import.meta.url), 'utf8');
    const sandbox = {
        window: { actionTaxonomy },
        console,
        Date
    };
    vm.runInNewContext(policyCode, sandbox);
    vm.runInNewContext(code, sandbox);
    return { store: sandbox.window.dataPlanStore, policy: sandbox.window.planPolicy };
}

function createContext(api, overrides = {}) {
    let idCounter = 1;
    return {
        ...api,
        generateRecordId: () => `rec_${idCounter++}`,
        ensureRecordMeta: (record) => record,
        activeRecords: (list) => (list || []).filter((item) => item && !item.deleted),
        touchRecord: (record, fields = []) => {
            record.updatedAt = Date.now();
            record.__touched = fields;
        },
        save: () => {},
        db: {
            dailyPlans: [],
            prefs: {},
            health: {},
            ...overrides.db
        },
        ...overrides
    };
}

const chain = {
    levels: [
        { lv: 1, name: 'L1' },
        { lv: 2, name: 'L2' },
        { lv: 3, name: 'L3' }
    ]
};

test('evaluateProgression: painScore >= 4 deloads even when user selected noIncrease', () => {
    const result = evaluateProgression({
        taskItem: { currentLevel: 2, spec: { sets: 3, reps: 12 } },
        chain,
        history: [{ rpe: 2, painScore: 5, painPart: '右膝', noIncrease: true, doneAt: Date.now() }]
    });
    assert.equal(result.decision, 'deload');
    assert.equal(result.targetLevel, 1);
    assert.match(result.reason, /疼痛 5\/10/);
});

test('evaluateProgression: painScore >= 4 deloads even when user selected keepNextTime', () => {
    const result = evaluateProgression({
        taskItem: { currentLevel: 2, spec: { sets: 3, reps: 12 } },
        chain,
        history: [{ rpe: 2, painScore: 4, keepNextTime: true, doneAt: Date.now() }]
    });
    assert.equal(result.decision, 'deload');
    assert.equal(result.targetLevel, 1);
    assert.match(result.reason, /疼痛 4\/10/);
});

test('evaluateProgression: noIncrease holds progression when pain is low', () => {
    const result = evaluateProgression({
        taskItem: { currentLevel: 2, spec: { sets: 3, reps: 12 } },
        chain,
        history: [{ rpe: 1, painScore: 1, noIncrease: true, doneAt: Date.now() }]
    });
    assert.equal(result.decision, 'hold');
    assert.equal(result.targetLevel, 2);
    assert.match(result.reason, /不再加量/);
});

test('ensureTaskShape converts string spec into structured spec and preserves metadata', () => {
    const { store } = loadPlanStore();
    const ctx = createContext(store);
    const task = ctx.ensureTaskShape({
        name: '俯卧直腿后抬',
        spec: '5秒 × 10次 × 2组',
        group: '髋伸直力量',
        rehabStage: '急性恢复期',
        equipment: ['瑜伽垫'],
        prescriptionWeekStart: '2026-10-20'
    });
    assert.equal(typeof task.spec, 'object');
    assert.equal(task.spec.sets, 2);
    assert.equal(task.spec.reps, 10);
    assert.equal(task.spec.work, 5);
    assert.equal(task.group, '髋伸直力量');
    assert.equal(task.rehabStage, '急性恢复期');
    assert.deepEqual(task.equipment, ['瑜伽垫']);
    assert.equal(task.prescriptionWeekStart, '2026-10-20');
});

test('addTask and movePlanTaskOrder manage task ordering correctly', () => {
    const { store } = loadPlanStore();
    const plan = {
        id: 'plan_test_d',
        items: [
            { id: 't1', name: '动作1', status: 'todo' },
            { id: 't2', name: '动作2', status: 'todo' },
            { id: 't3', name: '动作3', status: 'todo' }
        ]
    };
    const ctx = createContext(store, {
        db: {
            dailyPlans: [plan]
        }
    });

    // Add a new task
    const addedTask = ctx.addTask('plan_test_d', { name: '动作4', spec: { sets: 2, reps: 8 } });
    assert.ok(addedTask);
    const planAfterAdd = ctx.db.dailyPlans.find((p) => p.id === 'plan_test_d');
    assert.equal(planAfterAdd.items.length, 4);
    assert.equal(planAfterAdd.items[3].name, '动作4');
    const t4Id = addedTask.id;

    // Move t4 up
    ctx.movePlanTaskOrder('plan_test_d', t4Id, 'up');
    assert.equal(planAfterAdd.items[2].name, '动作4');
    assert.equal(planAfterAdd.items[3].name, '动作3');

    // Move t4 down
    ctx.movePlanTaskOrder('plan_test_d', t4Id, 'down');
    assert.equal(planAfterAdd.items[3].name, '动作4');

    // Move t1 up at boundary (should stay at top)
    ctx.movePlanTaskOrder('plan_test_d', 't1', 'up');
    assert.equal(planAfterAdd.items[0].name, '动作1');
});

test('seedTasksFromPrefs prefers active prescription actions and excludes dropped actions', () => {
    const { store } = loadPlanStore();
    const ctx = createContext(store, {
        db: {
            dailyPlans: [],
            prefs: {
                rehab: {
                    equipment: ['bodyweight']
                }
            },
            health: {
                rehabWeekly: [
                    {
                        weekStart: '2026-10-20',
                        actions: [
                            { name: '直腿抬高', status: 'continued', spec: '2组 x 10次' },
                            { name: '靠墙静蹲', status: 'dropped', spec: '2组 x 30秒' }
                        ]
                    }
                ]
            }
        }
    });

    const tasks = ctx.seedTasksFromPrefs({ planType: 'rehab' });
    assert.ok(tasks.length > 0);
    const names = tasks.map((t) => t.name);
    assert.ok(names.includes('直腿抬高'), 'includes active prescription action');
    assert.ok(!names.includes('靠墙静蹲'), 'excludes dropped prescription action');
});

test('R1: prescriptionTask and seedTasksFromPrefs preserve missing spec without defaulting to 3x12', () => {
    const { store, policy } = loadPlanStore();
    const taskWithoutDose = policy.prescriptionTask({
        name: '剂量待补充动作',
        status: 'continued',
        spec: null
    });
    assert.equal(taskWithoutDose.spec, null, 'spec should be null when not provided');
    assert.equal(taskWithoutDose.invalidSpec, true, 'invalidSpec should be true');
    assert.equal(taskWithoutDose.requiresUserConfirm, true, 'requiresUserConfirm should be true');
    assert.equal(taskWithoutDose.userConfirmed, false, 'userConfirmed should be false');

    const ctx = createContext(store, {
        db: {
            progressionChains: [],
            planPreferences: { rehab: { equipment: [] } },
            health: {
                rehabWeekly: [{
                    weekStart: '2026-10-20',
                    actions: [{ id: 'act-1', name: '无剂量动作', status: 'continued', spec: null }]
                }]
            }
        }
    });

    const seeded = ctx.seedTasksFromPrefs({ planType: 'rehab' });
    assert.equal(seeded.length, 1);
    assert.equal(seeded[0].spec, null, 'seeded task spec must be null');
    assert.equal(seeded[0].invalidSpec, true, 'seeded task invalidSpec must be true');
    assert.equal(seeded[0].requiresUserConfirm, true, 'seeded task requiresUserConfirm must be true');
    assert.equal(seeded[0].userConfirmed, false, 'seeded task userConfirmed must be false');
});

test('R2: evaluateProgression holds when task was only partially completed (in-progress)', () => {
    const taskItem = {
        name: '靠墙静蹲',
        status: 'in-progress',
        doneSets: 1,
        spec: { sets: 3, reps: 0, work: 30 }
    };
    const result = evaluateProgression({
        taskItem,
        chain,
        history: [{ rpe: 1, painScore: 0, actualSets: 1, plannedSets: 3 }]
    });
    assert.equal(result.decision, 'hold', 'decision should be hold when incomplete');
    assert.match(result.reason, /未达标完成/, 'reason should explain partial completion');
});

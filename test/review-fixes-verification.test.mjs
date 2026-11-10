import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function loadModule(file, context = {}) {
    const code = readFileSync(path.join(root, file), 'utf8');
    const win = { ...(context.window || {}) };
    const advicePanel = context.advicePanel || {};
    win.advicePanel = advicePanel;
    const ctx = vm.createContext({
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Date,
        Math,
        Number,
        String,
        Array,
        Object,
        JSON,
        RegExp,
        window: win,
        globalThis: win,
        advicePanel,
        ...context
    });
    ctx.window = win;
    ctx.globalThis = win;
    ctx.advicePanel = advicePanel;
    vm.runInContext(code, ctx, { filename: file });
    return ctx;
}

test('S1: plan-ui.js has no dynamic onclick concatenation for task order or modal triggers', () => {
    const code = readFileSync(path.join(root, 'plan-ui.js'), 'utf8');
    assert.doesNotMatch(code, /onclick="data\.movePlanTaskOrder\(/, 'No inline movePlanTaskOrder onclick');
    assert.doesNotMatch(code, /onclick="dataPlanUi\.openAddPlanTaskModal\(/, 'No inline openAddPlanTaskModal onclick');
    assert.match(code, /data-task-order-delta/, 'Uses data-task-order-delta attribute');
    assert.match(code, /data-open-add-task-plan-id/, 'Uses data-open-add-task-plan-id attribute');
});

test('R1: missing dose in prescription actions keeps spec: null, invalidSpec: true, requiresUserConfirm: true', async () => {
    const policyCode = readFileSync(path.join(root, 'rehab-policy.js'), 'utf8');
    const ctx = vm.createContext({
        window: {},
        Date,
        Math,
        JSON
    });
    vm.runInContext(policyCode, ctx);
    const policy = ctx.window.planPolicy || ctx.window.rehabPolicy;
    const task = policy.prescriptionTask({
        actionId: 'action-nodose',
        name: '无剂量康复动作',
        status: 'continued'
    }, '2026-10-27');
    assert.equal(task.spec, null, 'spec should be null when dose is absent');
    assert.equal(task.invalidSpec, true, 'invalidSpec should be true');
    assert.equal(task.requiresUserConfirm, true, 'requiresUserConfirm should be true');
    assert.equal(task.userConfirmed, false, 'userConfirmed should be false');
});

test('R2: incomplete tasks (status: in-progress or completedSets < plannedSets or manualStop) never receive volume-up or progress', async () => {
    const progModule = await import('../rehab-progression-pure.js');
    const evaluate = progModule.evaluateProgression;
    const res = evaluate(/** @type {any} */ ({
        currentLevel: 1,
        spec: { sets: 3, reps: 10 },
        taskItem: {
            status: 'in-progress',
            doneSets: 1,
            spec: { sets: 3, reps: 10 }
        },
        history: [{ painScore: 1, rpe: 2 }]
    }));
    assert.equal(res.decision, 'hold', 'Incomplete task must hold');
    assert.notEqual(res.decision, 'volume-up', 'Incomplete task must never volume-up');
    assert.notEqual(res.decision, 'progress', 'Incomplete task must never progress');
    assert.match(res.reason, /未达标完成|维持原参数/, 'Reason explains incomplete sets');
});

test('R5: workout finish idempotence preserves single history record and manualStop', () => {
    let sequence = 0;
    const engine = { state: { phase: 'completed' } };
    const workoutData = {
        db: { history: /** @type {any[]} */ ([]), actualSetsBuffer: [{ action: '动作_A', setIdx: 1, reps: 8 }] },
        generateRecordId: prefix => prefix + '-' + (++sequence),
        logicalDateKey: () => '2026-10-28',
        _planActions: () => [{ id: 'action-a', name: '动作_A', sets: 3 }],
        activeRecords: arr => arr.filter(x => !x.deleted),
        saveAndBackup() {},
        save() {},
    };
    const makeElement = () => ({ innerText: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, appendChild() {}, querySelector() { return makeElement(); } });
    const coreCtx = {
        workout: { mode: 'strength', totalSec: 21, isPlaying: true, isPaused: false, _manualStopRequested: true, updatePipButton() {}, renderPip() {}, closePip() {}, releaseWakeLock() {}, speak() {} },
        data: workoutData,
        workoutEngine: engine,
        navigator: {},
        clearInterval() {},
        alert() {},
        console,
        CustomEvent: function(type, init) { return { type, detail: init?.detail }; },
        document: { body: { classList: { toggle() {} } }, getElementById() { return makeElement(); }, querySelector() { return makeElement(); }, querySelectorAll() { return [makeElement(), makeElement(), makeElement()]; }, createElement() { return makeElement(); } },
        window: { data: workoutData, workoutEngine: engine, dispatchEvent() {}, speechSynthesis: { cancel() {} }, haptics: { success() {} } }
    };
    const coreCode = readFileSync(path.join(root, 'workout-core.js'), 'utf8');
    vm.runInNewContext(coreCode, coreCtx);
    coreCtx.workout.finish();
    coreCtx.workout.finish();
    assert.equal(workoutData.db.history.length, 1, 'Double finish should record exactly 1 history entry');
    assert.equal(workoutData.db.history[0].manualStop, true, 'manualStop should be preserved as true');
});

test('R6: AI context reads actualSets and includes reps, weight, and RPE', () => {
    const coachCode = readFileSync(path.join(root, 'coach-context.js'), 'utf8');
    const coachCtx = {
        advicePanel: {},
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(coachCode, coachCtx);
    const coach = {
        ...coachCtx.advicePanel,
        ...coachCtx.window.advicePanel,
        db: {
            history: [{
                id: 'hist-1',
                sessionId: 'sess-1',
                date: '2026/10/27 15:00:00',
                dayKey: '2026-10-27',
                duration: 600,
                actions: [{ name: '动作_A', sets: 3, reps: 12 }],
                actualSets: [{ action: '动作_A', setIdx: 1, reps: 7, weight: 2, rpe: 8 }],
                manualStop: true
            }],
            health: { exerciseLogs: [] },
            dailyPlans: []
        },
        activeRecords: arr => arr || [],
        logicalDayStart: () => new Date('2026-10-28T04:00:00'),
        logicalDateKey: () => '2026-10-28',
        historyDayKey: h => h.dayKey || '2026-10-27',
        parseHistoryDate: d => new Date(d),
        dateKey: d => d.toISOString().slice(0, 10),
        dateFromKey: k => new Date(k)
    };
    const messages = coach.buildAdviceMessages('分析训练', 'gpt-4o', { contextMode: 'light' });
    const content = messages.map(m => m.content).join('\n');
    assert.ok(content.includes('7次@2kg@RPE8'), 'Context must include fine-grained actualSets details');
});

test('R7: critical pain items in daily plans are prioritized and not dropped by light mode slicing', () => {
    const coachCode = readFileSync(path.join(root, 'coach-context.js'), 'utf8');
    const coachCtx = {
        advicePanel: {},
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(coachCode, coachCtx);
    const coach = {
        ...coachCtx.advicePanel,
        ...coachCtx.window.advicePanel,
        db: {
            history: [],
            health: { exerciseLogs: [] },
            dailyPlans: [{
                id: 'plan-1',
                date: '2026-10-27',
                type: 'rehab',
                items: Array.from({ length: 6 }, (_, index) => ({
                    id: 'task-' + index,
                    name: '动作_' + index,
                    spec: { sets: 3 },
                    status: 'done',
                    feedback: index === 5 ? { painScore: 9, painPart: '膝关节严重疼痛', unsuitable: true } : {}
                }))
            }]
        },
        activeRecords: arr => arr || [],
        logicalDayStart: () => new Date('2026-10-28T04:00:00'),
        logicalDateKey: () => '2026-10-28',
        historyDayKey: h => h.dayKey || '2026-10-27',
        parseHistoryDate: d => new Date(d),
        dateKey: d => d.toISOString().slice(0, 10),
        dateFromKey: k => new Date(k)
    };
    const messages = coach.buildAdviceMessages('分析康复训练', 'gpt-4o', { contextMode: 'light' });
    const content = messages.map(m => m.content).join('\n');
    assert.ok(content.includes('膝关节严重疼痛'), 'Light mode must prioritize and include painScore 9 item');
    assert.ok(messages.contextEvidence.truncations.length > 0, 'contextEvidence.truncations must report truncation');
});

test('R8: weekly fatigue insight and prompt use session and day counts rather than raw action count', () => {
    const summaryCode = readFileSync(path.join(root, 'weekly-summary.js'), 'utf8');
    const utilsCode = readFileSync(path.join(root, 'data-utils.js'), 'utf8');
    const ctx = {
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(utilsCode, ctx);
    vm.runInNewContext(summaryCode, ctx);
    const weekly = {
        ...ctx.window.dataUtils,
        ...ctx.window.dataWeeklySummary,
        activeRecords: arr => arr || [],
        exerciseLabel: e => e,
        db: {
            history: Array.from({ length: 6 }, (_, i) => ({
                id: 'record-' + i,
                sessionId: 'one-session',
                date: '2026/10/27 15:00:00',
                dayKey: '2026-10-27',
                duration: 60,
                actions: [{ name: '动作_' + i }],
                actualSets: []
            })),
            health: { exerciseLogs: [] }
        }
    };
    const insight = weekly.weeklyFatigueInsight('2026-W44');
    assert.equal(insight.cur.sessionCount, 1, 'Session count should be 1');
    assert.equal(insight.cur.minutes, 6, 'Total minutes should be 6');
    assert.equal(insight.fatigue, false, '6 actions in 1 session of 6 minutes should NOT trigger fatigue');
    const prompt = weekly.weeklyAiPromptForWeek('2026-W44');
    assert.ok(prompt.includes('1 次训练（6 个动作'), 'Prompt states 1 session with 6 actions, not 6 workouts');
});

test('R9: late-night 04:00 records align with dayKey across context and periodStats', () => {
    const recordsCode = readFileSync(path.join(root, 'src/features/records/index.js'), 'utf8');
    const recordsCtx = {
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(recordsCode.slice(0, recordsCode.indexOf('function streakStats')) + '\nglobalThis.reviewPeriodStats = periodStats;', recordsCtx);
    const boundary = [{ date: '2026/10/26 01:00:00', dayKey: '2026-10-25', duration: 600 }];
    const weekStats = recordsCtx.reviewPeriodStats(boundary, new Date('2026-10-28T12:00:00'), 'week');
    assert.equal(weekStats.count, 0, 'Late Sunday night record belongs to previous week, not this week');
    assert.equal(weekStats.countDelta, -1, 'Previous week has the record');
});

test('R3 & R4: sessionId is maintained across tasks and paired cooldown prompts next main task', async () => {
    const cooldownCode = readFileSync(path.join(root, 'plan-cooldown.js'), 'utf8');
    const planUiCode = readFileSync(path.join(root, 'plan-ui.js'), 'utf8');
    const planStorePure = await import('../plan-store-pure.js');
    assert.match(cooldownCode, /cooldownCompleted/, 'afterPlanFeedback supports cooldownCompleted');
    assert.match(cooldownCode, /sessionId/, 'sessionId passed to showPlanNextTaskPrompt');
    assert.match(planUiCode, /_currentPlanSessionId/, 'plan-ui tracks _currentPlanSessionId across runs');

    const ctx = {
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console, setTimeout, clearTimeout,
        requestAnimationFrame: fn => fn(),
        ui: { tab: async () => {} },
        navButton: () => null,
        document: {
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => []
        }
    };
    vm.runInNewContext(cooldownCode, ctx);
    vm.runInNewContext(planUiCode, ctx);
    const plan = {
        id: 'p1',
        date: '2026-10-28',
        type: 'rehab',
        items: [
            { id: 'one', name: '主项一', category: 'main', status: 'todo', cooldownRefs: ['cd'], spec: { sets: 3, reps: 12 } },
            { id: 'cd', name: '成对拉伸', category: 'cooldown', status: 'todo', spec: { sets: 1, work: 30 } },
            { id: 'two', name: '主项二', category: 'main', status: 'todo', spec: { sets: 3, reps: 12 } }
        ]
    };
    let nextPrompt = /** @type {{ pId?: string, taskId?: string, sessionId?: string } | null} */ (null);
    const data = {
        ...planStorePure,
        ...ctx.window.dataPlanCooldown,
        ...ctx.window.dataPlanUi,
        db: { dailyPlans: [plan] },
        findTask: (pId, tId) => {
            const p = data.db.dailyPlans.find(x => x.id === pId);
            return { plan: p, task: p?.items.find(x => x.id === tId) };
        },
        updateItemStatus: (pId, tId, status, patch) => {
            const { task } = data.findTask(pId, tId);
            if (task) {
                task.status = status;
                Object.assign(task, patch);
            }
        },
        save: () => {},
        showPlanNextTaskPrompt: (pId, task, sessionId) => {
            nextPrompt = { pId, taskId: task.id, sessionId };
        },
        ensurePlanPrefs: () => ({ cooldownMode: 'paired' }),
        openPlanFeedback: (pId, tId, opts) => {
            data.afterPlanFeedback(pId, tId, { didSaveFeedback: true, sessionId: opts.sessionId });
        }
    };
    ctx.window.dataPlanCooldown = data;

    // Step 1: Run main task 'one'
    data.runPlanTask('p1', 'one');
    const session1 = data.activeRun.sessionId;
    assert.ok(session1, 'Should have active session id');

    // Finish task 'one' -> triggers openPlanFeedback -> triggers afterPlanFeedback -> triggers runPlanTask('cd')
    data.handlePlanWorkoutFinished({ actualSets: [{}, {}, {}], manualStop: false });
    assert.ok(data.activeRun, 'Paired cooldown should be running');
    assert.equal(data.activeRun.taskId, 'cd');
    assert.equal(data.activeRun.sessionId, session1, 'Cooldown must inherit sessionId');

    // Step 2: Cooldown 'cd' finishes -> must advance to 'two' via showPlanNextTaskPrompt!
    data.handlePlanWorkoutFinished({ actualSets: [{ work: 30 }], manualStop: false });
    assert.ok(nextPrompt, 'Must advance to next main task prompt after paired cooldown');
    assert.equal(nextPrompt.taskId, 'two');
    assert.equal(nextPrompt.sessionId, session1, 'Next main task must continue same sessionId');

    // Step 3: Run task on another plan -> must isolate sessionId
    const otherPlan = {
        id: 'p2',
        date: '2026-10-28',
        type: 'custom',
        items: [{ id: 'other-task', name: '其它计划', category: 'main', status: 'todo', spec: { sets: 1, reps: 10 } }]
    };
    data.db.dailyPlans.push(otherPlan);
    data.runPlanTask('p2', 'other-task');
    const session2 = data.activeRun.sessionId;
    assert.notEqual(session1, session2, 'Different plan must not reuse same session id');
});

test('R10: plan-ai prompt generator aligns range label with parsePromptAnalysisRange', () => {
    const planAiCode = readFileSync(path.join(root, 'plan-ai.js'), 'utf8');
    assert.match(planAiCode, /rangeFromPrompt/, 'plan-ai inspects prompt for range keywords');
    assert.match(planAiCode, /\$\{rangeLabel\}对应类型计划摘要/, 'prompt label matches actual extracted range');
});

test('N05: buildHistoryRecord uses workoutEngine.currentActions to match intent filter rather than dumping all actions', () => {
    const workoutCoreCode = readFileSync(path.join(root, 'workout-core.js'), 'utf8');
    assert.match(workoutCoreCode, /getWorkoutActions/, 'workout-core defines getWorkoutActions');
    assert.match(workoutCoreCode, /workoutEngine\.currentActions/, 'getWorkoutActions delegates to workoutEngine.currentActions');

    const workoutObj = {
        isPlaying: true,
        totalSec: 60,
        resetMainPanel: () => {},
        speak: () => {},
        updatePipButton: () => {},
        renderPip: () => {},
        closePip: () => {},
        releaseWakeLock: () => {},
        updateStateClasses: () => {}
    };
    const ctx = {
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console, setTimeout, clearTimeout, setInterval, clearInterval,
        alert: () => {},
        speechSynthesis: { cancel: () => {} },
        navigator: { mediaSession: { playbackState: 'none' } },
        workout: workoutObj,
        document: {
            getElementById: () => ({ innerText: '', textContent: '', setAttribute: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, querySelector: () => ({ style: {} }) }),
            querySelector: () => ({ style: {}, setAttribute: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } }),
            querySelectorAll: () => [{ innerText: '' }, { innerText: '' }, { innerText: '' }, { innerText: '' }, { innerText: '' }],
            body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } }
        }
    };
    ctx.window = ctx;
    ctx.window.workout = workoutObj;
    vm.runInNewContext(workoutCoreCode, ctx);
    const workout = ctx.window.workout;
    const historySaved = [];
    ctx.window.data = {
        activeRecords: arr => arr,
        db: {
            actions: [
                { id: '1', name: '动作1' }, { id: '2', name: '动作2' },
                { id: '3', name: '动作3' }, { id: '4', name: '动作4' }
            ],
            history: []
        },
        history: {
            append: (rec) => historySaved.push(rec)
        },
        logicalDateKey: () => '2026-10-28',
        saveAndBackup: () => {},
        save: () => {}
    };
    ctx.data = ctx.window.data;
    ctx.window.workoutEngine = {
        currentActions: () => [
            { id: '1', name: '动作1' },
            { id: '2', name: '动作2' }
        ]
    };
    workout.isPlaying = true;
    workout.totalSec = 60;
    workout.finish();
    assert.equal(historySaved.length, 1, 'Should save exactly one history record');
    assert.equal(historySaved[0].actions.length, 2, 'History actions length must match workoutEngine.currentActions (2), not all db.actions (4)');
});

test('N06: workout-state snapshot and restore retain planContext, activeWorkoutIntentFilter, and currentPlanSessionId', () => {
    const workoutStateCode = readFileSync(path.join(root, 'workout-state.js'), 'utf8');
    assert.match(workoutStateCode, /planContext:/, 'workoutState snapshot preserves planContext');
    assert.match(workoutStateCode, /activeWorkoutIntentFilter:/, 'workoutState snapshot preserves activeWorkoutIntentFilter');

    const storage = new Map();
    const workoutObj = {
        mode: 'strength',
        isPlaying: true,
        isPaused: false,
        totalSec: 45,
        planContext: { planId: 'p_recover', taskId: 't1', sessionId: 'sess_recovery_123' },
        setMode: () => {},
        updateStateClasses: () => {},
        keepAudioAlive: () => {},
        initBackGuard: () => {},
        acquireWakeLock: () => {},
        setupMediaSession: () => {},
        updateUI: () => {},
        showToast: () => {}
    };
    const ctx = {
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console, setTimeout, clearTimeout, setInterval, clearInterval,
        workout: workoutObj,
        cardio: { isRunning: false, isPaused: false, seconds: 0, targetAnnounced: false },
        localStorage: {
            getItem: k => storage.get(k) || null,
            setItem: (k, v) => storage.set(k, String(v)),
            removeItem: k => storage.delete(k)
        },
        document: {
            getElementById: () => ({ innerText: '', textContent: '', classList: { add: () => {}, remove: () => {} } }),
            querySelectorAll: () => [],
            body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } }
        }
    };
    ctx.window = ctx;
    ctx.window.workout = workoutObj;
    ctx.window.cardio = ctx.cardio;
    ctx.window.workoutEngine = {
        snapshot: () => ({ phase: 'work', actionIdx: 0, setIdx: 1, repIdx: 1, elapsed: 10 }),
        restore: () => {}
    };
    ctx.window.data = {
        _activeWorkoutIntentFilter: 'recovery',
        _currentPlanSessionId: 'sess_recovery_123',
        _currentPlanSessionPlanId: 'p_recover',
        activeRun: { planId: 'p_recover', taskId: 't1', sessionId: 'sess_recovery_123' },
        updatePlanWorkoutBanner: () => {}
    };
    ctx.data = ctx.window.data;

    vm.runInNewContext(workoutStateCode, ctx);
    const state = ctx.window.workoutState;
    const snap = state.snapshot();
    assert.ok(snap.planContext, 'Snapshot must contain planContext');
    assert.equal(snap.planContext.planId, 'p_recover');
    assert.equal(snap.activeWorkoutIntentFilter, 'recovery');
    assert.equal(snap.currentPlanSessionId, 'sess_recovery_123');

    // Reset runtime state and restore
    ctx.window.workout.planContext = null;
    ctx.window.data.activeRun = null;
    ctx.window.data._activeWorkoutIntentFilter = null;
    ctx.window.data._currentPlanSessionId = null;

    state.restoreStrength(snap);
    clearInterval(ctx.window.workout.sessionInt); // prevent test hanging
    assert.ok(ctx.window.workout.planContext, 'Restored workout must have planContext');
    assert.equal(ctx.window.workout.planContext.planId, 'p_recover');
    assert.equal(ctx.window.data._activeWorkoutIntentFilter, 'recovery');
    assert.equal(ctx.window.data.activeRun?.sessionId, 'sess_recovery_123');
});

test('N07: privacy mode (mode === none) clears profile and outputs no health profile block', () => {
    const coachCode = readFileSync(path.join(root, 'coach-context.js'), 'utf8');
    const ctx = {
        advicePanel: {},
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console, setTimeout, clearTimeout
    };
    vm.runInNewContext(coachCode, ctx);
    const coach = { ...ctx.advicePanel, ...ctx.window.advicePanelCoachContext, ...ctx.window.advicePanel };
    const db = {
        health: {
            profile: { gender: 'male', age: 30 },
            height: 175
        }
    };
    const host = {
        ...coach,
        db,
        activeRecords: arr => arr || [],
        conversation: () => [],
        adviceConversationContext: () => [],
        adviceRangeStart: () => new Date('2026-10-28T00:00:00'),
        logicalDayStart: () => new Date('2026-10-28T04:00:00'),
        logicalDateKey: () => '2026-10-28',
        historyDayKey: h => h.dayKey || '2026-10-28',
        parseHistoryDate: d => new Date(d),
        dateKey: d => (typeof d === 'string' ? d : d.toISOString().slice(0, 10)),
        dateFromKey: k => new Date(k)
    };
    const msgs = host.buildAdviceMessages('我的身体情况如何？', 'test-model', { contextMode: 'none' });
    const content = msgs[1]?.content || '';
    assert.ok(!content.includes('【健康档案（必须遵守）】'), 'mode === none must not leak health profile header');
    assert.ok(!content.includes('基础：男 · 30 岁'), 'mode === none must not leak gender or age');
});

test('N08: formatTraining outputs 0 completed sets on manualStop or empty actualSets, and includes weightKg', () => {
    const coachCode = readFileSync(path.join(root, 'coach-context.js'), 'utf8');
    const ctx = {
        advicePanel: {},
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console, setTimeout, clearTimeout
    };
    vm.runInNewContext(coachCode, ctx);
    const coach = { ...ctx.advicePanel, ...ctx.window.advicePanelCoachContext, ...ctx.window.advicePanel };
    const db = {
        history: [
            {
                id: 'h_stopped',
                date: '2026-10-28 10:00:00',
                duration: 15,
                manualStop: true,
                actions: [{ name: '卧推', sets: 3, plannedSets: 3 }]
            },
            {
                id: 'h_weighted',
                date: '2026-10-28 11:00:00',
                duration: 60,
                actions: [{ name: '深蹲', sets: 1, plannedSets: 1 }],
                actualSets: [{ action: '深蹲', setIdx: 1, reps: 8, weightKg: 50, rpe: 7 }]
            }
        ]
    };
    const host = {
        ...coach,
        db,
        activeRecords: arr => arr || [],
        conversation: () => [],
        adviceConversationContext: () => [],
        adviceRangeStart: () => new Date('2026-10-28T00:00:00'),
        logicalDayStart: () => new Date('2026-10-28T04:00:00'),
        logicalDateKey: () => '2026-10-28',
        historyDayKey: h => h.dayKey || '2026-10-28',
        parseHistoryDate: d => new Date(d),
        dateKey: d => (typeof d === 'string' ? d : d.toISOString().slice(0, 10)),
        dateFromKey: k => new Date(k)
    };
    const msgs = host.buildAdviceMessages('分析今天训练', 'test-model', { contextMode: 'auto' });
    const content = msgs[1]?.content || '';
    assert.match(content, /卧推\(0\/3组\)/, 'Manual stop with 0 sets completed must format as 0/3组, not 3/3组');
    assert.match(content, /50kg/, 'formatTraining must support weightKg property');
});

test('N09: formatDailyPlans prioritizes restriction items (noIncrease, keepNextTime, wantsContinue:false) in light mode', () => {
    const coachCode = readFileSync(path.join(root, 'coach-context.js'), 'utf8');
    const ctx = {
        advicePanel: {},
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console, setTimeout, clearTimeout
    };
    vm.runInNewContext(coachCode, ctx);
    const coach = { ...ctx.advicePanel, ...ctx.window.advicePanelCoachContext, ...ctx.window.advicePanel };
    const items = [
        { id: '1', name: '动作一', status: 'done', spec: { sets: 3 } },
        { id: '2', name: '动作二', status: 'done', spec: { sets: 3 } },
        { id: '3', name: '动作三', status: 'done', spec: { sets: 3 } },
        { id: '4', name: '动作四', status: 'done', spec: { sets: 3 } },
        { id: '5', name: '动作五', status: 'done', spec: { sets: 3 } },
        { id: '6', name: '动作六限制项', status: 'done', spec: { sets: 3 }, feedback: { noIncrease: true, keepNextTime: true } }
    ];
    const db = {
        dailyPlans: [
            { id: 'p_light', date: '2026-10-28', type: 'rehab', items }
        ]
    };
    const host = {
        ...coach,
        db,
        activeRecords: arr => arr || [],
        conversation: () => [],
        adviceConversationContext: () => [],
        adviceRangeStart: () => new Date('2026-10-28T00:00:00'),
        logicalDayStart: () => new Date('2026-10-28T04:00:00'),
        logicalDateKey: () => '2026-10-28',
        historyDayKey: h => h.dayKey || '2026-10-28',
        parseHistoryDate: d => new Date(d),
        dateKey: d => (typeof d === 'string' ? d : d.toISOString().slice(0, 10)),
        dateFromKey: k => new Date(k)
    };
    const msgs = host.buildAdviceMessages('查看今日计划', 'test-model', { contextMode: 'light' });
    const content = msgs[1]?.content || '';
    assert.match(content, /动作六限制项/, 'Restriction item must be prioritized in top 5 items in light mode');
});

test('N10: weekly-summary uses dayKey so late Sunday night records belong to Sunday week', () => {
    const weeklyCode = readFileSync(path.join(root, 'weekly-summary.js'), 'utf8');
    const ctx = {
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(weeklyCode, ctx);
    const summaryMod = ctx.window.dataWeeklySummary;
    const db = {
        history: [
            { id: 'h_sun_night', date: '2026/10/26 01:30:00', dayKey: '2026-10-25', duration: 1800, sessionId: 's1' }
        ],
        health: { exerciseLogs: [] }
    };
    const host = {
        ...summaryMod,
        db,
        activeRecords: list => list,
        historyNames: () => ['动作A']
    };
    const sunWeekStart = new Date(2026, 9, 19, 0, 0, 0); // Oct 19 Monday
    const sunWeekEnd = new Date(2026, 9, 26, 0, 0, 0);   // Oct 26 Monday
    const nextWeekEnd = new Date(2026, 10, 2, 0, 0, 0);

    const prevWeekSummary = host.weeklyTrainingSummaryForRange(sunWeekStart, sunWeekEnd);
    assert.equal(prevWeekSummary.sessionCount, 1, 'Late Sunday workout (Oct 26 01:30) with dayKey 2026-10-25 must belong to previous week');

    const curWeekSummary = host.weeklyTrainingSummaryForRange(sunWeekEnd, nextWeekEnd);
    assert.equal(curWeekSummary.sessionCount, 0, 'Late Sunday workout must not leak into current week');
});

test('N11: monthlyTrainingSummary and weeklyAiPrompt distinguish sessionCount and actionCount', () => {
    const weeklyCode = readFileSync(path.join(root, 'weekly-summary.js'), 'utf8');
    const ctx = {
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(weeklyCode, ctx);
    const summaryMod = ctx.window.dataWeeklySummary;
    const db = {
        history: [
            { id: 'h1', date: '2026-10-10 10:00:00', duration: 1800, sessionId: 'sess1', actions: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }
        ],
        health: { exerciseLogs: [] }
    };
    const host = {
        ...summaryMod,
        db,
        activeRecords: list => list,
        normalizeSummaryMonthKey: k => k,
        historyNames: () => ['A', 'B', 'C'],
        buildPeriodReportContext: () => 'ctx'
    };
    const m = host.monthlyTrainingSummary('2026-10');
    assert.equal(m.sessionCount, 1, '1 session with 3 actions must report sessionCount: 1');
    assert.equal(m.actionCount, 3, '1 session with 3 actions must report actionCount: 3');
    const prompt = host.monthlySummaryAiPrompt('2026-10');
    assert.match(prompt, /共 1 次训练（3 个动作项）/, 'AI prompt must clearly distinguish session count and action count');
});

test('N12: plan-ai recentPlans filters by unique dates to ensure full rangeDays coverage', () => {
    const planAiCode = readFileSync(path.join(root, 'plan-ai.js'), 'utf8');
    assert.match(planAiCode, /allowedDates\.size\s*>=\s*rangeDays/, 'plan-ai collects unique allowed dates up to rangeDays');
});

test('N13: health-profile renders "共 N 个版本" instead of "共 N 周"', () => {
    const hpCode = readFileSync(path.join(root, 'health-profile.js'), 'utf8');
    assert.match(hpCode, /共\s*\$\{\s*weeks\.length\s*\}\s*个版本/, 'health-profile must render versions instead of weeks');
});

test('N14: advice-panel foodRecordCount and todayMacros align using logicalDateKey', () => {
    const apCode = readFileSync(path.join(root, 'advice-panel.js'), 'utf8');
    assert.match(apCode, /logicalDateKey/, 'advice-panel uses logicalDateKey for todayFoods and foodRecordCount');
});

test('N15: plan-store createPlanAdjustmentBatch guards against duplicate feedback-saved triggers', () => {
    const planStoreCode = readFileSync(path.join(root, 'plan-store.js'), 'utf8');
    const ctx = {
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(planStoreCode, ctx);
    const store = ctx.window.dataPlanStore;
    const db = { planAdjustments: [] };
    const host = {
        ...store,
        db,
        ensurePlanAdjustmentState: () => {},
        ensureRecordMeta: () => {},
        save: () => {}
    };
    const b1 = host.createPlanAdjustmentBatch({
        source: 'auto-after-feedback',
        trigger: { type: 'feedback-saved', planId: 'p1', taskId: 't1', doneAt: 12345 }
    });
    const b2 = host.createPlanAdjustmentBatch({
        source: 'auto-after-feedback',
        trigger: { type: 'feedback-saved', planId: 'p1', taskId: 't1', doneAt: 12345 }
    });
    assert.equal(b1.id, b2.id, 'Duplicate trigger must return existing batch instead of creating a new one');
    assert.equal(db.planAdjustments.length, 1, 'Only one batch in planAdjustments');
});

test('N17: advice-panel filter-controls renders pre-send context evidence preview in popover', () => {
    const apCode = readFileSync(path.join(root, 'advice-panel.js'), 'utf8');
    assert.match(apCode, /advice-context-preview-section/, 'advice-panel has advice-context-preview-section');
    assert.match(apCode, /getAdviceContextEvidence/, 'advice-panel queries getAdviceContextEvidence for preview');
});

test('R3-S1: plan-ui task rows have no dynamic onclick string interpolation and use data-* delegation', () => {
    const code = readFileSync(path.join(root, 'plan-ui.js'), 'utf8');
    assert.doesNotMatch(code, /onclick="dataPlanUi\.openPlanTaskDrawer\(/, 'No inline openPlanTaskDrawer onclick');
    assert.doesNotMatch(code, /onclick="dataPlanUi\.runPlanTask\(/, 'No inline runPlanTask onclick');
    assert.match(code, /data-plan-task-tap-plan-id/, 'Uses data-plan-task-tap-plan-id attribute');
    assert.match(code, /data-plan-task-tap-task-id/, 'Uses data-plan-task-tap-task-id attribute');
});

test('R3-01: progression normalization preserves isPartial, status, actualSets, manualStop and blocks progress', async () => {
    const pure = await import('../rehab-progression-pure.js');
    const task = {
        name: '深蹲',
        actionId: 'act-squat',
        rehabStage: 'strength',
        currentLevel: 1,
        spec: { sets: 3, reps: 10 }
    };
    // 2 sessions: yesterday partial completion (1/3 sets done, manualStop), today full completion (3/3 sets done)
    const historyWithPastPartial = [
        { rpe: 1, painScore: 0, doneSets: 1, plannedSets: 3, isPartial: true, manualStop: true },
        { rpe: 1, painScore: 0, doneSets: 3, plannedSets: 3 }
    ];
    // @ts-ignore
    const decisionPast = pure.evaluateProgression(/** @type {any} */ ({
        taskItem: task,
        chain: ['act-wall-squat', 'act-squat', 'act-barbell-squat'],
        history: historyWithPastPartial
    }));
    // Because yesterday was partial completion, consecutiveEasy was broken and is only 1.
    // It must NOT progress to next level!
    assert.notEqual(decisionPast.decision, 'progress', 'Past partial completion must break consecutive streak and block progress');
    assert.equal(decisionPast.decision, 'volume-up', 'Single easy session only warrants volume-up, not level progress');

    // And when the latest session itself is partial completion, it must strictly hold:
    const historyWithLatestPartial = [
        { rpe: 1, painScore: 0, doneSets: 3, plannedSets: 3 },
        { rpe: 1, painScore: 0, doneSets: 1, plannedSets: 3, isPartial: true, manualStop: true }
    ];
    // @ts-ignore
    const decisionLatest = pure.evaluateProgression(/** @type {any} */ ({
        taskItem: task,
        chain: ['act-wall-squat', 'act-squat', 'act-barbell-squat'],
        history: historyWithLatestPartial
    }));
    assert.equal(decisionLatest.decision, 'hold', 'Latest partial completion must hold');
});

test('R3-02: coach-context preserves restricted actions across truncation and includes notice', () => {
    const code = readFileSync(path.join(root, 'coach-context.js'), 'utf8');
    const ctx = {
        window: {},
        advicePanel: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(code, ctx);
    const cc = {
        ...ctx.advicePanel,
        db: {
            history: [],
            health: { exerciseLogs: [] },
            dailyPlans: [{
                id: 'plan-1',
                date: '2026-10-28',
                type: 'rehab',
                items: [
                    { name: '任务1', spec: { sets: 3, reps: 10 }, completed: true },
                    { name: '任务2', spec: { sets: 3, reps: 10 }, completed: true },
                    { name: '任务3', spec: { sets: 3, reps: 10 }, completed: true },
                    { name: '任务4', spec: { sets: 3, reps: 10 }, completed: true },
                    { name: '任务5', spec: { sets: 3, reps: 10 }, completed: true },
                    { name: '受限痛感任务', spec: { sets: 3, reps: 10 }, completed: false, feedback: { painScore: 5 } }
                ]
            }]
        },
        activeRecords: arr => arr || [],
        logicalDayStart: () => new Date('2026-10-28T04:00:00'),
        logicalDateKey: () => '2026-10-28',
        parsePromptTargetDate: () => '',
        dateKey: d => d.toISOString().slice(0, 10),
        dateFromKey: k => new Date(k)
    };
    // @ts-ignore
    const messages = cc.buildAdviceMessages('分析训练', 'gpt-4o', { contextMode: 'light' });
    const text = messages.map(m => m.content).join('\n');
    assert.match(text, /受限痛感任务/, 'Restricted task must be included in output even with 5 max items');
});

test('R3-03: legacy history without actualSets counts sets as completed (not 0/3)', () => {
    const code = readFileSync(path.join(root, 'coach-context.js'), 'utf8');
    const ctx = {
        window: {},
        advicePanel: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(code, ctx);
    const cc = {
        ...ctx.advicePanel,
        db: {
            history: [{
                date: '2026-10-28',
                dayKey: '2026-10-28',
                actions: [{ name: '俯卧撑', sets: 3, reps: 12 }],
                duration: 300
            }],
            health: { exerciseLogs: [] },
            dailyPlans: []
        },
        activeRecords: arr => arr || [],
        logicalDayStart: () => new Date('2026-10-28T04:00:00'),
        logicalDateKey: () => '2026-10-28',
        historyDayKey: h => h.dayKey || '2026-10-28',
        parseHistoryDate: d => new Date(d),
        parsePromptTargetDate: () => '',
        dateKey: d => d.toISOString().slice(0, 10),
        dateFromKey: k => new Date(k)
    };
    // @ts-ignore
    const messages = cc.buildAdviceMessages('分析训练', 'gpt-4o', { contextMode: 'light' });
    const text = messages.map(m => m.content).join('\n');
    assert.doesNotMatch(text, /0\/3组/, 'Legacy history with sets:3 must not be displayed as 0/3组');
    assert.match(text, /3组/, 'Legacy history reflects 3 completed sets');
});

test('R3-04: plan-ui markPlanTaskDone rejects empty/missing dose', () => {
    const code = readFileSync(path.join(root, 'plan-ui.js'), 'utf8');
    assert.match(code, /markPlanTaskDone/, 'Has markPlanTaskDone');
    assert.match(code, /hasValidDose/, 'markPlanTaskDone verifies hasValidDose before completion');
});

test('R3-05: plan-auto-adjust cloneForTomorrow prioritizes painScore >= 4 deload over isPartial hold', () => {
    const code = readFileSync(path.join(root, 'plan-auto-adjust.js'), 'utf8');
    const ctx = {
        window: {},
        Date, Math, Number, String, Array, Object, JSON, RegExp,
        console
    };
    vm.runInNewContext(code, ctx);
    const adjuster = ctx.window.dataPlanAutoAdjust;
    const task = {
        id: 'task-1',
        name: '深蹲',
        spec: { sets: 3, reps: 12 },
        status: 'in-progress',
        actualSets: [{ setIdx: 1, reps: 8, rpe: 4 }],
        isPartial: true,
        painScore: 5 // severe pain during partial completion!
    };
    const clonedTask = adjuster._cloneForTomorrow(task, {}, {});
    assert.ok(clonedTask.spec.reps < 12 || clonedTask.spec.sets < 3, 'Must deload reps/sets when painScore >= 4 even if isPartial');
});

test('R3-09 & R3-10: records/index.js periodStats counts sessions and handles 04:00 logical cutoff', async () => {
    const records = await import('../src/features/records/index.js');
    // 6 action records with same sessionId -> 1 session
    const multiActionHistory = [
        { id: '1', sessionId: 'sess-1', date: '2026-10-28 10:00:00', duration: 60 },
        { id: '2', sessionId: 'sess-1', date: '2026-10-28 10:01:00', duration: 60 },
        { id: '3', sessionId: 'sess-1', date: '2026-10-28 10:02:00', duration: 60 },
        { id: '4', sessionId: 'sess-1', date: '2026-10-28 10:03:00', duration: 60 },
        { id: '5', sessionId: 'sess-1', date: '2026-10-28 10:04:00', duration: 60 },
        { id: '6', sessionId: 'sess-1', date: '2026-10-28 10:05:00', duration: 60 }
    ];
    const stats = records.periodStats(multiActionHistory, new Date('2026-10-28T12:00:00'), 'week');
    assert.equal(stats.count, 1, '6 actions in 1 session must count as 1 session');
    assert.equal(stats.actionCount, 6, 'actionCount is 6');

    // 04:00 logical cutoff: 2026-10-26 01:00:00 (Monday 1am) belongs to Sunday 2026-10-25
    const lateNightRecord = [
        { id: 'late', sessionId: 'sess-late', date: '2026/10/26 01:00:00', duration: 600 }
    ];
    // Week of Monday 2026-10-26
    const weekStats = records.periodStats(lateNightRecord, new Date('2026-10-28T12:00:00'), 'week');
    assert.equal(weekStats.count, 0, '01:00 record on Monday belongs to previous week (Sunday 10-25)');
    assert.equal(weekStats.countDelta, -1, 'Previous week has 1 session, so delta is -1');
});

test('R3-11: plan-ai planHistoryWithFeedback applies calendar lower bound', () => {
    const code = readFileSync(path.join(root, 'plan-ai.js'), 'utf8');
    assert.match(code, /startDateKey/, 'Calculates startDateKey calendar bound');
});

test('R3-12: coach-context and plan-ai use version notation for prescriptions', () => {
    const ccCode = readFileSync(path.join(root, 'coach-context.js'), 'utf8');
    const aiCode = readFileSync(path.join(root, 'plan-ai.js'), 'utf8');
    assert.match(ccCode, /近.*个版本康复中心处方/, 'coach-context uses version notation');
    assert.match(aiCode, /近.*个版本康复中心处方/, 'plan-ai uses version notation');
});

test('V1: workout-core freezes actions snapshot at start and uses it on finish', () => {
    const coreCode = readFileSync(path.join(root, 'workout-core.js'), 'utf8');
    assert.match(coreCode, /_workoutActionsSnapshot/, 'workout-core captures _workoutActionsSnapshot');
    const stateCode = readFileSync(path.join(root, 'workout-state.js'), 'utf8');
    assert.match(stateCode, /workoutActionsSnapshot/, 'workout-state serializes and restores workoutActionsSnapshot');
});

test('R4-01: cloneForTomorrow maintains requiresUserConfirm when painScore >= 4 with unsuitable/wantsContinue:false', async () => {
    const ctx = loadModule('plan-auto-adjust.js');
    const dataPlanAutoAdjust = ctx.window.dataPlanAutoAdjust;
    const cloneForTomorrow = dataPlanAutoAdjust._cloneForTomorrow;
    const task = {
        id: 't1',
        name: 'Action 1',
        spec: { sets: 3, reps: 10, weight: 20 },
        feedback: { painScore: 5, unsuitable: true }
    };
    const cloned = cloneForTomorrow(task);
    assert.equal(cloned.requiresUserConfirm, true, 'Must require user confirm due to unsuitable');
    assert.equal(cloned.userConfirmed, false, 'userConfirmed must be false');
    assert.ok(cloned.spec.sets < 3 || cloned.spec.reps < 10, 'Spec must be lowered due to pain');

    const taskStop = {
        id: 't2',
        name: 'Action 2',
        spec: { sets: 3, reps: 10, weight: 20 },
        feedback: { painScore: 5, wantsContinue: false }
    };
    const clonedStop = cloneForTomorrow(taskStop);
    assert.equal(clonedStop.requiresUserConfirm, true, 'Must require user confirm due to wantsContinue: false');
    assert.equal(clonedStop.userConfirmed, false, 'userConfirmed must be false');
});

test('R4-02: legacy record with sets but no actualSets/doneSets/status outputs 计划N组 without fabricating completion', async () => {
    const advicePanel = {
        db: {
            history: [{
                id: 'legacy-h',
                date: '2026-10-26 10:00:00',
                dayKey: '2026-10-26',
                duration: 60,
                actions: [{ name: 'Squat', sets: 3 }]
            }],
            health: {},
            dailyPlans: []
        },
        logicalDateKey: () => '2026-10-26',
        logicalDayStart: () => new Date('2026-10-26T04:00:00'),
        dateKey: () => '2026-10-26',
        adviceRange: 'today'
    };
    loadModule('coach-context.js', { advicePanel });
    const messages = advicePanel.buildAdviceMessages('分析今日训练', null, {
        contextMode: 'full'
    });
    const text = messages.map(m => m.content).join('\n');
    assert.match(text, /Squat\(计划3组\)/, 'Outputs 计划3组 instead of completed 3组');
    assert.doesNotMatch(text, /Squat\(3组\)/, 'Does not claim 3组 completed');
    assert.doesNotMatch(text, /Squat\(3\/3组\)/, 'Does not claim 3/3组 completed');
});

test('R4-03: folded actions with stopReason or discomfort are preserved in truncations and constraints', async () => {
    const advicePanel = {
        db: {
            history: [{
                id: 'h-stop',
                date: '2026-10-26 10:00:00',
                dayKey: '2026-10-26',
                duration: 60,
                actions: [
                    { name: 'Act1', sets: 3, painScore: 8 },
                    { name: 'Act2', sets: 3, painScore: 8 },
                    { name: 'Act3', sets: 3, painScore: 8 },
                    { name: 'Act4', sets: 3, painScore: 8 },
                    { name: 'Act5', sets: 3, stopReason: '腰部刺痛中止', discomfort: '腰痛难忍' }
                ]
            }],
            health: {},
            dailyPlans: []
        },
        logicalDateKey: () => '2026-10-26',
        logicalDayStart: () => new Date('2026-10-26T04:00:00'),
        dateKey: () => '2026-10-26',
        adviceRange: 'today'
    };
    loadModule('coach-context.js', { advicePanel });
    const messages = advicePanel.buildAdviceMessages('分析今日训练', null, {
        contextMode: 'light'
    });
    const text = messages.map(m => m.content).join('\n');
    assert.match(text, /腰部刺痛中止|腰痛难忍/, 'Omitted action with stopReason/discomfort is preserved in constraints');
});

test('R4-04: plan-feedback modal close passes isModalClose: true to avoid auto-starting workout', () => {
    const fbCode = readFileSync(path.join(root, 'plan-feedback.js'), 'utf8');
    assert.match(fbCode, /isModalClose:\s*true/, 'closePlanFeedbackInternal passes isModalClose: true');
    const cdCode = readFileSync(path.join(root, 'plan-cooldown.js'), 'utf8');
    assert.match(cdCode, /isModalClose/, 'afterPlanFeedback inspects isModalClose');
});

test('R4-05: data-utils historyDayKey correctly handles pure slash dates matching resolveDayKey', async () => {
    const ctx = loadModule('data-utils.js');
    const dataUtils = ctx.window.dataUtils;
    const records = await import(pathToFileURL(path.join(root, 'src/features/records/index.js')).href);
    const entry = { date: '2026/10/26' };
    const utilsDay = dataUtils.historyDayKey(entry);
    const recordsDay = records.resolveDayKey(entry.date);
    assert.equal(utilsDay, '2026-10-26', 'historyDayKey does not decrement pure slash date');
    assert.equal(recordsDay, '2026-10-26', 'resolveDayKey keeps 2026-10-26');
    assert.equal(utilsDay, recordsDay, 'Both modules agree on pure slash date');
});

test('R4-06: parsePromptAnalysisRange recognizes all-history variations', async () => {
    const advicePanel = {};
    loadModule('coach-context.js', { advicePanel });
    const parse = advicePanel.parsePromptAnalysisRange;
    assert.equal(parse('根据历史所有训练进行分析'), 'all');
    assert.equal(parse('查看所有计划安排'), 'all');
    assert.equal(parse('全部计划进度如何'), 'all');
});

test('R4-07: plan-auto-adjust and health-profile use version terminology instead of week', () => {
    const autoCode = readFileSync(path.join(root, 'plan-auto-adjust.js'), 'utf8');
    assert.doesNotMatch(autoCode, /处方近3周/, 'plan-auto-adjust does not refer to versions as weeks');
    const hpCode = readFileSync(path.join(root, 'health-profile.js'), 'utf8');
    assert.doesNotMatch(hpCode, /【近3周康复中心处方/, 'health-profile does not refer to versions as weeks');
});

test('R4-08: getAdviceContextEvidence returns consistent evidence matching buildAdviceMessages', async () => {
    const advicePanel = {};
    loadModule('coach-context.js', { advicePanel });
    assert.ok(typeof advicePanel.getAdviceContextEvidence === 'function');
});

test('B3: plan-ai reuses queryContextData for read-only fact retrieval and consumes rangeDailyPlans', () => {
    const planAiCode = readFileSync(path.join(root, 'plan-ai.js'), 'utf8');
    assert.match(planAiCode, /queryContextData/, 'plan-ai buildPlanAiContext calls queryContextData');
    assert.match(planAiCode, /rangeDailyPlans/, 'plan-ai consumes rangeDailyPlans from queryContext');
    const storeCode = readFileSync(path.join(root, 'plan-store.js'), 'utf8');
    assert.match(storeCode, /this\.queryContextData/, 'plan-store buildFeedbackHistory calls queryContextData');
});

test('V1: workout-engine currentActions locks to snapshot during workout and resets on early stop', () => {
    const weCode = readFileSync(path.join(root, 'workout-engine.js'), 'utf8');
    assert.match(weCode, /_workoutActionsSnapshot/, 'workoutEngine locks to _workoutActionsSnapshot');
    const wcCode = readFileSync(path.join(root, 'workout-core.js'), 'utf8');
    assert.match(wcCode, /_workoutActionsSnapshot\s*=\s*null/, 'workoutCore clears snapshot on exit/stop');
});

test('R5-01: cloneForTomorrow never raises dose on complete sets and RPE 1 when unsuitable or wantsContinue is false', () => {
    const autoCode = readFileSync(path.join(root, 'plan-auto-adjust.js'), 'utf8');
    const ctx = {
        window: {
            planPolicy: {
                applyFutureProgressionSuggestion: (next) => next
            }
        },
        Date, Math, Number, String, Array, Object, JSON, RegExp, console
    };
    vm.runInNewContext(autoCode, ctx);
    const clone = ctx.window.dataPlanAutoAdjust._cloneForTomorrow;
    assert.ok(typeof clone === 'function', '_cloneForTomorrow exported on dataPlanAutoAdjust');

    const itemUnsuitable = {
        status: 'done',
        category: 'main',
        spec: { sets: 3, reps: 12 },
        feedback: { rpe: 1, unsuitable: true, wantsContinue: null }
    };
    const res1 = clone(itemUnsuitable, { tooHardParts: [] }, {});
    assert.equal(res1.spec.reps, 12, 'Dose must not increase on unsuitable');
    assert.equal(res1.requiresUserConfirm, true, 'requiresUserConfirm must be true');
    assert.equal(res1.userConfirmed, false, 'userConfirmed must be false');

    const itemRefusal = {
        status: 'done',
        category: 'main',
        spec: { sets: 3, reps: 12 },
        feedback: { rpe: 1, unsuitable: false, wantsContinue: false }
    };
    const res2 = clone(itemRefusal, { tooHardParts: [] }, {});
    assert.equal(res2.spec.reps, 12, 'Dose must not increase on wantsContinue: false');
    assert.equal(res2.requiresUserConfirm, true, 'requiresUserConfirm must be true');
    assert.equal(res2.userConfirmed, false, 'userConfirmed must be false');
});

test('R5-02: getAdviceContextEvidence resolves effectiveModel and uses consistent small model budget', () => {
    const advicePanel = {};
    loadModule('coach-context.js', { advicePanel });
    assert.ok(typeof advicePanel.getAdviceContextEvidence === 'function');
    const db = {
        dailyPlans: Array.from({ length: 15 }, (_, i) => ({
            id: `p_${i}`,
            date: `2026-10-${String(i + 10).padStart(2, '0')}`,
            type: 'rehab',
            items: [{ id: `item_${i}`, name: `动作${i}`, status: 'done', spec: { sets: 3 }, feedback: { note: 'LONG_NOTE_CONTENT_'.repeat(60) } }]
        }))
    };
    /** @type {any} */
    const host = {
        ...advicePanel,
        db,
        activeRecords: arr => arr || [],
        conversation: () => [],
        adviceConversationContext: () => [],
        adviceRangeStart: () => new Date('2026-10-10T00:00:00'),
        logicalDayStart: () => new Date('2026-10-25T04:00:00'),
        logicalDateKey: () => '2026-10-25',
        historyDayKey: p => p.dayKey || p.date,
        dateKey: d => (typeof d === 'string' ? d : d.toISOString().slice(0, 10)),
        parseHistoryDate: d => new Date(d),
        dateFromKey: k => new Date(k)
    };

    // Small model (ollama-7b)
    const evSmall = host.getAdviceContextEvidence({ prompt: '分析计划', model: 'ollama-7b' });
    assert.equal(evSmall.mode, 'light', 'Small model budget must resolve to light mode');
    assert.equal(evSmall.counts.dailyPlans, 10, 'Small model budget caps plans at 10');
});


test('R6-01: plan-store activeRun and plan session state keys survive mergeDataModules and write back real doneSets', async () => {
    const document = {
        querySelector() { return { id: 'workout' }; },
        querySelectorAll() { return []; },
        getElementById() { return null; },
        createElement() { return { setAttribute() {}, style: {}, querySelectorAll() { return []; } }; },
        body: { appendChild() {} },
        addEventListener() {}
    };
    const win = { document, addEventListener() {} };
    const box = vm.createContext({
        window: win,
        document,
        console,
        requestAnimationFrame(fn) { if (typeof fn === 'function') fn(); return 1; },
        setTimeout(fn) { if (typeof fn === 'function') fn(); return 1; },
        clearTimeout() {},
        ui: {
            async tab() {
                win.data.refreshModules();
            }
        }
    });
    for (const name of ['plan-store.js', 'plan-ui.js', 'data-ui-state.js', 'data.js']) {
        vm.runInContext(readFileSync(path.join(root, name), 'utf8'), box, { filename: name });
    }
    const data = win.data;
    assert.ok(Array.isArray(win.dataPlanStore.__runtimeStateKeys), 'dataPlanStore declares __runtimeStateKeys');
    assert.ok(win.dataPlanStore.__runtimeStateKeys.includes('activeRun'), '__runtimeStateKeys includes activeRun');
    assert.ok(win.dataPlanStore.__runtimeStateKeys.includes('_currentPlanSessionId'), '__runtimeStateKeys includes _currentPlanSessionId');

    win.workout = {
        planContext: null,
        isPlaying: false,
        setMode() {},
        toggle() { this.isPlaying = !this.isPlaying; }
    };

    data.db.dailyPlans = [{
        id: 'plan-1',
        date: '2026-11-06',
        type: 'custom',
        items: [{ id: 'task-1', name: '动作1', status: 'todo', doneSets: 0, spec: { sets: 3, reps: 10, work: 0 } }]
    }];
    data.activeRecords = rows => rows.filter(row => !row.deleted);
    data.touchRecord = () => {};
    data.save = () => {};
    data.generateRecordId = p => `${p}-1`;
    let queue = [];
    data._planActions = () => queue;
    data._replacePlanActions = acts => { queue = acts; };

    // Start plan task with simulated navigation that triggers real refreshModules
    await data.runPlanTask('plan-1', 'task-1');
    assert.ok(data.activeRun, 'activeRun must survive navigation refreshModules');
    assert.equal(data.activeRun.planId, 'plan-1');
    assert.equal(data.activeRun.taskId, 'task-1');
    const runningSessionId = data.activeRun.sessionId;
    assert.ok(runningSessionId, 'activeRun must have a sessionId');
    assert.equal(win.workout.planContext?.sessionId, runningSessionId, 'workout.planContext syncs sessionId');

    // Simulate completion of 1 set with manual stop and matching sessionId
    const history = { actualSets: [{ reps: 10 }], manualStop: true, sessionId: runningSessionId };
    data.handlePlanWorkoutFinished(history);

    const updatedTask = data.db.dailyPlans[0].items[0];
    assert.equal(updatedTask.doneSets, 1, 'Actual completed sets written back to plan task');
    assert.equal(updatedTask.status, 'in-progress', 'Partial set results in in-progress status');
    assert.equal(history.planId, 'plan-1', 'History record linked to planId');
    assert.equal(history.planTaskId, 'task-1', 'History record linked to planTaskId');
    assert.equal(history.sessionId, runningSessionId, 'History record sessionId matches running session');
    assert.equal(data.activeRun, null, 'activeRun must be cleared after workout finish');
    assert.equal(win.workout.planContext, null, 'workout.planContext must be cleared after workout finish');
    assert.equal(data._currentPlanSessionId, runningSessionId, 'currentPlanSessionId preserved for multi-action plan session');
});

test('R6-02: preview and sendAiAdvice share effective route resolution across default __current__, task routes, and vision', async () => {
    const prompt = '分析过去30天康复训练';
    let inputValue = prompt;
    const promptEl = {
        get value() { return inputValue; },
        set value(v) { inputValue = v; }
    };
    const box = vm.createContext({
        window: {},
        advicePanel: {},
        Date,
        console,
        document: { getElementById: id => id === 'advicePrompt' ? promptEl : null, querySelector: () => null },
        AbortController,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        requestAnimationFrame: () => 1
    });
    for (const file of ['data-utils.js', 'advice-panel.js', 'coach-context.js']) {
        vm.runInContext(readFileSync(path.join(root, file), 'utf8'), box, { filename: file });
    }
    const api = vm.runInContext('advicePanel', box);
    box.window.advicePanel = api;
    const today = '2026-10-30';
    const make = () => ({
        ...box.window.dataUtils,
        ...api,
        db: { history: [], dailyPlans: [], actions: [], routines: [], health: { aiAdviceChat: [], foodLogs: [], exerciseLogs: [], weights: [], reports: [], profile: {}, rehabWeekly: [] } },
        activeRecords: rows => (rows || []).filter(r => r && !r.deleted),
        logicalDateKey: () => today,
        logicalDayStart: () => new Date(`${today}T04:00:00`),
        adviceRangeStart(range) {
            if (range === 'all') return null;
            const d = this.logicalDayStart();
            d.setDate(d.getDate() - (range === 'month' ? 29 : range === 'week' ? 6 : 0));
            return d;
        },
        adviceRange: 'month',
        adviceContextMode: 'auto',
        adviceConversationContext: () => [],
        escapeHtml: val => String(val ?? ''),
        generateRecordId: p => `${p}-fixture`,
        clearAdviceDraft() {},
        clearAdviceAttachments() { this._adviceAttachments = []; },
        save() {},
        setAdviceStreamUiState() {},
        updateAdviceSendState() {},
        requestAdviceWakeLock() {},
        releaseAdviceWakeLock() {},
        classifyAdviceFailure: err => ({ content: err.message, info: {} })
    });

    const createPlans = (repeat) => Array.from({ length: 12 }, (_, i) => ({
        id: `plan-${i}`,
        date: `2026-10-${String(29 - i).padStart(2, '0')}`,
        type: 'rehab',
        items: Array.from({ length: 3 }, (_, j) => ({
            name: `ACTION_${i}_${j}`,
            spec: { sets: 3, reps: 10 },
            feedback: { note: 'SYNTHETIC_FEEDBACK_'.repeat(repeat) }
        }))
    }));

    const ctx = make();
    ctx.adviceModel = '__current__';
    ctx.adviceContextOpen = true;
    ctx.db.dailyPlans = createPlans(10);

    let routeCalls = [];
    /** @type {any} */
    let captured = null;
    const ai = {
        cfg: { model: 'ollama-7b', taskRoutes: {} },
        resolveTaskConfig(taskId, override) {
            routeCalls.push({ taskId, override: override || null });
            return { enabled: true, model: taskId === 'advice.vision' ? 'vision-model' : 'ollama-7b', provider: 'test', profileId: 'test' };
        },
        analyzeVisionModel: () => ({ vision: true, isImageGen: false }),
        runStream: async (taskId, messages, maxTokens, callback, options) => {
            captured = {
                taskId,
                model: ai.resolveTaskConfig(taskId, options?.routeOverride).model,
                contextEvidence: structuredClone(messages.contextEvidence || {}),
                options
            };
            throw new Error('AUDIT_STOP_BEFORE_NETWORK');
        },
        run: async ({ taskId, messages, attachments, routeOverride }) => {
            captured = {
                taskId,
                model: ai.resolveTaskConfig(taskId, routeOverride).model,
                attachmentsCount: attachments?.length
            };
            throw new Error('AUDIT_STOP_BEFORE_NETWORK');
        }
    };
    box.ai = ai;
    box.window.ai = ai;
    box.window.data = ctx;

    const preview = ctx.getAdviceContextEvidence(prompt);
    assert.equal(preview.mode, 'light', 'Default __current__ sentinel must resolve task route and use light mode');
    assert.equal(preview.counts.dailyPlans, 10, 'Preview must cap plans at 10 for small model');

    const html = ctx.renderAdviceFilterControls();
    assert.match(html, /计划:\s*10/, 'UI preview must show 10 plans');

    // Actually invoke sendAiAdvice to verify preview and send share same route & context
    await ctx.sendAiAdvice();
    assert.ok(captured, 'sendAiAdvice must execute ai streaming pipeline');
    assert.equal(captured.taskId, 'advice.chat', 'Default chat route uses advice.chat');
    assert.equal(captured.model, 'ollama-7b', 'Resolved model matches effective task route');
    assert.equal(captured.contextEvidence.mode, preview.mode, 'Message context evidence matches preview mode');
    assert.equal(captured.contextEvidence.counts.dailyPlans, preview.counts.dailyPlans, 'Message dailyPlans count matches preview');
    assert.equal(ctx._adviceSending, false, 'adviceSending state resets after stream completion/stop');
    assert.equal(ctx._activeAdvicePendingId, '', 'activeAdvicePendingId clears after stream stop');
    assert.equal(ctx._adviceAbortController, null, 'adviceAbortController cleans up after send');

    // Test vision attachment routes to advice.vision and vision-model
    ctx._adviceAttachments = [{ id: 'img-1', kind: 'image', status: 'ready' }];
    inputValue = '结合图片分析训练表现';
    captured = null;
    const visionModelResolved = ctx.resolveAdviceTaskModel();
    assert.equal(visionModelResolved, 'vision-model', 'Image attachment routes to vision model');

    await ctx.sendAiAdvice();
    assert.ok(captured, 'sendAiAdvice with image attachment must invoke vision handler');
    assert.equal(captured.taskId, 'advice.vision', 'Image attachment routes to advice.vision task');
    assert.equal(captured.model, 'vision-model', 'Vision model matches resolved task config');
    assert.equal(captured.attachmentsCount, 1, 'Image attachment forwarded to vision request');
    assert.equal(ctx._adviceSending, false, 'adviceSending state resets after vision completion');
    assert.equal(ctx._adviceAbortController, null, 'adviceAbortController cleans up after vision send');

    assert.ok(routeCalls.some(c => c.taskId === 'advice.chat'), 'routeCalls includes advice.chat resolution');
    assert.ok(routeCalls.some(c => c.taskId === 'advice.vision'), 'routeCalls includes advice.vision resolution');
});

test('R8-01: data.init preserves pre-init deferred promise and ready waiters across boot', async () => {
    const box = vm.createContext({
        window: {},
        console,
        setTimeout, clearTimeout, setInterval, clearInterval,
        document: { querySelector: () => ({ id: 'today' }), querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} },
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        performance: { mark: () => {}, measure: () => {}, clearMarks: () => {} }
    });
    box.window = box;
    box.globalThis = box;
    box.window.ui = { _navigationToken: 1 };
    box.window.addEventListener = () => {};
    box.window.toast = { show: () => {} };
    box.window.errorBus = { event: () => {}, report: () => {} };

    vm.runInContext(`
        window.dataRecords = {};
        window.dataSchema = { normalizeDb() {}, generateRecordId: p => p + '-1', activeRecords: l => l || [] };
        window.dataUtils = { normalizeDb() {}, generateRecordId: p => p + '-1', activeRecords: l => l || [], render() {}, migrateLegacy: () => Promise.resolve() };
    `, box);
    vm.runInContext(readFileSync(path.join(root, 'data-store.js'), 'utf8'), box);

    const data = Object.assign({
        DB_KEY: 'test_db', CFG_KEY: 'test_cfg',
        db: { actions: [], routines: [], history: [], health: { weights: [], foodLogs: [], exerciseLogs: [], aiAdviceChat: [] } },
        cfg: {}, _activePageId: 'today',
        render: () => {}, normalizeDb: () => {}, migrateLegacy: () => Promise.resolve(),
        scheduleAdviceColdStart: () => {}, bindFlushHooks: () => {}, restoreActionDraft: () => {},
        activeRecords: l => l || [], generateRecordId: p => p + '-1',
        _initHistoryApi: () => {}, _initAdviceApi: () => {},
        beginActionBusy: () => true, endActionBusy: () => {}
    }, box.window.dataStore);

    let earlyActionRan = 0;
    let earlyWaiterSettled = false;
    const preInitWait = data.ensureDataReady();
    const preInitAction = data.whenReady(() => { earlyActionRan += 1; return 'executed'; }, { busyKey: 'preInitAction', routeAtClick: 'today' })
        .then((res) => { earlyWaiterSettled = true; return res; });

    assert.equal(data._readyState, 'pending');
    assert.ok(data._readyWaiters['preInitAction'], 'preInitAction must be registered in readyWaiters');
    const oldPromise = data._readyPromise;

    // Simulate boot calling data.init()
    await data.init();

    // Verify deferred promise identity is preserved and not orphaned
    assert.equal(data._readyState, 'ready');
    assert.equal(data._readyPromise, oldPromise, 'data.init must preserve existing _readyPromise during boot');
    assert.equal(await preInitWait, true, 'pre-init ensureDataReady must resolve true on init success');

    const actionResult = await preInitAction;
    assert.equal(actionResult, 'executed', 'pre-init whenReady action must execute');
    assert.equal(earlyActionRan, 1, 'pre-init whenReady action must run exactly once');
    assert.equal(earlyWaiterSettled, true, 'pre-init waiter promise must settle');
    assert.equal(data._readyWaiters['preInitAction'], undefined, 'waiter must be cleaned up from table');
});



test('R9-01: cross-run async speech continuation does not contaminate subsequent workout task timing', async () => {
    const dom = {
        subText: { innerText: '' },
        statusText: { innerText: '' },
        mainTime: { innerText: '' },
        curSet: { innerText: '' },
        totalSet: { innerText: '' },
        curRep: { innerText: '' },
        totalRep: { innerText: '' },
        sessionTime: { innerText: '' }
    };
    const documentMock = {
        getElementById: id => dom[id] || { innerText: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, querySelector: () => ({ style: {} }) },
        querySelector: () => null,
        querySelectorAll: () => []
    };
    const box = vm.createContext({
        console,
        setTimeout, clearTimeout, setInterval, clearInterval,
        Date, Math, Number, String, Array, Object, JSON,
        document: documentMock
    });
    box.window = box;
    box.globalThis = box;

    /** @type {Function} */
    let resolveSpeech1 = (v) => {};
    let spokenTexts = [];
    const workoutMock = {
        isPlaying: false,
        isPaused: false,
        _runToken: 0,
        speak(text) {
            spokenTexts.push(text);
            if (text === '组间休息') {
                return new Promise(resolve => {
                    resolveSpeech1 = resolve;
                });
            }
            return Promise.resolve();
        },
        count(sec, sub, status, token) {
            return Promise.resolve();
        },
        openSetReview() {},
        finish() {
            this.isPlaying = false;
            this._runToken = (this._runToken || 0) + 1;
            if (box.workoutEngine) {
                box.workoutEngine._runToken = (box.workoutEngine._runToken || 0) + 1;
                box.workoutEngine.state = null;
            }
        }
    };
    box.workout = workoutMock;

    let actions1 = [{
        name: '动作1',
        sets: 2,
        reps: 1,
        work: 3,
        actionRest: 600,
        groupRest: 10
    }];
    let currentActionsList = actions1;
    const dataMock = {
        _planActions: () => currentActionsList,
        activeRecords: arr => arr || [],
        db: { actions: [] }
    };
    box.data = dataMock;

    vm.runInContext(readFileSync(path.join(root, 'workout-engine.js'), 'utf8'), box);
    const engine = box.workoutEngine;

    // Start workout 1
    workoutMock.isPlaying = true;
    workoutMock._runToken = 1;
    engine._runToken = 1;
    engine.state = engine.createInitialState();
    engine.state._runToken = 1;

    const runPromise1 = engine.run(1);

    await new Promise(r => setTimeout(r, 50));

    assert.equal(engine.state.phase, 'setRest');
    assert.ok(resolveSpeech1, 'speak("组间休息") must be pending');

    // User finishes workout 1 while speech is still pending
    workoutMock.finish();
    assert.equal(workoutMock.isPlaying, false);
    assert.equal(engine.state, null);

    // User immediately starts workout 2 with 3-second hold action
    let actions2 = [{
        name: '动作2',
        sets: 1,
        reps: 1,
        work: 3,
        actionRest: 10,
        groupRest: 5
    }];
    currentActionsList = actions2;

    workoutMock.isPlaying = true;
    workoutMock._runToken = 2;
    engine._runToken = 2;
    engine.state = engine.createInitialState();
    engine.state._runToken = 2;
    engine.state.activeAction = actions2[0];
    engine.state.phase = 'hold';
    engine.state.phaseLeft = 3;

    // Delayed speech promise from workout 1 settles
    resolveSpeech1();
    await runPromise1;
    await new Promise(r => setTimeout(r, 50));

    assert.equal(engine.state.phase, 'hold', 'Task 2 phase must remain hold, not overwritten by stale task 1');
    assert.equal(engine.state.phaseLeft, 3, 'Task 2 phaseLeft must remain 3s hold, not contaminated by 600s rest');
    assert.equal(engine._runToken, 2, 'Engine token must remain 2');
});

test('R9-01-INTEGRATION: real core stop -> new training start -> delayed wake lock & speech -> lifecycle clean without zombie timers', async () => {
    const makeElem = () => ({
        innerText: '',
        style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        setAttribute() {},
        getAttribute: () => null,
        appendChild() {},
        remove() {},
        querySelector: () => ({ style: {} }),
        querySelectorAll: () => []
    });

    const dom = {
        subText: makeElem(),
        statusText: makeElem(),
        mainTime: makeElem(),
        curSet: makeElem(),
        totalSet: makeElem(),
        curRep: makeElem(),
        totalRep: makeElem(),
        sessionTime: makeElem(),
        rateLabel: makeElem(),
        playIcon: makeElem(),
        stopBtn: makeElem(),
        playBtn: makeElem(),
        pipBtn: makeElem(),
        timerTweak: makeElem(),
        prevBtn: makeElem(),
        silentAudio: { play: () => Promise.resolve(), catch: () => {} }
    };
    const documentMock = {
        getElementById: id => dom[id] || makeElem(),
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: (tag) => makeElem(),
        body: { classList: { add() {}, remove() {}, toggle() {} } },
        addEventListener: () => {},
        removeEventListener: () => {},
        hidden: false
    };

    /** @type {Function} */
    let resolveWakeLock1 = (v) => {};
    let wakeLock1Promise = new Promise(resolve => { resolveWakeLock1 = resolve; });

    let lock1Released = false;
    const lock1 = {
        id: "lock-1",
        release: async () => { lock1Released = true; }
    };

    let lock2Released = false;
    const lock2 = {
        id: "lock-2",
        release: async () => { lock2Released = true; }
    };

    let wakeLockCount = 0;
    const navigatorMock = {
        wakeLock: {
            request: (type) => {
                if (wakeLockCount === 1) return wakeLock1Promise;
                if (wakeLockCount === 2) return Promise.resolve(lock2);
                return Promise.resolve({ release: () => Promise.resolve() });
            }
        }
    };

    class CustomEventMock {
        constructor(type, init = {}) {
            this.type = type;
            this.detail = init.detail;
        }
    }

    const box = vm.createContext({
        console,
        setTimeout, clearTimeout, setInterval, clearInterval,
        Date, Math, Number, String, Array, Object, JSON,
        document: documentMock,
        navigator: navigatorMock,
        speechSynthesis: { cancel: () => {}, resume: () => {} },
        CustomEvent: CustomEventMock,
        confirm: () => true,
        alert: () => {}
    });
    box.window = box;
    box.globalThis = box;
    box.addEventListener = () => {};
    box.removeEventListener = () => {};
    box.dispatchEvent = () => true;
    box.workout = {};
    box.window.workoutVoice = {
        unlockAudio: () => {},
        speak: () => Promise.resolve(),
        cancel: () => {}
    };

    const actionsList = [{
        name: '动作1',
        sets: 1,
        reps: 1,
        work: 1,
        actionRest: 1,
        groupRest: 1
    }];

    box.data = {
        _planActions: () => actionsList,
        activeRecords: arr => arr || [],
        db: { actions: [], actualSetsBuffer: [] },
        save: () => {},
        saveAndBackup: () => {},
        logicalDateKey: () => '2026-11-07'
    };

    vm.runInContext(readFileSync(path.join(root, 'workout-wakelock.js'), 'utf8'), box);
    vm.runInContext(readFileSync(path.join(root, 'workout-system.js'), 'utf8'), box);
    vm.runInContext(readFileSync(path.join(root, 'workout-pip.js'), 'utf8'), box);
    vm.runInContext(readFileSync(path.join(root, 'workout-engine.js'), 'utf8'), box);
    vm.runInContext(readFileSync(path.join(root, 'workout-core.js'), 'utf8'), box);

    const workout = box.workout;
    const engine = box.workoutEngine;

    // 1. Start Workout 1 - enters acquireWakeLock which hangs on wakeLock1Promise
    wakeLockCount = 1;
    const togglePromise1 = workout.toggle();

    assert.equal(workout.isPlaying, true);
    assert.equal(workout._runToken, 1);
    assert.equal(workout.sessionInt, null, 'sessionInt must not be scheduled while wakeLock is pending');

    // 2. User stops Workout 1 while acquireWakeLock is still pending
    workout.stop('用户终止');
    assert.equal(workout.isPlaying, false);
    assert.ok(workout._runToken > 1, 'RunToken must increment on stop');
    assert.equal(box.window.workoutWakeLock.isActive(), false, 'Wake lock inactive after stop');
    const tokenAfterStop = workout._runToken;

    // 3. Start Workout 2 BEFORE delayed WakeLock 1 resolves (real overlapping concurrency)
    wakeLockCount = 2;
    const togglePromise2 = workout.toggle();
    await togglePromise2;

    assert.equal(workout.isPlaying, true, 'Workout 2 is playing');
    assert.ok(workout._runToken > tokenAfterStop, 'Workout 2 has fresh runToken');
    assert.equal(box.window.workoutWakeLock.isActive(), true, 'Workout 2 holds active wakeLock in service');
    assert.equal(lock2Released, false, 'lock2 is active');

    // 4. Delayed WakeLock 1 now resolves AFTER Workout 2 has already started!
    resolveWakeLock1(lock1);
    await togglePromise1;

    // 5. Verify old Lock 1 was immediately released and did NOT overwrite Workout 2 lock2
    assert.equal(lock1Released, true, 'Delayed Lock 1 must be immediately released due to stale token');
    assert.equal(box.window.workoutWakeLock.isActive(), true, 'Workout 2 wakeLock service must remain active and not overwritten');
    assert.equal(lock2Released, false, 'lock2 remains untouched and active');
    assert.equal(workout.isPlaying, true, 'Workout 2 continues uninterrupted');
    assert.ok(workout.sessionInt !== null, 'Workout 2 active sessionInt remains unpolluted');

    // 6. Finish Workout 2 - releases lock2 cleanly
    workout.finish();
    assert.equal(lock2Released, true, 'Lock 2 must be released on finish');
    assert.equal(box.window.workoutWakeLock.isActive(), false, 'Wake lock cleared in service after finish');
    assert.equal(workout.isPlaying, false);
    assert.equal(workout.sessionInt, null, 'Workout 2 finish must clean up sessionInt');
    assert.equal(engine.state, null, 'Engine state must be cleared');
});

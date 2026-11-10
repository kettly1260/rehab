const REST_PHASE_PATTERN = /rest|hold|recover|cooldown|pause|休息|恢复|放松/i;
const FINISHED_STATUS_PATTERN = /finish|finished|complete|completed|stop|stopped/i;
const ERROR_STATUS_PATTERN = /error|failed|failure/i;
const RECOVERY_ACTION_PATTERN = /recover|rehab|mobility|康复|活动度|激活/i;
const STRETCH_ACTION_PATTERN = /stretch|cooldown|release|拉伸|放松|伸展/i;

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function activeWorkoutActions(host) {
    const raw = host?.data?.db?.actions;
    return (Array.isArray(raw) ? raw : []).filter((action) => action && !action.deleted && !action.libOnly);
}

export function actionKind(action = {}) {
    const text = `${action.nature || ''} ${action.category || ''} ${action.type || ''} ${action.phase || ''} ${action.name || ''}`;
    if (STRETCH_ACTION_PATTERN.test(text) || action.phase === 'cooldown') return 'stretch';
    if (RECOVERY_ACTION_PATTERN.test(text)) return 'recovery';
    return 'strength';
}
if (typeof globalThis !== 'undefined') {
    globalThis.actionKind = actionKind;
}

function estimateActionPlan(actions = []) {
    const list = Array.isArray(actions) ? actions : [];
    const totalSets = list.reduce((sum, action) => sum + Math.max(1, Number(action.sets || 1)), 0);
    const seconds = list.reduce((sum, action) => {
        const sets = Math.max(1, Number(action.sets || 1));
        const reps = Math.max(1, Number(action.reps || 1));
        const work = Math.max(1, Number(action.work || 5));
        const repRest = Math.max(0, Number(action.repRest || 0));
        const actionRest = Math.max(0, Number(action.actionRest || 0));
        return sum + sets * reps * work + Math.max(0, sets - 1) * repRest + actionRest;
    }, 0);
    return { totalSets, minutes: Math.max(0, Math.round(seconds / 60)) };
}

function latestTodayPain(host) {
    const data = host?.data;
    const day = data?.logicalDateKey?.() || '';
    const plans = (Array.isArray(data?.db?.dailyPlans) ? data.db.dailyPlans : []).filter((plan) => !plan?.deleted && (!day || plan?.date === day));
    let latestScore = NaN;
    let latestAt = -Infinity;
    plans.forEach((plan) => {
        (Array.isArray(plan?.items) ? plan.items : []).forEach((item) => {
            const score = Number(item?.feedback?.painScore);
            if (!Number.isFinite(score)) return;
            const at = Number(item?.feedback?.doneAt || item?.updatedAt || plan?.updatedAt || 0);
            if (at >= latestAt) {
                latestScore = score;
                latestAt = at;
            }
        });
    });
    return Number.isFinite(latestScore) ? latestScore : undefined;
}

function recoveryScore(host) {
    const data = host?.data;
    try {
        const score = typeof data?.recoveryIndex === 'function'
            ? Number(data.recoveryIndex(data.db))
            : typeof host?.planAnalytics?.recoveryIndex === 'function'
                ? Number(host.planAnalytics.recoveryIndex(data?.db))
                : NaN;
        return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
    } catch {
        return null;
    }
}

function renderWorkoutIdleShell(root, host, viewState) {
    const documentRef = root.ownerDocument;
    let shell = root.querySelector('.v7-workout-idle-shell');
    if (!shell) {
        shell = documentRef.createElement('div');
        shell.className = 'v7-workout-idle-shell';
        const timer = root.querySelector('.timer-panel');
        timer?.before(shell);
    }

    const allActions = activeWorkoutActions(host);
    const requested = root.dataset.v7WorkoutIntent || (viewState.mode === 'cardio' ? 'cardio' : 'strength');
    const intent = ['strength', 'cardio', 'recovery', 'stretch'].includes(requested) ? requested : 'strength';
    const shownActions = intent === 'recovery' || intent === 'stretch'
        ? allActions.filter((action) => actionKind(action) === intent)
        : allActions;
    const metrics = estimateActionPlan(shownActions);
    const pain = latestTodayPain(host);
    const score = recoveryScore(host);
    const scoreLabel = score == null ? '—' : String(score);
    const scoreStatus = score == null
        ? '准备状态待评估'
        : score >= 80 ? '可以开始训练' : score >= 60 ? '建议保持中等强度' : '建议优先恢复';
    const scoreHint = score == null
        ? '保留计划强度，训练中根据疼痛与疲劳反馈调整'
        : score >= 80 ? '优先完成计划内容，不建议额外加量' : '根据今天的反馈及时降低训练量';
    const modeLabels = { strength: '力量', cardio: '有氧', recovery: '康复', stretch: '拉伸' };
    const preview = intent === 'cardio'
        ? (() => {
            const plan = host?.cardio?.currentPlan?.() || {};
            const target = Number(plan.targetMinutes || plan.minutes || documentRef.getElementById('cardioTarget')?.value || 0);
            const label = documentRef.getElementById('cardioType')?.selectedOptions?.[0]?.textContent?.trim() || '有氧训练';
            return `<div class="v7-workout-plan-row"><span class="v7-workout-plan-index">1</span><span><b>${escapeHtml(label)}</b><small>${target ? `目标 ${target} 分钟` : '设置目标后开始'}</small></span><em>待开始</em></div>`;
        })()
        : shownActions.slice(0, 3).map((action, index) => {
            const sets = Math.max(1, Number(action.sets || 1));
            const reps = Number(action.reps || 0);
            const work = Number(action.work || 0);
            const spec = reps > 0 ? `${sets} 组 × ${reps} 次` : work > 0 ? `${sets} 组 × ${work} 秒` : `${sets} 组`;
            return `<div class="v7-workout-plan-row"><span class="v7-workout-plan-index">${index + 1}</span><span><b>${escapeHtml(action.name || `训练动作 ${index + 1}`)}</b><small>${escapeHtml(spec)}</small></span><em>${index === 0 ? '待完成' : '待开始'}</em></div>`;
        }).join('');
    const todayPlans = host?.data?.getTodayDailyPlans?.() || (host?.data?.getTodayDailyPlan?.() ? [host.data.getTodayDailyPlan()] : []);
    const todayPlan = todayPlans[0] || null;
    const isResume = viewState.status === 'resume' || (host?.data?.activeRun && viewState.status !== 'idle');
    const hasTodayPlan = Boolean(todayPlan);
    const isLegacyQueue = !hasTodayPlan && allActions.length > 0;
    const planCount = intent === 'cardio' ? 1 : shownActions.length;
    const planBody = preview || `<div class="v7-workout-plan-empty">${intent === 'strength' ? (isLegacyQueue ? '历史队列暂无动作' : '当前计划还没有动作') : `当前计划没有${modeLabels[intent]}动作`}</div>`;
    const signature = JSON.stringify([
        intent,
        score,
        pain,
        planCount,
        metrics.minutes,
        metrics.totalSets,
        isLegacyQueue,
        todayPlan?.id,
        todayPlan?.date,
        allActions.map((action) => [action.id, action.name, action.phase, action.nature, action.sets, action.reps, action.work, action.updatedAt])
    ]);

    if (shell.dataset.v7Signature !== signature) {
        shell.dataset.v7WorkoutIntent = intent;
        shell.dataset.v7Signature = signature;
        const planHeadTitle = hasTodayPlan
            ? `今日计划 · ${escapeHtml(todayPlan.date || '')}`
            : isLegacyQueue
                ? '历史动作队列'
                : '训练计划';
        const planHeadMeta = hasTodayPlan
            ? `${todayPlan.title ? escapeHtml(todayPlan.title) + ' · ' : ''}${planCount ? `${planCount} 个动作` : '未安排'}`
            : isLegacyQueue
                ? '<em class="v7-legacy-badge" style="font-size:11px;color:var(--md-sys-error, #ba1a1a);font-style:normal">旧队列（今日未排计划）</em>'
                : (planCount ? `${planCount} 个动作` : '未安排');
        shell.innerHTML = `<section class="v7-workout-readiness-card"><span class="v7-workout-kicker">准备度</span><div class="v7-workout-readiness-main"><strong>${scoreLabel}</strong><div><b>${scoreStatus}</b><small>${scoreHint}</small></div></div><div class="v7-workout-readiness-meta"><span><small>计划动作</small><b>${allActions.length || '—'}</b></span><span><small>疼痛反馈</small><b>${pain == null ? '未记录' : `${pain}/10`}</b></span><span><small>预计时长</small><b>${metrics.minutes ? `${metrics.minutes} 分钟` : '待计算'}</b></span></div></section><div class="v7-workout-mode-tabs" role="tablist" aria-label="训练类型">${['strength', 'cardio', 'recovery', 'stretch'].map((mode) => `<button type="button" role="tab" data-v7-workout-mode="${mode}" aria-selected="${intent === mode}">${modeLabels[mode]}</button>`).join('')}</div><section class="v7-workout-plan-preview"><div class="v7-workout-plan-head"><b>${planHeadTitle}</b><span>${planHeadMeta} · <button type="button" data-v7-workout-editor-toggle>编辑计划</button> · <button type="button" data-v7-workout-mode="strengthLog">力量记录</button></span></div><div class="v7-workout-plan-card"><div class="v7-workout-plan-list">${planBody}</div>${planCount ? `<div class="v7-workout-plan-progress"><i style="--v7-workout-progress:0%"></i><span>计划进度 0 / ${planCount}</span></div>` : ''}</div></section><section class="v7-workout-session-strip"><span><small>预计</small><b>${metrics.minutes ? metrics.minutes : '—'}</b><em>${metrics.minutes ? '分钟' : ''}</em></span><span><small>总组数</small><b>${metrics.totalSets || '—'}</b></span><span><small>训练类型</small><b>${modeLabels[intent]}</b></span></section>`;
    }

    const title = root.querySelector('.workout-only-bar .app-title');
    if (title && title.textContent !== '今日训练') title.textContent = '今日训练';
    let subtitle = root.querySelector('.workout-page-subtitle');
    if (!subtitle) {
        subtitle = documentRef.createElement('span');
        subtitle.className = 'workout-page-subtitle';
        title?.after(subtitle);
    }
    const subtitleText = isResume
        ? `继续上次会话${todayPlan?.date ? ` · ${todayPlan.date}` : ''}`
        : viewState.status === 'running' || viewState.status === 'resting'
            ? '训练进行中 · 保持稳定节奏'
            : viewState.status === 'paused'
                ? '训练已暂停 · 准备好后继续'
                : isLegacyQueue
                    ? '历史动作队列（今日暂无计划）'
                    : score == null ? '准备好后开始今天的训练' : score >= 80 ? '恢复状态良好 · 按计划训练' : '根据恢复状态调整今天的强度';
    if (subtitle.textContent !== subtitleText) subtitle.textContent = subtitleText;
}

function renderWorkoutRunningContext(root, host, viewState, detail = {}) {
    const documentRef = root.ownerDocument;
    let panel = root.querySelector('.v7-workout-running-context');
    if (!panel) {
        panel = documentRef.createElement('section');
        panel.className = 'v7-workout-running-context';
        root.querySelector('.timer-panel')?.after(panel);
    }
    const action = detail.action || host?.workoutEngine?.state?.activeAction || null;
    const actions = activeWorkoutActions(host);
    const actionIndex = action ? actions.findIndex((item) => item.id === action.id || item.name === action.name) : -1;
    const next = actionIndex >= 0 ? actions[actionIndex + 1] : null;
    const currentName = action?.name || root.querySelector('#subText')?.textContent?.trim() || '当前训练';
    const phase = viewState.phase || host?.workoutEngine?.state?.phase || '';
    const signature = JSON.stringify([viewState.status, currentName, next?.id, next?.name, phase]);
    if (panel.dataset.v7Signature === signature) return;
    panel.dataset.v7Signature = signature;
    panel.innerHTML = `<div><small>当前动作</small><b>${escapeHtml(currentName)}</b><span>${phase ? escapeHtml(String(phase)) : '按计时器节奏完成当前阶段'}</span></div><div><small>下一阶段</small><b>${next ? escapeHtml(next.name || '下一动作') : '完成本次训练'}</b><span>${next ? `${Math.max(1, Number(next.sets || 1))} 组` : '完成后可保存记录'}</span></div>`;
}

function readJournal(host) {
    try {
        const state = host?.workoutState;
        const journal = state?.readJournal?.();
        return state?.isRecoverableJournal?.(journal) ? journal : null;
    } catch {
        return null;
    }
}

/** @param {{ workout?: any, cardio?: any, detail?: any, journal?: any }} [options] */
export function resolveWorkoutViewState({ workout = {}, cardio = {}, detail = {}, journal = null } = {}) {
    const rawStatus = String(detail.status || '');
    const phase = String(detail.phase || workout?._phaseStatus || workout?._phaseSub || '');
    const action = detail.action || null;
    const nature = String(action?.nature || action?.category || action?.type || '').toLowerCase();
    const mode = workout?.mode === 'cardio' || cardio?.isRunning
        ? 'cardio'
        : workout?.mode === 'strengthLog'
            ? 'strengthLog'
            : 'strength';
    let focus = mode;
    if (/recover|rehab|mobility|康复|活动度/.test(nature)) focus = 'recovery';
    if (/stretch|cooldown|拉伸|放松/.test(nature)) focus = 'stretch';

    let status = 'idle';
    if (ERROR_STATUS_PATTERN.test(rawStatus)) status = 'error';
    else if (FINISHED_STATUS_PATTERN.test(rawStatus)) status = 'finished';
    else if (rawStatus === 'starting') status = 'starting';
    else if (workout?.isPlaying || cardio?.isRunning) {
        if (workout?.isPaused || cardio?.isPaused || rawStatus === 'paused') status = 'paused';
        else if (REST_PHASE_PATTERN.test(phase)) status = 'resting';
        else status = 'running';
    } else if (journal?.isPlaying) status = 'resume';
    else if (mode === 'strengthLog') status = 'strength-logging';

    return Object.freeze({ status, mode, focus, phase });
}

function syncPrimaryControl(root, viewState) {
    const primary = root.querySelector('#playBtn');
    root.querySelectorAll('.v7-workout-primary-cta').forEach((element) => {
        if (element === primary) return;
        element.classList.remove('v7-workout-primary-cta', 'v7-liquid-control');
        element.removeAttribute('data-v7-liquid');
    });
    if (!primary) return;
    primary.classList.add('v7-workout-primary-cta', 'v7-liquid-control');
    primary.setAttribute('data-v7-liquid', 'primary');
    const label = primary.querySelector('.fab-label');
    const text = viewState.status === 'paused'
        ? '继续训练'
        : viewState.status === 'running' || viewState.status === 'resting'
            ? '暂停训练'
            : '开始训练';
    if (label && label.textContent !== text) label.textContent = text;
    if (primary.getAttribute('aria-label') !== text) primary.setAttribute('aria-label', text);
}

function enhanceWorkout(root, services, host, detail = {}) {
    const workout = services?.workout || host?.workout || {};
    const cardio = services?.cardio || host?.cardio || {};
    const viewState = resolveWorkoutViewState({ workout, cardio, detail, journal: readJournal(host) });
    root.classList.add('v7-feature-workout');
    root.dataset.v7WorkoutState = viewState.status;
    root.dataset.v7WorkoutMode = viewState.mode;
    root.dataset.v7WorkoutFocus = viewState.focus;
    if (viewState.phase) root.dataset.v7WorkoutPhase = viewState.phase;
    else delete root.dataset.v7WorkoutPhase;
    renderWorkoutIdleShell(root, host, viewState);
    renderWorkoutRunningContext(root, host, viewState, detail);

    root.querySelectorAll([
        '.timer-panel',
        '.input-card',
        '.cardio-card',
        '.strength-log-card',
        '.routine-tool',
        '.workout-plan-card',
        '.list-item',
        '.empty-state'
    ].join(',')).forEach((element) => element.classList.add('v7-workout-surface'));
    root.querySelectorAll('.mode-tabs').forEach((element) => element.classList.add('v7-workout-segmented'));
    root.querySelectorAll('.mode-tab').forEach((element) => element.classList.add('v7-workout-segment'));
    root.querySelectorAll('.fab-play-aura').forEach((element) => element.setAttribute('aria-hidden', 'true'));
    syncPrimaryControl(root, viewState);
    return viewState;
}

function clearEnhancements(root) {
    root.classList.remove('v7-page-mounted', 'v7-feature-workout');
    delete root.dataset.v7WorkoutState;
    delete root.dataset.v7WorkoutMode;
    delete root.dataset.v7WorkoutFocus;
    delete root.dataset.v7WorkoutPhase;
    delete root.dataset.v7WorkoutIntent;
    delete root.dataset.v7WorkoutEditor;
    root.querySelector('.v7-workout-idle-shell')?.remove();
    root.querySelector('.v7-workout-running-context')?.remove();
    root.querySelector('.workout-page-subtitle')?.remove();
    root.querySelectorAll('.v7-workout-surface').forEach((element) => element.classList.remove('v7-workout-surface'));
    root.querySelectorAll('.v7-workout-segmented').forEach((element) => element.classList.remove('v7-workout-segmented'));
    root.querySelectorAll('.v7-workout-segment').forEach((element) => element.classList.remove('v7-workout-segment'));
    root.querySelectorAll('.v7-workout-primary-cta').forEach((element) => {
        element.classList.remove('v7-workout-primary-cta', 'v7-liquid-control');
        element.removeAttribute('data-v7-liquid');
    });
}

export const workoutFeature = Object.freeze({
    id: 'workout',
    mount({ context, scope }) {
        const root = context.document?.getElementById?.('workout');
        if (!root) throw new Error('V7 Workout root missing');
        const host = context.document?.defaultView || globalThis;
        const services = context.legacy?.services;
        root.classList.add('v7-page-shell', 'v7-page-mounted');
        root.dataset.v7Feature = 'workout';
        root.dataset.v7Mounted = 'true';

        services?.workout?.bindHotkeys?.();
        host.workoutReadiness?.mount?.();
        enhanceWorkout(root, services, host);

        scope.listen(root, 'click', (event) => {
            const editorToggle = event.target?.closest?.('[data-v7-workout-editor-toggle]');
            if (editorToggle && root.contains(editorToggle)) {
                root.dataset.v7WorkoutEditor = root.dataset.v7WorkoutEditor === 'open' ? 'closed' : 'open';
                return;
            }
            const button = event.target?.closest?.('[data-v7-workout-mode]');
            if (!button || !root.contains(button)) return;
            const mode = button.dataset.v7WorkoutMode;
            if (mode === 'strengthLog') {
                root.dataset.v7WorkoutIntent = 'strength';
                (services?.workout || host?.workout)?.setMode?.('strengthLog');
                return;
            }
            if (!['strength', 'cardio', 'recovery', 'stretch'].includes(mode)) return;
            root.dataset.v7WorkoutIntent = mode;
            if (host?.data) {
                host.data._activeWorkoutIntentFilter = (mode === 'recovery' || mode === 'stretch') ? mode : null;
            }
            (services?.workout || host?.workout)?.setMode?.(mode === 'cardio' ? 'cardio' : 'strength');
            enhanceWorkout(root, services, host);
        });

        scope.listen(host, 'workout:state', (event) => enhanceWorkout(root, services, host, event?.detail || {}));
        scope.listen(root, 'click', () => host.queueMicrotask?.(() => {
            if (!scope.disposed) enhanceWorkout(root, services, host);
        }));

        const Observer = host.MutationObserver;
        if (Observer) {
            const observer = new Observer(() => enhanceWorkout(root, services, host));
            scope.observe(observer, root, { childList: true, subtree: true });
        }

        return () => {
            host.workoutReadiness?.unmount?.();
            services?.workout?.unbindHotkeys?.();
            clearEnhancements(root);
            root.dataset.v7Mounted = 'false';
        };
    },
    update({ context }) {
        const root = context.document?.getElementById?.('workout');
        if (!root) return;
        const host = context.document?.defaultView || globalThis;
        enhanceWorkout(root, context.legacy?.services, host);
    }
});

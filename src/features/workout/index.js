const REST_PHASE_PATTERN = /rest|hold|recover|cooldown|pause|休息|恢复|放松/i;
const FINISHED_STATUS_PATTERN = /finish|finished|complete|completed|stop|stopped/i;
const ERROR_STATUS_PATTERN = /error|failed|failure/i;

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

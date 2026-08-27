const PROFILE_VIEWS = new Set(['home', 'library', 'weightloss', 'ai', 'sync', 'experiments']);
const PROFILE_SURFACE_SELECTORS = [
    '#profileOverview > *',
    '#profileContent > *',
    '#profileSettings > .sync-card',
    '.profile-hero',
    '.health-profile-card',
    '.profile-version-footer',
    '.routine-tool',
    '.routine-card',
    '.action-card',
    '.plan-equipment-card',
    '.weightloss-plan-card'
].join(',');

export function resolveProfileView(data = {}) {
    const raw = String(data?.routineView || 'home');
    return PROFILE_VIEWS.has(raw) ? raw : 'home';
}

function enhanceProfile(root, data) {
    const view = resolveProfileView(data);
    root.classList.add('v7-feature-profile');
    root.dataset.v7Feature = 'profile';
    root.dataset.v7ProfileView = view;
    root.querySelectorAll(PROFILE_SURFACE_SELECTORS).forEach((element) => {
        element.classList.add('v7-profile-surface');
    });
    root.querySelectorAll('.setting-list').forEach((element) => element.classList.add('v7-profile-setting-list'));
    root.querySelectorAll('.setting-row').forEach((element) => element.classList.add('v7-profile-setting-row'));
    root.querySelectorAll('.profile-v6-back-row').forEach((element) => element.classList.add('v7-profile-back-row'));
    root.querySelectorAll('.library-segment, .library-segmented').forEach((element) => element.classList.add('v7-profile-segmented'));
    root.querySelectorAll('[data-library-view]').forEach((element) => element.classList.add('v7-profile-segment'));
    root.querySelectorAll('.md-btn-filled, .profile-edit-btn, .pvf-check').forEach((element) => {
        element.classList.add('v7-profile-primary-control');
    });
    return view;
}

function clearProfileEnhancements(root) {
    root.classList.remove('v7-page-mounted', 'v7-feature-profile');
    delete root.dataset.v7ProfileView;
    root.querySelectorAll('.v7-profile-surface').forEach((element) => element.classList.remove('v7-profile-surface'));
    root.querySelectorAll('.v7-profile-setting-list').forEach((element) => element.classList.remove('v7-profile-setting-list'));
    root.querySelectorAll('.v7-profile-setting-row').forEach((element) => element.classList.remove('v7-profile-setting-row'));
    root.querySelectorAll('.v7-profile-back-row').forEach((element) => element.classList.remove('v7-profile-back-row'));
    root.querySelectorAll('.v7-profile-segmented').forEach((element) => element.classList.remove('v7-profile-segmented'));
    root.querySelectorAll('.v7-profile-segment').forEach((element) => element.classList.remove('v7-profile-segment'));
    root.querySelectorAll('.v7-profile-primary-control').forEach((element) => element.classList.remove('v7-profile-primary-control'));
}

function clearProfileRuntime(data, host) {
    ['_routineViewAnimationTimer', '_libraryDeckScrollTimer'].forEach((key) => {
        if (data?.[key]) host.clearTimeout?.(data[key]);
        if (data) data[key] = 0;
    });
    if (data?._libraryDeckScrollFrame) {
        (host.cancelAnimationFrame || host.clearTimeout)?.call(host, data._libraryDeckScrollFrame);
        data._libraryDeckScrollFrame = 0;
    }
    data?.resetProfileSwipe?.();
}

export const profileFeature = Object.freeze({
    id: 'profile',
    mount({ context, scope }) {
        const root = context.document?.getElementById?.('profile');
        if (!root) throw new Error('V7 Profile root missing');
        const host = context.document?.defaultView || globalThis;
        const data = context.legacy?.getData?.() || host.data;
        let enhanceFrame = 0;
        const requestFrame = host.requestAnimationFrame || ((callback) => host.setTimeout?.(callback, 16));
        const cancelFrame = host.cancelAnimationFrame || host.clearTimeout;
        const scheduleEnhance = () => {
            if (enhanceFrame || scope.disposed) return;
            enhanceFrame = requestFrame.call(host, () => {
                enhanceFrame = 0;
                if (!scope.disposed) enhanceProfile(root, data);
            });
        };

        root.classList.add('v7-page-shell', 'v7-page-mounted');
        root.dataset.v7Feature = 'profile';
        root.dataset.v7Mounted = 'true';
        data?.renderProfilePage?.();
        enhanceProfile(root, data);

        scope.listen(root, 'click', scheduleEnhance);
        scope.listen(root, 'input', scheduleEnhance);
        scope.listen(host, 'profile:updated', scheduleEnhance);
        const Observer = host.MutationObserver;
        if (Observer) {
            const observer = new Observer(scheduleEnhance);
            scope.observe(observer, root, { childList: true, subtree: true });
        }
        scope.raf(() => {
            if (scope.disposed) return;
            data?.syncExperimentSettingsUi?.();
            data?.refreshSwCacheName?.();
            data?.syncRoutineSubpageNav?.(resolveProfileView(data));
            enhanceProfile(root, data);
        });
        scope.add(() => {
            if (enhanceFrame) cancelFrame?.call(host, enhanceFrame);
            enhanceFrame = 0;
        });

        return () => {
            clearProfileRuntime(data, host);
            clearProfileEnhancements(root);
            root.dataset.v7Mounted = 'false';
        };
    },
    update({ context }) {
        const root = context.document?.getElementById?.('profile');
        if (!root) return;
        const host = context.document?.defaultView || globalThis;
        const data = context.legacy?.getData?.() || host.data;
        data?.renderProfilePage?.();
        enhanceProfile(root, data);
    }
});

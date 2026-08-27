const RECORD_VIEWS = new Set(['diet', 'weight', 'training', 'calendar']);

export function resolveRecordsView(data) {
    const view = String(data?.healthView || 'diet');
    return RECORD_VIEWS.has(view) ? view : 'diet';
}

function enhanceRecords(root, data) {
    const view = resolveRecordsView(data);
    root.classList.add('v7-feature-records');
    root.dataset.v7RecordsView = view;

    root.querySelectorAll('.record-tabs').forEach((element) => element.classList.add('v7-records-segmented'));
    root.querySelectorAll('.record-tab').forEach((element) => element.classList.add('v7-records-segment'));
    root.querySelectorAll([
        '.stat-tile',
        '.md-card',
        '.weight-chart-wrap',
        '.list-item',
        '.day-detail-item',
        '.weight-list-item',
        '.empty-state'
    ].join(',')).forEach((element) => element.classList.add('v7-records-surface'));

    if (view === 'weight') data?.scheduleWeightChartPinchBinding?.();
    return view;
}

function clearEnhancements(root) {
    root.classList.remove('v7-page-mounted', 'v7-feature-records');
    delete root.dataset.v7RecordsView;
    root.querySelectorAll('.v7-records-segmented').forEach((element) => element.classList.remove('v7-records-segmented'));
    root.querySelectorAll('.v7-records-segment').forEach((element) => element.classList.remove('v7-records-segment'));
    root.querySelectorAll('.v7-records-surface').forEach((element) => element.classList.remove('v7-records-surface'));
}

function cancelRecordsChartRuntime(data, root, host) {
    const cancel = host.cancelAnimationFrame || host.clearTimeout;
    if (data?._weightChartBindFrame) cancel?.call(host, data._weightChartBindFrame);
    if (data?._weightChartPinch?.frame) cancel?.call(host, data._weightChartPinch.frame);
    if (data) data._weightChartBindFrame = 0;
    host.clearTimeout?.(data?._weightTipTimer);
    if (data) data._weightTipTimer = 0;
    data?.clearWeightChartPinch?.();
    root.querySelectorAll('.weight-chart-wrap[data-pinch-chart]').forEach((wrap) => {
        wrap._p?.forEach?.(([type, handler]) => wrap.removeEventListener(type, handler));
        delete wrap._p;
        delete wrap._b;
    });
}

export const recordsFeature = Object.freeze({
    id: 'records',
    mount({ context, scope }) {
        const root = context.document?.getElementById?.('records');
        if (!root) throw new Error('V7 Records root missing');
        const host = context.document?.defaultView || globalThis;
        const data = context.legacy?.getData?.() || host.data;
        const requestFrame = host.requestAnimationFrame || ((callback) => host.setTimeout?.(callback, 16));
        const cancelFrame = host.cancelAnimationFrame || host.clearTimeout;
        let enhanceFrame = 0;

        root.classList.add('v7-page-shell', 'v7-page-mounted');
        root.dataset.v7Feature = 'records';
        root.dataset.v7Mounted = 'true';
        data?.ensureHealthViewCss?.(resolveRecordsView(data));
        data?.renderRecordsPage?.();

        const scheduleEnhance = () => {
            if (enhanceFrame || scope.disposed) return;
            enhanceFrame = requestFrame.call(host, () => {
                enhanceFrame = 0;
                if (!scope.disposed) enhanceRecords(root, data);
            });
        };
        enhanceRecords(root, data);
        scope.listen(root, 'click', scheduleEnhance);

        const Observer = host.MutationObserver;
        if (Observer) {
            const observer = new Observer(scheduleEnhance);
            scope.observe(observer, root, { childList: true, subtree: true });
        }
        scope.add(() => {
            if (enhanceFrame) cancelFrame?.call(host, enhanceFrame);
            enhanceFrame = 0;
        });

        return () => {
            cancelRecordsChartRuntime(data, root, host);
            host.clearTimeout?.(data?._healthDeckScrollTimer);
            if (data) data._healthDeckScrollTimer = 0;
            clearEnhancements(root);
            root.dataset.v7Mounted = 'false';
        };
    },
    update({ context }) {
        const root = context.document?.getElementById?.('records');
        if (!root) return;
        const host = context.document?.defaultView || globalThis;
        enhanceRecords(root, context.legacy?.getData?.() || host.data);
    }
});

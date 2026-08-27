const COACH_SURFACE_SELECTORS = [
    '.ai-insight',
    '.advice-v6-filter-bar',
    '.advice-v6-chat-list',
    '.advice-bubble',
    '.advice-v6-suggestions-card',
    '.advice-search-panel',
    '.advice-context-popover',
    '.advice-error',
    '.advice-empty'
].join(',');

function enhanceCoach(root) {
    root.classList.add('v7-feature-coach');
    root.dataset.v7Feature = 'ai-coach';
    root.querySelectorAll(COACH_SURFACE_SELECTORS).forEach((element) => element.classList.add('v7-coach-surface'));
    root.querySelectorAll('.advice-bubble.user').forEach((element) => element.classList.add('v7-coach-user-bubble'));
    root.querySelectorAll('.advice-bubble.assistant').forEach((element) => element.classList.add('v7-coach-assistant-bubble'));
    root.querySelectorAll('.advice-composer-stack').forEach((element) => element.classList.add('v7-coach-composer'));
    root.querySelectorAll('.advice-model-chip, .advice-reasoning-chip').forEach((element) => element.classList.add('v7-coach-selected-control'));
    root.querySelectorAll('.advice-quick-prompts, .advice-v6-suggestions').forEach((element) => element.classList.add('v7-coach-suggestion-controls'));
    root.querySelectorAll('.advice-attachment-preview, .advice-model-picker').forEach((element) => element.classList.add('v7-coach-secondary-surface'));
}

function unbindCoachScrollRuntime(data, host) {
    const scroll = data?._adviceScrollEl;
    scroll?.removeEventListener?.('scroll', data._adviceOnScroll);
    scroll?.removeEventListener?.('wheel', data._adviceOnUserIntent);
    scroll?.removeEventListener?.('keydown', data._adviceOnUserIntent);
    scroll?.removeEventListener?.('touchstart', data._adviceOnTouchIntent);
    scroll?.removeEventListener?.('touchmove', data._adviceOnTouchIntent);
    scroll?.removeEventListener?.('touchmove', data._adviceOnTopChromeTouchMove);
    data?._adviceGestureEl?.removeEventListener?.('touchstart', data._adviceOnTopChromeTouchStart, true);
    data?._adviceGestureEl?.removeEventListener?.('touchmove', data._adviceOnTopChromeTouchMove, true);
    data?._adviceTopChromeEl?.removeEventListener?.('pointerdown', data._adviceOnTopChromePointerDown);
    data?._adviceTopChromeEl?.removeEventListener?.('click', data._adviceOnTopChromePointerDown);
    data?._adviceTopChromeEl?.removeEventListener?.('wheel', data._adviceOnTopChromeIntent);
    data?._adviceTopChromeEl?.removeEventListener?.('touchstart', data._adviceOnTopChromeIntent);
    data?._adviceTopChromeEl?.removeEventListener?.('touchmove', data._adviceOnTopChromeIntent);
    host.clearTimeout?.(data?._adviceUserScrollIntentTimer);
    if (data?._adviceScrollRaf) (host.cancelAnimationFrame || host.clearTimeout)?.call(host, data._adviceScrollRaf);
    if (!data) return;
    data._adviceScrollEl = null;
    data._adviceGestureEl = null;
    data._adviceTopChromeEl = null;
    data._adviceUserScrollIntentTimer = 0;
    data._adviceScrollRaf = 0;
}

function clearCoachRuntime(data, root, host) {
    data?.captureAdviceDraft?.();
    data?.captureAdviceScroll?.();
    const previews = data?._adviceAttachmentPreviewUrls || {};
    Object.keys(previews).forEach((key) => {
        try { host.URL?.revokeObjectURL?.(previews[key]); } catch {}
    });
    if (data) data._adviceAttachmentPreviewUrls = {};
    unbindCoachScrollRuntime(data, host);
    if (data?._adviceSearchTimer) host.clearTimeout?.(data._adviceSearchTimer);
    if (data) {
        data._adviceSearchTimer = 0;
        data._adviceSearchRequestId = Number(data._adviceSearchRequestId || 0) + 1;
    }
    if (data?._adviceScrollRaf) {
        (host.cancelAnimationFrame || host.clearTimeout)?.call(host, data._adviceScrollRaf);
        data._adviceScrollRaf = 0;
    }
    const renderers = new Set(Object.values(data?._streamRenderers || {}));
    if (data?._activeStreamRenderer) renderers.add(data._activeStreamRenderer);
    renderers.forEach((renderer) => {
        try { renderer?.destroy?.(); } catch {}
    });
    if (data) {
        data._streamRenderers = {};
        data._activeStreamRenderer = null;
    }
    try { data?._adviceVirtualController?.destroy?.(); } catch {}
    if (data) data._adviceVirtualController = null;
    root.querySelectorAll('[data-advice-virtual-list]').forEach((list) => {
        try { list._adviceVirtualController?.destroy?.(); } catch {}
    });
}

export const coachFeature = Object.freeze({
    id: 'ai-coach',
    mount({ context, scope }) {
        const root = context.document?.getElementById?.('ai-coach');
        if (!root) throw new Error('V7 Coach root missing');
        const host = context.document?.defaultView || globalThis;
        const data = context.legacy?.getData?.() || host.data;

        root.classList.add('v7-page-shell', 'v7-page-mounted');
        root.dataset.v7Feature = 'ai-coach';
        root.dataset.v7Mounted = 'true';
        host.advicePanel?.attach?.(data);
        data?.renderAiCoachPage?.();

        let enhanceFrame = 0;
        const requestFrame = host.requestAnimationFrame || ((callback) => host.setTimeout?.(callback, 16));
        const cancelFrame = host.cancelAnimationFrame || host.clearTimeout;
        const scheduleEnhance = () => {
            if (enhanceFrame || scope.disposed) return;
            enhanceFrame = requestFrame.call(host, () => {
                enhanceFrame = 0;
                if (!scope.disposed) enhanceCoach(root);
            });
        };

        enhanceCoach(root);
        scope.listen(root, 'click', scheduleEnhance);
        scope.listen(root, 'input', scheduleEnhance);
        scope.listen(host, 'advice:render-state', scheduleEnhance);
        const Observer = host.MutationObserver;
        if (Observer) {
            const observer = new Observer(scheduleEnhance);
            scope.observe(observer, root, { childList: true, subtree: true });
        }
        scope.raf(() => {
            if (scope.disposed) return;
            data?.autoResizeAdvicePrompt?.();
            data?.bindAdviceAttachmentControls?.();
            data?.updateAdviceSendState?.();
            data?.refreshAdviceSearchResults?.();
            data?.bindAdviceScrollListener?.();
            data?.restoreAdviceScroll?.();
            enhanceCoach(root);
        });
        scope.add(() => {
            if (enhanceFrame) cancelFrame?.call(host, enhanceFrame);
            enhanceFrame = 0;
        });

        return () => {
            clearCoachRuntime(data, root, host);
            root.classList.remove('v7-page-mounted', 'v7-feature-coach');
            root.querySelectorAll('.v7-coach-surface, .v7-coach-user-bubble, .v7-coach-assistant-bubble, .v7-coach-composer, .v7-coach-selected-control, .v7-coach-suggestion-controls, .v7-coach-secondary-surface').forEach((element) => {
                element.classList.remove('v7-coach-surface', 'v7-coach-user-bubble', 'v7-coach-assistant-bubble', 'v7-coach-composer', 'v7-coach-selected-control', 'v7-coach-suggestion-controls', 'v7-coach-secondary-surface');
            });
            root.dataset.v7Mounted = 'false';
        };
    },
    update({ context }) {
        const root = context.document?.getElementById?.('ai-coach');
        if (root) enhanceCoach(root);
    }
});

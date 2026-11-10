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

function ensureCoachHeader(root, data) {
    if (typeof root.querySelector !== 'function') return;
    const header = root.querySelector('.md-top-app-bar');
    if (!header) return;
    header.classList.add('v7-coach-header');
    header.querySelector('.app-icon')?.setAttribute('aria-hidden', 'true');
    const title = header.querySelector('.app-title');
    if (title) title.textContent = '康复教练';
    const leading = header.querySelector('.bar-leading');
    let subtitle = header.querySelector('.v7-coach-page-subtitle');
    if (!subtitle && leading) {
        subtitle = root.ownerDocument.createElement('span');
        subtitle.className = 'v7-coach-page-subtitle';
        subtitle.textContent = '基于你的训练、恢复和历史记录给出建议';
        leading.append(subtitle);
    }

    const trailing = header.querySelector('.bar-trailing');
    let modelEntry = header.querySelector('.v7-coach-model-entry');
    if (!modelEntry && trailing) {
        modelEntry = root.ownerDocument.createElement('button');
        modelEntry.type = 'button';
        modelEntry.className = 'v7-coach-model-entry';
        modelEntry.innerHTML = '<span>默认模型</span><span aria-hidden="true">⌄</span>';
        modelEntry.addEventListener('click', () => data?.openAdviceModelPicker?.());
        trailing.prepend(modelEntry);
    }
}

function ensureCoachAdvancedTools(root, data) {
    if (typeof root.querySelector !== 'function') return;
    const page = root.querySelector('.advice-v6-page');
    const composer = page?.querySelector('.advice-composer-stack');
    if (!page || !composer) return;
    let details = page.querySelector('.v7-coach-advanced-tools');
    if (!details) {
        details = root.ownerDocument.createElement('details');
        details.className = 'v7-coach-advanced-tools';
        details.innerHTML = '<summary>更多教练工具</summary><div class="v7-coach-advanced-actions"></div>';
        composer.after(details);
    }
    const actions = details.querySelector('.v7-coach-advanced-actions');
    const filterBar = page.querySelector(':scope > .advice-v6-filter-bar');
    if (filterBar && actions && filterBar.parentElement !== actions) actions.append(filterBar);

    const sectionHead = page.querySelector(':scope > .sect-head');
    const clear = sectionHead?.querySelector('.a');
    if (clear && actions && clear.parentElement !== actions) {
        clear.classList.add('v7-coach-clear-action');
        actions.append(clear);
    }
    if (sectionHead && !sectionHead.querySelector('.v7-coach-history-button')) {
        const history = root.ownerDocument.createElement('button');
        history.type = 'button';
        history.className = 'v7-coach-history-button';
        history.textContent = '历史记录';
        history.addEventListener('click', () => data?.setAdviceRange?.('all'));
        sectionHead.append(history);
    }

    if (actions && !actions.querySelector('.v7-coach-utility-actions')) {
        const utility = root.ownerDocument.createElement('div');
        utility.className = 'v7-coach-utility-actions';
        const usage = root.ownerDocument.createElement('button');
        usage.type = 'button';
        usage.textContent = 'AI 用量';
        usage.addEventListener('click', () => data?.showAiUsageDialog?.());
        const regenerate = root.ownerDocument.createElement('button');
        regenerate.type = 'button';
        regenerate.textContent = '重新生成';
        regenerate.addEventListener('click', () => data?.regenerateAdvice?.());
        utility.append(usage, regenerate);
        actions.prepend(utility);
    }
    const utility = actions?.querySelector('.v7-coach-utility-actions');
    const reasoning = page.querySelector('.advice-reasoning-chip');
    if (utility && reasoning && reasoning.parentElement !== utility) {
        reasoning.classList.add('v7-coach-advanced-reasoning');
        utility.append(reasoning);
    }
}

function enhanceCoach(root, data) {
    root.classList.add('v7-feature-coach');
    root.dataset.v7Feature = 'ai-coach';
    ensureCoachHeader(root, data);
    root.querySelectorAll(COACH_SURFACE_SELECTORS).forEach((element) => element.classList.add('v7-coach-surface'));
    root.querySelectorAll('.advice-bubble.user').forEach((element) => element.classList.add('v7-coach-user-bubble'));
    root.querySelectorAll('.advice-bubble.assistant').forEach((element) => element.classList.add('v7-coach-assistant-bubble'));
    root.querySelectorAll('.advice-composer-stack').forEach((element) => element.classList.add('v7-coach-composer'));
    root.querySelectorAll('.advice-model-chip, .advice-reasoning-chip').forEach((element) => element.classList.add('v7-coach-selected-control'));
    root.querySelectorAll('.advice-quick-prompts, .advice-v6-suggestions').forEach((element) => element.classList.add('v7-coach-suggestion-controls'));
    root.querySelectorAll('.advice-attachment-preview, .advice-model-picker').forEach((element) => element.classList.add('v7-coach-secondary-surface'));
    root.querySelectorAll('.advice-v6-suggestions-card').forEach((element) => {
        element.open = true;
        const summary = element.querySelector('summary');
        if (summary && summary.textContent !== '快捷提问') summary.textContent = '快捷提问';
    });
    root.querySelectorAll('.advice-bubble').forEach((bubble) => {
        const actions = bubble.querySelector('.advice-bubble-actions');
        const head = bubble.querySelector('.advice-bubble-head');
        if (!actions || !head || head.querySelector('.v7-coach-action-toggle')) return;
        const toggle = root.ownerDocument.createElement('button');
        toggle.type = 'button';
        toggle.className = 'v7-coach-action-toggle';
        toggle.setAttribute('aria-label', '消息操作');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '⋯';
        head.append(toggle);
    });
    root.querySelectorAll('.v7-coach-suggestion-controls > button').forEach((button, index) => {
        if (button.dataset.v7CoachLabel) return;
        const source = String(button.textContent || '').trim();
        let label = source;
        if (/新建|创建/.test(source)) label = '新建训练计划';
        else if (/优化|调整.*计划|计划.*调整/.test(source)) label = '优化当前计划';
        else if (/反馈|恢复|疼痛/.test(source)) label = '按反馈调整';
        else if (/饮食|蛋白|晚餐/.test(source)) label = '分析今日饮食';
        else if (/训练/.test(source)) label = '分析今天训练';
        if (label.length > 8) label = label.slice(0, 8);
        button.dataset.v7CoachLabel = source || String(index + 1);
        button.textContent = label;
    });
    ensureCoachAdvancedTools(root, data);
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
                if (!scope.disposed) enhanceCoach(root, data);
            });
        };

        enhanceCoach(root, data);
        scope.listen(root, 'click', (event) => {
            const toggle = event.target?.closest?.('.v7-coach-action-toggle');
            if (!toggle || !root.contains(toggle)) return;
            const bubble = toggle.closest('.advice-bubble');
            if (!bubble) return;
            const open = !bubble.classList.contains('v7-actions-open');
            root.querySelectorAll('.advice-bubble.v7-actions-open').forEach((item) => {
                if (item === bubble) return;
                item.classList.remove('v7-actions-open');
                item.querySelector('.v7-coach-action-toggle')?.setAttribute('aria-expanded', 'false');
            });
            bubble.classList.toggle('v7-actions-open', open);
            toggle.setAttribute('aria-expanded', String(open));
        });
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
            enhanceCoach(root, data);
        });
        scope.add(() => {
            if (enhanceFrame) cancelFrame?.call(host, enhanceFrame);
            enhanceFrame = 0;
        });

        return () => {
            clearCoachRuntime(data, root, host);
            root.classList.remove('v7-page-mounted', 'v7-feature-coach');
            root.querySelector?.('.v7-coach-page-subtitle')?.remove();
            root.querySelector?.('.v7-coach-model-entry')?.remove();
            root.querySelectorAll('.v7-coach-action-toggle').forEach((element) => element.remove());
            root.querySelectorAll('.advice-bubble.v7-actions-open').forEach((element) => element.classList.remove('v7-actions-open'));
            root.querySelectorAll('.v7-coach-surface, .v7-coach-user-bubble, .v7-coach-assistant-bubble, .v7-coach-composer, .v7-coach-selected-control, .v7-coach-suggestion-controls, .v7-coach-secondary-surface').forEach((element) => {
                element.classList.remove('v7-coach-surface', 'v7-coach-user-bubble', 'v7-coach-assistant-bubble', 'v7-coach-composer', 'v7-coach-selected-control', 'v7-coach-suggestion-controls', 'v7-coach-secondary-surface');
            });
            root.dataset.v7Mounted = 'false';
        };
    },
    update({ context }) {
        const root = context.document?.getElementById?.('ai-coach');
        if (!root) return;
        const host = context.document?.defaultView || globalThis;
        enhanceCoach(root, context.legacy?.getData?.() || host.data);
    }
});

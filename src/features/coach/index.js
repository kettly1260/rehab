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

function syncCoachModelEntry(modelEntry, doc, data, host) {
    if (!modelEntry || typeof doc?.createElement !== 'function') return;
    const aiInstance = host?.ai;
    const taskId = data?.advicePickerTaskId?.() || 'advice.chat';
    const effective = aiInstance?.resolveTaskConfig?.(taskId)
        || aiInstance?.getEffectiveConfig?.()
        || aiInstance?.cfg
        || {};
    const route = aiInstance?.getTaskRoute?.(taskId) || {};
    const selectable = typeof aiInstance?.listSelectableModels === 'function'
        ? aiInstance.listSelectableModels(taskId)?.[0] || null
        : null;
    const profileId = String(effective.profileId || route?.primary?.profileId || aiInstance?.cfg?.activeProfileId || selectable?.profileId || '');
    const activeProfile = (aiInstance?.cfg?.profiles || []).find((item) => item && item.id === profileId) || null;
    const rawModel = String(
        effective.model
        || route?.primary?.modelId
        || data?.resolveAdviceTaskModel?.({ taskId })
        || activeProfile?.model
        || aiInstance?.cfg?.model
        || selectable?.modelId
        || selectable?.id
        || ''
    ).trim();
    const modelId = rawModel && rawModel !== '__current__' ? rawModel : '';
    const provider = String(effective.provider || activeProfile?.provider || aiInstance?.cfg?.provider || selectable?.provider || 'openai');
    const models = Array.isArray(aiInstance?.models) ? aiInstance.models : [];
    const cached = models.find((item) => item && item.id === modelId && (!profileId || item.profileId === profileId))
        || models.find((item) => item && item.id === modelId)
        || selectable
        || null;
    const visual = data?.adviceModelVisual?.(modelId || cached?.displayName || provider || 'AI', provider, cached?.iconKey || cached?.vendor || '')
        || host?.aiModelVisual?.resolve?.({ modelId: modelId || cached?.displayName || provider || 'AI', provider, iconKey: cached?.iconKey || cached?.vendor || '' })
        || { key: 'ai', label: 'AI', mark: 'AI', iconSrcs: ['assets/model-icons/generic.svg'] };
    const fullName = String(cached?.displayName || modelId || '').trim();
    const shortName = fullName
        ? (typeof data?.modelShortName === 'function' ? data.modelShortName(fullName) : (fullName.length > 18 ? `${fullName.slice(0, 16)}…` : fullName))
        : '默认模型';
    const ariaLabel = `切换分析模型：${fullName || '默认模型'}`;
    const isOverride = Boolean(aiInstance?.cfg?.taskRoutes?.[taskId]);
    const srcs = Array.isArray(visual.iconSrcs) ? visual.iconSrcs.filter(Boolean) : [];
    const signature = `${visual.key || 'ai'}|${srcs.join(',')}|${visual.mark || 'AI'}|${shortName}|${isOverride ? '1' : '0'}`;

    modelEntry.className = `v7-coach-model-entry advice-model-${visual.key || 'ai'}${isOverride ? ' is-override' : ''}`;
    const style = data?.adviceModelThemeStyle?.(visual) || '';
    if (style) modelEntry.setAttribute('style', style);
    else modelEntry.removeAttribute('style');
    modelEntry.setAttribute('aria-label', ariaLabel);
    modelEntry.setAttribute('title', ariaLabel);

    if (modelEntry.dataset?.v7ModelSignature === signature) return;
    if (modelEntry.dataset) modelEntry.dataset.v7ModelSignature = signature;

    const markSpan = doc.createElement('span');
    markSpan.className = 'advice-model-mark v7-coach-model-mark';
    if (srcs.length) {
        const img = doc.createElement('img');
        img.className = 'advice-model-icon';
        img.alt = '';
        img.src = srcs[0];
        let fallbackIdx = 1;
        img.addEventListener('error', () => {
            if (fallbackIdx < srcs.length) img.src = srcs[fallbackIdx++];
            else markSpan.textContent = visual.mark || 'AI';
        });
        markSpan.append(img);
    } else {
        markSpan.textContent = visual.mark || 'AI';
    }

    const nameSpan = doc.createElement('span');
    nameSpan.className = 'v7-coach-model-name';
    nameSpan.textContent = shortName;

    const caretSpan = doc.createElement('span');
    caretSpan.className = 'v7-coach-model-caret';
    caretSpan.setAttribute('aria-hidden', 'true');
    caretSpan.textContent = '⌄';

    modelEntry.replaceChildren(markSpan, nameSpan, caretSpan);
}

function syncCoachReasoningChip(reasoningBtn, doc, data, host) {
    if (!reasoningBtn || typeof doc?.createElement !== 'function') return;
    const aiInstance = host?.ai;
    const taskId = data?.advicePickerTaskId?.() || 'advice.chat';
    const route = aiInstance?.getTaskRoute?.(taskId) || {};
    const depth = String(route.reasoningDepth || 'auto');
    const visual = host?.aiTaskSettings?.reasoningMeta?.(depth)
        || { value: depth, label: depth === 'off' ? '直接回答' : '自动', icon: depth === 'off' ? 'block' : 'auto_awesome' };

    reasoningBtn.type = 'button';
    reasoningBtn.className = `advice-reasoning-chip is-${depth} v7-coach-selected-control v7-coach-advanced-reasoning`;
    reasoningBtn.setAttribute('aria-label', `推理强度：${visual.label}`);
    reasoningBtn.setAttribute('title', `推理强度：${visual.label}`);
    reasoningBtn.setAttribute('onclick', 'window.advicePanel?.openAdviceReasoningPicker?.call(data)');

    if (!reasoningBtn.__hasReasoningClick) {
        reasoningBtn.__hasReasoningClick = true;
        reasoningBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const fn = host?.advicePanel?.openAdviceReasoningPicker || data?.openAdviceReasoningPicker;
            if (typeof fn === 'function') {
                fn.call(data || host?.advicePanel);
            }
        });
    }

    let iconSpan = reasoningBtn.querySelector('.material-symbols-rounded');
    if (!iconSpan) {
        iconSpan = doc.createElement('span');
        iconSpan.className = 'material-symbols-rounded';
        reasoningBtn.replaceChildren(iconSpan);
    }
    iconSpan.textContent = visual.icon || 'auto_awesome';
}

function ensureCoachHeader(root, data) {
    if (typeof root.querySelector !== 'function') return;
    const header = root.querySelector('.md-top-app-bar');
    if (!header) return;
    const doc = root.ownerDocument;
    const host = doc?.defaultView || globalThis;
    header.classList.add('v7-coach-header');
    header.querySelector('.app-icon')?.setAttribute('aria-hidden', 'true');
    const title = header.querySelector('.app-title');
    if (title) title.textContent = '康复教练';
    const leading = header.querySelector('.bar-leading');
    let subtitle = header.querySelector('.v7-coach-page-subtitle');
    if (!subtitle && leading) {
        subtitle = doc.createElement('span');
        subtitle.className = 'v7-coach-page-subtitle';
        subtitle.textContent = '基于你的训练、恢复和历史记录给出建议';
        leading.append(subtitle);
    }

    const trailing = header.querySelector('.bar-trailing');
    if (!trailing) return;

    let capsule = trailing.querySelector('.v7-coach-model-capsule');
    if (!capsule) {
        capsule = doc.createElement('div');
        capsule.className = 'v7-coach-model-capsule';
        trailing.prepend(capsule);
    }

    let modelEntry = capsule.querySelector('.v7-coach-model-entry');
    if (!modelEntry) {
        modelEntry = trailing.querySelector(':scope > .v7-coach-model-entry');
        if (!modelEntry) {
            modelEntry = doc.createElement('button');
            modelEntry.type = 'button';
            modelEntry.className = 'v7-coach-model-entry';
            modelEntry.addEventListener('click', () => data?.openAdviceModelPicker?.());
        }
        capsule.append(modelEntry);
    }
    syncCoachModelEntry(modelEntry, doc, data, host);

    let divider = capsule.querySelector('.v7-coach-capsule-divider');
    if (!divider) {
        divider = doc.createElement('span');
        divider.className = 'v7-coach-capsule-divider';
        divider.setAttribute('aria-hidden', 'true');
        capsule.append(divider);
    }

    let reasoningBtn = capsule.querySelector('.advice-reasoning-chip');
    if (!reasoningBtn) {
        const existing = root.querySelector('.advice-reasoning-chip');
        if (existing && existing !== reasoningBtn) {
            reasoningBtn = existing;
        } else {
            reasoningBtn = doc.createElement('button');
            reasoningBtn.type = 'button';
            reasoningBtn.className = 'advice-reasoning-chip is-auto v7-coach-selected-control v7-coach-advanced-reasoning';
        }
        capsule.append(reasoningBtn);
    }
    syncCoachReasoningChip(reasoningBtn, doc, data, host);

    root.querySelectorAll('.advice-composer-stack .advice-reasoning-chip').forEach((el) => {
        if (el !== reasoningBtn) el.remove();
    });

    let actionsGroup = trailing.querySelector('.v7-coach-header-actions');
    if (!actionsGroup) {
        actionsGroup = doc.createElement('div');
        actionsGroup.className = 'v7-coach-header-actions';
        trailing.append(actionsGroup);
    }

    let usageBtn = actionsGroup.querySelector('.v7-coach-usage-btn');
    if (!usageBtn) {
        usageBtn = doc.createElement('button');
        usageBtn.type = 'button';
        usageBtn.className = 'v7-coach-header-btn v7-coach-usage-btn';
        usageBtn.setAttribute('aria-label', 'AI 用量');
        usageBtn.setAttribute('title', 'AI 用量');
        usageBtn.innerHTML = '<span class="material-symbols-rounded">monitoring</span>';
        usageBtn.addEventListener('click', () => data?.showAiUsageDialog?.());
        actionsGroup.append(usageBtn);
    }

    let regenBtn = actionsGroup.querySelector('.v7-coach-regenerate-btn');
    if (!regenBtn) {
        regenBtn = doc.createElement('button');
        regenBtn.type = 'button';
        regenBtn.className = 'v7-coach-header-btn v7-coach-regenerate-btn';
        regenBtn.setAttribute('aria-label', '重新生成建议');
        regenBtn.setAttribute('title', '重新生成建议');
        regenBtn.innerHTML = '<span class="material-symbols-rounded">refresh</span>';
        regenBtn.addEventListener('click', () => data?.regenerateAdvice?.());
        actionsGroup.append(regenBtn);
    }
}

function ensureCoachPlusMenu(root, data) {
    if (typeof root.querySelector !== 'function') return;
    const composer = root.querySelector('.advice-composer-stack');
    const attachBtn = composer?.querySelector('#adviceAttachButton');
    if (!composer || !attachBtn) return;
    const doc = root.ownerDocument;

    let menu = composer.querySelector('.v7-coach-plus-menu');
    if (!menu) {
        menu = doc.createElement('div');
        menu.className = 'v7-coach-plus-menu hidden';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', '输入工具');
        menu.innerHTML = `
            <button type="button" class="v7-coach-menu-item" data-action="image">
                <span class="material-symbols-rounded">photo_camera</span>
                <span>添加图片</span>
            </button>
            <button type="button" class="v7-coach-menu-item" data-action="file">
                <span class="material-symbols-rounded">upload_file</span>
                <span>添加文件</span>
            </button>
            <button type="button" class="v7-coach-menu-item" data-action="context">
                <span class="material-symbols-rounded">tune</span>
                <span>数据维度</span>
                <span class="v7-coach-menu-badge">自动</span>
            </button>
        `;
        composer.prepend(menu);

        menu.addEventListener('click', (e) => {
            const item = e.target?.closest?.('.v7-coach-menu-item');
            if (!item) return;
            const action = item.dataset.action;
            menu.classList.add('hidden');
            attachBtn.classList.remove('is-open');
            if (action === 'image') {
                data?.openAdviceImagePicker?.();
            } else if (action === 'file') {
                data?.openAdviceFilePicker?.();
            } else if (action === 'context') {
                data?.toggleAdviceContextPanel?.();
            }
        });
    }

    const contexts = { diet: true, training: true, weight: true, goal: true, ...(data?.adviceContexts || {}) };
    const contextMode = ['auto', 'light', 'none'].includes(data?.adviceContextMode) ? data.adviceContextMode : 'auto';
    const modeLabel = { auto: '自动', light: '轻量', none: '仅提问' }[contextMode] || '自动';
    const enabledCount = ['diet', 'training', 'weight', 'goal'].filter((k) => contexts[k]).length;
    const badgeEl = menu.querySelector('.v7-coach-menu-badge');
    if (badgeEl) {
        badgeEl.textContent = contextMode !== 'auto' ? modeLabel : (enabledCount < 4 ? `${enabledCount}/4` : '自动');
    }

    if (!attachBtn.__hasV7PlusMenuClick) {
        attachBtn.__hasV7PlusMenuClick = true;
        const toggle = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const isOpen = !menu.classList.contains('hidden');
            menu.classList.toggle('hidden', isOpen);
            attachBtn.classList.toggle('is-open', !isOpen);
        };
        attachBtn.addEventListener('click', toggle, true);
        attachBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);
        attachBtn.addEventListener('pointerup', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);
    }
}

function ensureCoachConversationLayout(root) {
    if (typeof root.querySelector !== 'function') return;
    const page = root.querySelector('.advice-v6-page');
    if (!page) return;

    // Completely remove any legacy v7-coach-advanced-tools
    page.querySelectorAll('.v7-coach-advanced-tools').forEach((el) => {
        const filterBar = el.querySelector('.advice-v6-filter-bar');
        const clearBtn = el.querySelector('.v7-coach-clear-action');
        if (filterBar) {
            const sectHead = page.querySelector('.sect-head');
            if (sectHead) sectHead.before(filterBar);
            else page.prepend(filterBar);
        }
        if (clearBtn) {
            clearBtn.classList.remove('v7-coach-clear-action');
            const sectHead = page.querySelector('.sect-head');
            if (sectHead && !sectHead.querySelector('.a')) sectHead.append(clearBtn);
        }
        el.remove();
    });

    const sectHead = page.querySelector('.sect-head');
    const filterBar = page.querySelector('.advice-v6-filter-bar');
    if (sectHead && filterBar && filterBar.nextElementSibling === sectHead) {
        sectHead.after(filterBar);
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
    ensureCoachPlusMenu(root, data);
    ensureCoachConversationLayout(root);
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
        scope.listen(context.document || root.ownerDocument, 'click', (event) => {
            const menu = root.querySelector('.v7-coach-plus-menu:not(.hidden)');
            if (!menu) return;
            const attachBtn = root.querySelector('#adviceAttachButton');
            if (menu.contains(event.target) || attachBtn?.contains(event.target)) return;
            menu.classList.add('hidden');
            attachBtn?.classList.remove('is-open');
        });
        scope.listen(root, 'click', scheduleEnhance);
        scope.listen(root, 'input', scheduleEnhance);
        scope.listen(host, 'advice:render-state', scheduleEnhance);
        scope.listen(host, 'ai:ready', scheduleEnhance);
        scope.listen(host, 'ai:override-change', scheduleEnhance);
        scope.listen(host, 'ai:task-route-change', scheduleEnhance);
        scope.listen(host, 'ai:task-routes-changed', scheduleEnhance);
        scope.listen(host, 'ai:catalog-changed', scheduleEnhance);
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
            root.querySelector?.('.v7-coach-model-capsule')?.remove();
            root.querySelector?.('.v7-coach-model-entry')?.remove();
            root.querySelector?.('.v7-coach-header-actions')?.remove();
            root.querySelector?.('.v7-coach-plus-menu')?.remove();
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

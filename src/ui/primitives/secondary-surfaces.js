const BLOCKING_SELECTOR = [
    '.md-modal:not(.hidden)',
    '.md-modal-overlay:not(.hidden)',
    '.ai-provider-manager:not(.hidden)',
    '.advice-attachment-preview:not(.hidden)'
].join(',');

const SECONDARY_SELECTOR = [
    '.md-modal',
    '.md-modal-overlay',
    '.ai-provider-manager',
    '.advice-attachment-preview',
    '.app-update-banner',
    '.app-toast',
    '.md-toast',
    '.skeleton',
    '.empty-state',
    '.advice-empty',
    '.advice-error',
    '.ai-offline-note',
    '.summary-ai-loading',
    '.summary-ai-error',
    '[data-v7-secondary-state]'
].join(',');

function isHidden(element, host) {
    if (!element || element.classList?.contains?.('hidden')) return true;
    if (element.getAttribute?.('aria-hidden') === 'true') return true;
    const style = host.getComputedStyle?.(element);
    return style?.display === 'none' || style?.visibility === 'hidden';
}

function secondaryKind(element) {
    const id = String(element?.id || '').toLowerCase();
    const classes = element?.classList;
    if (classes?.contains('app-update-banner')) return 'banner';
    if (classes?.contains('app-toast') || classes?.contains('md-toast')) return 'toast';
    if (classes?.contains('advice-attachment-preview')) return 'preview';
    if (classes?.contains('ai-provider-manager')) return 'manager';
    if (classes?.contains('skeleton') || classes?.contains('summary-ai-loading')) return 'loading';
    if (classes?.contains('empty-state') || classes?.contains('advice-empty')) return 'empty';
    if (classes?.contains('advice-error') || classes?.contains('summary-ai-error')) return 'error';
    if (classes?.contains('ai-offline-note')) return 'offline';
    if (element?.dataset?.v7SecondaryState === 'permission') return 'permission';
    if (/picker/.test(id)) return 'picker';
    if (classes?.contains('md-modal-sheet') || /sheet/.test(id)) return 'sheet';
    return 'modal';
}

function decorate(element) {
    if (!element?.classList) return;
    const kind = secondaryKind(element);
    element.classList.add('v7-secondary-surface', `v7-secondary-${kind}`);
    element.dataset.v7Secondary = kind;
    element.querySelectorAll?.('.md-modal-backdrop, .advice-attachment-preview-backdrop').forEach((backdrop) => {
        backdrop.classList.add('v7-glass-overlay');
    });
    if (['modal', 'sheet', 'picker', 'manager', 'preview'].includes(kind)) {
        element.setAttribute('role', element.getAttribute('role') || 'dialog');
        element.setAttribute('aria-modal', 'true');
    }
}

export function resolveKeyboardInset(innerHeight = 0, viewportHeight = innerHeight) {
    const inset = Math.max(0, Math.round(Number(innerHeight || 0) - Number(viewportHeight || 0)));
    return inset >= 120 ? inset : 0;
}

export function createSecondarySurfaceController({ host = globalThis, documentRef = host.document } = {}) {
    let observer = null;
    let frame = 0;
    let locked = false;
    let previousBodyOverflow = '';
    const requestFrame = host.requestAnimationFrame || ((callback) => host.setTimeout?.(callback, 16));
    const cancelFrame = host.cancelAnimationFrame || host.clearTimeout;

    function updateKeyboardState() {
        const root = documentRef?.documentElement;
        if (!root) return 0;
        const inset = resolveKeyboardInset(host.innerHeight, host.visualViewport?.height ?? host.innerHeight);
        root.style.setProperty('--v7-keyboard-inset', `${inset}px`);
        root.dataset.v7Keyboard = inset ? 'visible' : 'hidden';
        return inset;
    }

    function updateScrollLock() {
        const body = documentRef?.body;
        if (!body) return false;
        const open = [...documentRef.querySelectorAll(BLOCKING_SELECTOR)].some((element) => !isHidden(element, host));
        if (open && !locked) {
            previousBodyOverflow = body.style.overflow || '';
            body.style.overflow = 'hidden';
            body.classList.add('v7-secondary-open');
            locked = true;
        } else if (!open && locked) {
            body.style.overflow = previousBodyOverflow;
            body.classList.remove('v7-secondary-open');
            previousBodyOverflow = '';
            locked = false;
        }
        return open;
    }

    function refresh() {
        frame = 0;
        documentRef?.querySelectorAll?.(SECONDARY_SELECTOR).forEach(decorate);
        updateScrollLock();
        updateKeyboardState();
    }

    function scheduleRefresh() {
        if (frame) return;
        frame = requestFrame.call(host, refresh);
    }

    function start() {
        refresh();
        const Observer = host.MutationObserver;
        if (Observer && documentRef?.documentElement) {
            observer = new Observer(scheduleRefresh);
            observer.observe(documentRef.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'aria-hidden', 'style']
            });
        }
        host.visualViewport?.addEventListener?.('resize', scheduleRefresh);
        host.visualViewport?.addEventListener?.('scroll', scheduleRefresh);
        host.addEventListener?.('resize', scheduleRefresh);
        return controller;
    }

    function dispose() {
        observer?.disconnect?.();
        observer = null;
        if (frame) cancelFrame?.call(host, frame);
        frame = 0;
        host.visualViewport?.removeEventListener?.('resize', scheduleRefresh);
        host.visualViewport?.removeEventListener?.('scroll', scheduleRefresh);
        host.removeEventListener?.('resize', scheduleRefresh);
        if (locked && documentRef?.body) {
            documentRef.body.style.overflow = previousBodyOverflow;
            documentRef.body.classList.remove('v7-secondary-open');
        }
        locked = false;
        previousBodyOverflow = '';
        const root = documentRef?.documentElement;
        root?.style?.removeProperty?.('--v7-keyboard-inset');
        if (root?.dataset) delete root.dataset.v7Keyboard;
    }

    const controller = Object.freeze({
        start,
        refresh,
        dispose,
        snapshot() {
            const surfaces = [...(documentRef?.querySelectorAll?.('[data-v7-secondary]') || [])];
            return Object.freeze({
                total: surfaces.length,
                active: surfaces.filter((element) => !isHidden(element, host)).length,
                keyboardInset: resolveKeyboardInset(host.innerHeight, host.visualViewport?.height ?? host.innerHeight),
                scrollLocked: locked
            });
        }
    });
    return controller;
}

/**
 * Quick Record FAB and Bottom Sheet Controller
 * Manages the floating action button and the quick record action sheet
 * for Today and Records pages.
 * @param {{ host?: any, documentRef?: any, events?: any }} [options]
 */
export function createQuickRecordController(options = {}) {
    const host = options.host || globalThis;
    const documentRef = options.documentRef || host.document;
    const events = options.events || null;
    let sheetEl = null;
    let fabEl = null;
    let isOpen = false;
    let isBusy = false;
    let lastActiveElement = null;

    function ensureElements() {
        if (!sheetEl) sheetEl = documentRef.getElementById('quickRecordSheet');
        if (!fabEl) fabEl = documentRef.getElementById('quickRecordFab');
        return Boolean(sheetEl && fabEl);
    }

    function updateFabVisibility(activePage) {
        if (!ensureElements()) return;
        const page = activePage || documentRef.documentElement.dataset.v7ActivePage || documentRef.documentElement.dataset.activePage || 'today';
        const shouldShow = page === 'today' || page === 'records';
        fabEl.classList.toggle('is-visible', shouldShow);
        fabEl.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        if (!shouldShow && isOpen) {
            closeInternal({ restoreFocus: false, popNav: true });
        }
    }

    function open() {
        if (isBusy || isOpen) return;
        if (!ensureElements()) return;
        isBusy = true;
        isOpen = true;
        lastActiveElement = documentRef.activeElement;

        fabEl.setAttribute('aria-expanded', 'true');
        sheetEl.classList.remove('hidden');
        sheetEl.setAttribute('aria-hidden', 'false');

        if (host.navStack?.open) {
            host.navStack.open('sheet', 'quick-record', () => {
                closeInternal({ restoreFocus: true, popNav: false });
                return true;
            });
        }

        const firstAction = sheetEl.querySelector('.quick-record-row, [data-q]');
        if (firstAction && typeof firstAction.focus === 'function') {
            try { firstAction.focus(); } catch {}
        }

        setTimeout(() => { isBusy = false; }, 160);
    }

    function closeInternal({ restoreFocus = true, popNav = true } = {}) {
        if (!isOpen && (!sheetEl || sheetEl.classList.contains('hidden'))) return;
        isOpen = false;
        if (sheetEl) {
            sheetEl.classList.add('hidden');
            sheetEl.setAttribute('aria-hidden', 'true');
        }
        if (fabEl) {
            fabEl.setAttribute('aria-expanded', 'false');
        }
        if (popNav && host.navStack?.popType) {
            try { host.navStack.popType('sheet', 'quick-record'); } catch {}
        }
        if (restoreFocus && lastActiveElement && typeof lastActiveElement.focus === 'function') {
            try { lastActiveElement.focus(); } catch {}
        }
        lastActiveElement = null;
    }

    function close(options = {}) {
        closeInternal({ restoreFocus: true, popNav: true, ...options });
    }

    async function choose(actionType) {
        if (isBusy) return;
        isBusy = true;

        closeInternal({ restoreFocus: false, popNav: true });

        const data = host.data;
        try {
            if (actionType === 'diet') {
                if (typeof data?.openDietModal === 'function') {
                    await data.openDietModal();
                }
            } else if (actionType === 'exercise') {
                if (typeof data?.openExerciseModal === 'function') {
                    await data.openExerciseModal();
                }
            } else if (actionType === 'weight') {
                if (typeof data?.openWeightModal === 'function') {
                    await data.openWeightModal();
                }
            }
        } catch (e) {
            console.error('[quickRecord.choose] Failed to open modal:', actionType, e);
            if (host.ui?.showToast) {
                host.ui.showToast('无法打开记录表单，请稍后重试');
            }
        } finally {
            setTimeout(() => { isBusy = false; }, 200);
        }
    }

    function onKeyDown(event) {
        if (!isOpen) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    }

    documentRef.addEventListener('keydown', onKeyDown);

    const offMount = events?.on?.('feature:mounted', ({ id }) => {
        updateFabVisibility(id);
    });

    let observer = null;
    if (host.MutationObserver) {
        observer = new host.MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'data-v7-active-page' || mutation.attributeName === 'data-active-page') {
                    updateFabVisibility();
                    break;
                }
            }
        });
        observer.observe(documentRef.documentElement, { attributes: true });
    }

    updateFabVisibility();

    const controller = Object.freeze({
        open,
        close,
        choose,
        updateVisibility: updateFabVisibility,
        isOpen: () => isOpen,
        dispose() {
            documentRef.removeEventListener('keydown', onKeyDown);
            if (offMount) offMount();
            if (observer) observer.disconnect();
            if (host.quickRecord === controller) {
                delete host.quickRecord;
            }
        }
    });

    host.quickRecord = controller;

    return controller;
}

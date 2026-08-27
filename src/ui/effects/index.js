const STORAGE_KEY = 'rehab.v7.effects.v1';
const MODES = new Set(['balanced', 'economy']);

export function resolveEffectsMode({ storedMode = '', reducedMotion = false, saveData = false } = {}) {
    if (storedMode === 'economy') return 'economy';
    if (storedMode === 'balanced') return reducedMotion || saveData ? 'economy' : 'balanced';
    return reducedMotion || saveData ? 'economy' : 'balanced';
}

function isVisible(element) {
    if (!element?.isConnected) return false;
    const rect = element.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
}

export function auditEffectBudget(documentRef = document) {
    const backdropNodes = [...documentRef.querySelectorAll('.v7-soft-glass, .v7-glass-overlay')].filter(isVisible);
    const nested = [...documentRef.querySelectorAll('.v7-soft-glass .v7-soft-glass, .v7-glass-overlay .v7-soft-glass, .v7-soft-glass .v7-glass-overlay')].filter(isVisible);
    return Object.freeze({
        visibleBackdropCandidates: backdropNodes.length,
        nestedBackdropCandidates: nested.length,
        withinBudget: backdropNodes.length <= 2 && nested.length === 0
    });
}

/** @param {any} [options] */
export function createEffectsController(options = {}) {
    const host = options.host || globalThis;
    const documentRef = options.documentRef || host.document;
    const root = documentRef?.documentElement;
    const media = host.matchMedia?.('(prefers-reduced-motion: reduce)');
    const saveData = !!host.navigator?.connection?.saveData;
    let storedMode = '';
    try { storedMode = host.localStorage?.getItem(STORAGE_KEY) || ''; } catch {}
    let mode = resolveEffectsMode({ storedMode, reducedMotion: !!media?.matches, saveData });
    let active = null;

    function applyMode(nextMode, persist = true) {
        mode = MODES.has(nextMode) ? nextMode : resolveEffectsMode({ reducedMotion: !!media?.matches, saveData });
        if (root && root.dataset.v7Effects !== mode) root.dataset.v7Effects = mode;
        if (persist) {
            try { host.localStorage?.setItem(STORAGE_KEY, mode); } catch {}
        }
        return mode;
    }

    function updatePointer(target, event) {
        const rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        target.style.setProperty('--v7-liquid-x', `${x.toFixed(1)}%`);
        target.style.setProperty('--v7-liquid-y', `${y.toFixed(1)}%`);
    }

    function onPointerDown(event) {
        const target = event.target?.closest?.('[data-v7-liquid], .v7-liquid-control, .v7-liquid-indicator');
        if (!target) return;
        active = target;
        target.dataset.v7Interacting = 'true';
        updatePointer(target, event);
    }

    function onPointerMove(event) {
        if (!active) return;
        updatePointer(active, event);
    }

    function endInteraction() {
        if (!active) return;
        active.dataset.v7Interacting = 'false';
        active = null;
    }

    documentRef?.addEventListener?.('pointerdown', onPointerDown, { passive: true });
    documentRef?.addEventListener?.('pointermove', onPointerMove, { passive: true });
    documentRef?.addEventListener?.('pointerup', endInteraction, { passive: true });
    documentRef?.addEventListener?.('pointercancel', endInteraction, { passive: true });
    applyMode(mode, false);

    return Object.freeze({
        get mode() { return mode; },
        setMode: applyMode,
        audit: () => auditEffectBudget(documentRef),
        dispose() {
            endInteraction();
            documentRef?.removeEventListener?.('pointerdown', onPointerDown);
            documentRef?.removeEventListener?.('pointermove', onPointerMove);
            documentRef?.removeEventListener?.('pointerup', endInteraction);
            documentRef?.removeEventListener?.('pointercancel', endInteraction);
        }
    });
}


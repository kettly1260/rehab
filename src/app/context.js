/** @param {any} [options] */
export function createAppContext(options = {}) {
    const { legacy, events, lifecycle, documentRef = document } = options;
    if (!legacy) throw new Error('V7 legacy bridge is required during migration');

    return Object.freeze({
        legacy,
        events,
        lifecycle,
        document: documentRef,
        get data() { return legacy.getData?.() || null; },
        get activePage() {
            return documentRef?.querySelector?.('.page.active')?.id
                || legacy.getData?.()?._activePageId
                || 'today';
        }
    });
}


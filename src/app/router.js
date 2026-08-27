export const V7_PAGES = Object.freeze(['today', 'workout', 'records', 'ai-coach', 'profile']);

const PAGE_ALIASES = Object.freeze({
    ai: 'ai-coach',
    advice: 'ai-coach',
    me: 'profile',
    training: 'workout'
});

export function normalizePage(value) {
    const raw = String(value || '').trim();
    const page = PAGE_ALIASES[raw] || raw;
    return V7_PAGES.includes(page) ? page : 'today';
}

export function parseV7Hash(hash = '') {
    const raw = String(hash || '')
        .replace(/^#/, '')
        .replace(/^!/, '')
        .replace(/^\/?/, '');
    const [pathPart, queryPart = ''] = raw.split('?');
    const parts = pathPart.split('/').map((part) => {
        try { return decodeURIComponent(part); } catch { return part; }
    }).filter(Boolean);
    const first = parts[0] || 'today';
    const page = normalizePage(first);
    const query = new URLSearchParams(queryPart);
    const route = { page };

    if (page === 'records') route.healthView = parts[1] || query.get('view') || 'diet';
    if (page === 'profile') route.routineView = parts[1] || query.get('view') || 'home';
    if (page === 'ai-coach') route.adviceRange = query.get('range') || parts[2] || 'today';
    return route;
}

/** @param {any} [options] */
export function createRouter(options = {}) {
    const { legacy, events } = options;
    if (!legacy) throw new Error('V7 router requires a legacy bridge');
    let started = false;
    let legacyTab = null;
    let patchedUi = null;

    async function navigate(page, options = {}) {
        const next = normalizePage(page);
        events?.emit?.('route:intent', { page: next, source: options.source || 'v7' });
        const result = await legacyTab?.(next, options.element || null);
        events?.emit?.('route:committed', { page: next, source: options.source || 'v7' });
        return result;
    }

    function start() {
        if (started) return;
        started = true;
        const ui = legacy.getUi?.();
        if (!ui || typeof ui.tab !== 'function') return;
        patchedUi = ui;
        legacyTab = ui.tab.bind(ui);
        ui.tab = function v7Tab(page, element) {
            return navigate(page, { element, source: 'bottom-nav' });
        };
    }

    function stop() {
        if (!started) return;
        started = false;
        if (patchedUi && legacyTab) patchedUi.tab = legacyTab;
        patchedUi = null;
        legacyTab = null;
    }

    return Object.freeze({
        start,
        stop,
        navigate,
        parseHash: parseV7Hash,
        back() { legacy.historyBack?.(); },
        forward() { legacy.historyForward?.(); }
    });
}


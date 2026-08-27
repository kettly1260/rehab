const PAGE_ORDER = Object.freeze(['today', 'workout', 'records', 'ai-coach', 'profile']);

function pageForItem(item) {
    return item?.dataset?.v7Page || item?.getAttribute?.('onclick')?.match(/ui\.tab\(['"]([^'"]+)/)?.[1] || '';
}

/** @param {any} [options] */
export function createBottomNavigation(options = {}) {
    const documentRef = options.documentRef || document;
    const events = options.events;
    const nav = documentRef.querySelector('.md-nav-rail');
    if (!nav) return Object.freeze({ update() {}, dispose() {} });

    nav.classList.add('v7-bottom-nav');
    nav.setAttribute('aria-label', nav.getAttribute('aria-label') || '主导航');
    const items = [...nav.querySelectorAll('.nav-item')];
    items.forEach((item) => {
        const page = pageForItem(item);
        if (page) item.dataset.v7Page = page;
        item.setAttribute('aria-current', item.classList.contains('active') ? 'page' : 'false');
    });

    let indicator = nav.querySelector('.v7-bottom-nav__indicator');
    if (!indicator) {
        indicator = documentRef.createElement('span');
        indicator.className = 'v7-liquid-indicator v7-bottom-nav__indicator';
        indicator.setAttribute('aria-hidden', 'true');
        nav.prepend(indicator);
    }

    /** @type {ReturnType<typeof setTimeout> | null} */
    let movementTimer = null;
    const update = (page) => {
        const activePage = PAGE_ORDER.includes(page) ? page : (items.find((item) => item.classList.contains('active'))?.dataset.v7Page || 'today');
        const index = Math.max(0, PAGE_ORDER.indexOf(activePage));
        nav.style.setProperty('--v7-nav-index', String(index));
        items.forEach((item) => item.setAttribute('aria-current', item.dataset.v7Page === activePage ? 'page' : 'false'));
        nav.dataset.v7NavMoving = 'true';
        if (movementTimer) clearTimeout(movementTimer);
        movementTimer = setTimeout(() => { nav.dataset.v7NavMoving = 'false'; }, 220);
    };

    const onKeyDown = (event) => {
        const current = documentRef.activeElement;
        const currentIndex = items.indexOf(current);
        if (currentIndex < 0) return;
        let nextIndex = -1;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % items.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + items.length) % items.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = items.length - 1;
        if (nextIndex < 0) return;
        event.preventDefault();
        items[nextIndex]?.focus?.();
    };

    nav.addEventListener('keydown', onKeyDown);
    const offMount = events?.on?.('feature:mounted', ({ id }) => update(id)) || (() => {});
    update(documentRef.documentElement.dataset.v7ActivePage || 'today');

    return Object.freeze({
        update,
        dispose() {
            if (movementTimer) clearTimeout(movementTimer);
            offMount();
            nav.removeEventListener('keydown', onKeyDown);
            indicator?.remove?.();
            nav.classList.remove('v7-bottom-nav');
            nav.removeAttribute('data-v7-nav-moving');
            nav.style.removeProperty('--v7-nav-index');
        }
    });
}


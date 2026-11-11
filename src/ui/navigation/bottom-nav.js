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
    let activePointerId = null;

    const updateIndicatorPointer = (event) => {
        if (!indicator) return;
        const rect = indicator.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        indicator.style.setProperty('--v7-liquid-x', `${x.toFixed(1)}%`);
        indicator.style.setProperty('--v7-liquid-y', `${y.toFixed(1)}%`);
    };

    const endPointerInteraction = () => {
        activePointerId = null;
        if (indicator) indicator.dataset.v7Interacting = 'false';
    };

    const onPointerDown = (event) => {
        const item = event.target?.closest?.('.nav-item');
        if (!item || !nav.contains(item) || !indicator) return;
        activePointerId = event.pointerId;
        indicator.dataset.v7Interacting = 'true';
        updateIndicatorPointer(event);
    };

    const onPointerMove = (event) => {
        if (activePointerId !== event.pointerId) return;
        updateIndicatorPointer(event);
    };

    const onPointerEnd = (event) => {
        if (activePointerId !== null && event.pointerId !== activePointerId) return;
        endPointerInteraction();
    };

    const update = (page) => {
        const activePage = PAGE_ORDER.includes(page) ? page : (items.find((item) => item.classList.contains('active'))?.dataset.v7Page || 'today');
        const index = Math.max(0, PAGE_ORDER.indexOf(activePage));
        nav.style.setProperty('--v7-nav-index', String(index));
        nav.style.setProperty('--v7-nav-offset', `calc(${index * 100}% + ${index * 0.375}rem)`);
        items.forEach((item) => {
            const active = item.dataset.v7Page === activePage;
            item.classList.toggle('active', active);
            item.setAttribute('aria-current', active ? 'page' : 'false');
        });
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
    nav.addEventListener('pointerdown', onPointerDown, { passive: true });
    nav.addEventListener('pointermove', onPointerMove, { passive: true });
    nav.addEventListener('pointerup', onPointerEnd, { passive: true });
    nav.addEventListener('pointercancel', onPointerEnd, { passive: true });
    const offMount = events?.on?.('feature:mounted', ({ id }) => update(id)) || (() => {});
    update(documentRef.documentElement.dataset.v7ActivePage || 'today');

    return Object.freeze({
        update,
        dispose() {
            if (movementTimer) clearTimeout(movementTimer);
            endPointerInteraction();
            offMount();
            nav.removeEventListener('keydown', onKeyDown);
            nav.removeEventListener('pointerdown', onPointerDown);
            nav.removeEventListener('pointermove', onPointerMove);
            nav.removeEventListener('pointerup', onPointerEnd);
            nav.removeEventListener('pointercancel', onPointerEnd);
            indicator?.remove?.();
            nav.classList.remove('v7-bottom-nav');
            nav.removeAttribute('data-v7-nav-moving');
            nav.style.removeProperty('--v7-nav-index');
            nav.style.removeProperty('--v7-nav-offset');
        }
    });
}


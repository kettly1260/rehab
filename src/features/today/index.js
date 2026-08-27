function enhanceToday(root) {
    root.classList.add('v7-feature-today');
    root.querySelectorAll('.hero, .glass-card').forEach((element) => element.classList.add('today-v7-surface'));
    root.querySelectorAll('.hero-motion-aura, .ring-motion-aura').forEach((element) => element.setAttribute('aria-hidden', 'true'));
    const primary = root.querySelector('.plan-actions .md-btn-filled');
    root.querySelectorAll('.v7-today-primary-cta').forEach((element) => {
        if (element !== primary) {
            element.classList.remove('v7-today-primary-cta', 'v7-liquid-control');
            element.removeAttribute('data-v7-liquid');
        }
    });
    if (primary) {
        primary.classList.add('v7-today-primary-cta', 'v7-liquid-control');
        primary.setAttribute('data-v7-liquid', 'primary');
    }
}

export const todayFeature = Object.freeze({
    id: 'today',
    mount({ context, scope }) {
        const root = context.document?.getElementById?.('today');
        if (!root) throw new Error('V7 Today root missing');
        root.classList.add('v7-page-shell', 'v7-page-mounted');
        root.dataset.v7Feature = 'today';
        enhanceToday(root);
        const Observer = context.document?.defaultView?.MutationObserver;
        if (Observer) {
            const observer = new Observer(() => enhanceToday(root));
            scope.observe(observer, root, { childList: true, subtree: true });
        }
        return () => {
            root.classList.remove('v7-page-mounted', 'v7-feature-today');
            root.querySelectorAll('.v7-today-primary-cta').forEach((element) => {
                element.classList.remove('v7-today-primary-cta', 'v7-liquid-control');
                element.removeAttribute('data-v7-liquid');
            });
        };
    },
    update({ context }) {
        const root = context.document?.getElementById?.('today');
        if (root) enhanceToday(root);
    }
});


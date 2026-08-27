export function createLegacyShellFeature(id, label) {
    return Object.freeze({
        id,
        async mount({ context }) {
            const root = context.document?.getElementById?.(id);
            if (!root) throw new Error(`V7 shell root missing: ${id}`);
            root.classList.add('v7-page-shell', 'v7-page-mounted');
            root.dataset.v7Feature = id;
            root.setAttribute('aria-label', root.getAttribute('aria-label') || label);
            return () => {
                root.classList.remove('v7-page-mounted');
                root.dataset.v7Mounted = 'false';
            };
        },
        update({ context }) {
            const root = context.document?.getElementById?.(id);
            if (root) root.dataset.v7Mounted = 'true';
        }
    });
}


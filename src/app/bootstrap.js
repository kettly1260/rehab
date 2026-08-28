import { createEventBus } from './events.js';
import { createLifecycle } from './lifecycle.js';
import { createAppContext } from './context.js';
import { createRouter } from './router.js';
import { getFeature } from './feature-registry.js';
import { createLegacyAdapters } from '../legacy/adapters/index.js';
import { createEffectsController } from '../ui/effects/index.js';
import { createBottomNavigation } from '../ui/navigation/bottom-nav.js';
import { createSecondarySurfaceController } from '../ui/primitives/secondary-surfaces.js';

const RUNTIME_KEY = Symbol.for('rehab.v7.runtime');

function markBottomNav(documentRef) {
    const nav = documentRef?.querySelector?.('.md-nav-rail');
    if (!nav) return;
    nav.classList.add('v7-bottom-nav-shell');
    nav.dataset.v7Navigation = 'true';
    nav.querySelectorAll('.nav-item').forEach((item) => {
        const page = item.getAttribute('onclick')?.match(/ui\.tab\(['"]([^'"]+)/)?.[1]
            || item.dataset.page
            || '';
        if (page) item.dataset.v7Page = page;
    });
}

export async function bootstrapV7({ host = globalThis, documentRef = host.document } = {}) {
    if (!host || !documentRef) return null;
    if (host[RUNTIME_KEY]) return host[RUNTIME_KEY];

    const events = createEventBus();
    const legacy = createLegacyAdapters(host);
    const lifecycle = createLifecycle({ events, host });
    const context = createAppContext({ legacy, events, lifecycle, documentRef });
    const router = createRouter({ legacy, events });
    const effects = createEffectsController({ host, documentRef });
    const secondarySurfaces = createSecondarySurfaceController({ host, documentRef });
    const ui = legacy.getUi();
    const originalActivate = typeof ui?._activateTab === 'function' ? ui._activateTab.bind(ui) : null;

    if (!originalActivate) throw new Error('V7 App Shell requires legacy ui._activateTab during bridge phase');

    ui._activateTab = async function v7ActivateTab(page, element, options) {
        const result = await originalActivate(page, element, options);
        if (result !== false) await lifecycle.transition(getFeature(page), context, { source: 'legacy-activate' });
        return result;
    };

    router.start();
    markBottomNav(documentRef);
    const bottomNavigation = createBottomNavigation({ documentRef, events });
    secondarySurfaces.start();
    const activePage = context.activePage;
    await lifecycle.transition(getFeature(activePage), context, { source: 'bootstrap' });
    documentRef.documentElement?.classList?.add('rehab-v7-shell');
    documentRef.documentElement.dataset.v7ActivePage = activePage;

    const offMount = events.on('feature:mounted', ({ id }) => {
        documentRef.documentElement.dataset.v7ActivePage = id;
    });

    const runtime = Object.freeze({
        version: 7,
        router,
        lifecycle,
        events,
        effects,
        bottomNavigation,
        secondarySurfaces,
        diagnostics: Object.freeze({
            snapshot: () => ({
                ...lifecycle.snapshot(),
                secondarySurfaces: secondarySurfaces.snapshot()
            })
        }),
        compatibility: Object.freeze({
            dataSummary: () => legacy.data.summary(),
            storageSummary: () => legacy.storage.describe()
        }),
        dispose() {
            offMount();
            bottomNavigation.dispose();
            secondarySurfaces.dispose();
            effects.dispose();
            router.stop();
            lifecycle.dispose();
            ui._activateTab = originalActivate;
            documentRef.documentElement?.classList?.remove('rehab-v7-shell');
        }
    });

    Object.defineProperty(host, RUNTIME_KEY, { value: runtime, configurable: true });
    // One explicit migration/debug facade; feature-to-feature communication does not use globals.
    host.rehabV7 = runtime;
    return runtime;
}

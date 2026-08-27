import { createLegacyDataAdapter } from './data.js';
import { createLegacyStorageAdapter } from './storage.js';
import { createLegacyServiceAdapter } from './services.js';

/** @param {any} [host] */
export function createLegacyAdapters(host = globalThis) {
    const data = createLegacyDataAdapter(host);
    const storage = createLegacyStorageAdapter(host);
    const services = createLegacyServiceAdapter(host);

    return Object.freeze({
        data,
        storage,
        services,
        getUi: () => host.ui,
        getData: () => data.raw,
        getAppRoute: () => host.appRoute,
        getNavStack: () => host.navStack,
        historyBack: () => host.history?.back?.(),
        historyForward: () => host.history?.forward?.()
    });
}


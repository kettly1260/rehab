/** @param {any} [host] */
export function createLegacyStorageAdapter(host = globalThis) {
    return Object.freeze({
        get idb() { return host.storageIdb || null; },
        get migrate() { return host.storageMigrate || null; },
        get collections() { return host.storageCollections || null; },
        get adviceCollections() { return host.adviceCollections || null; },
        describe() {
            const idb = host.storageIdb;
            const data = host.data;
            return Object.freeze({
                databaseName: idb?.DB_NAME || 'rehab_pro_storage',
                indexedDbVersion: Number(idb?.DB_VERSION || 4),
                kvStore: idb?.STORE_NAME || 'kv',
                historyStore: idb?.HISTORY_STORE_NAME || 'history',
                aiMessagesStore: idb?.AI_MESSAGES_STORE_NAME || 'ai_messages',
                appDatabaseKey: data?.DB_KEY || 'rehab_pro_universal_db',
                storageMode: host.dataStore?._storageMode || data?._storageMode || 'localStorage'
            });
        }
    });
}


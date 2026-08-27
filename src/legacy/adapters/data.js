function liveArray(value) {
    return Array.isArray(value) ? value : [];
}

function activeRecords(data, value) {
    const records = liveArray(value);
    return typeof data?.activeRecords === 'function'
        ? data.activeRecords(records)
        : records.filter((item) => !item?.deletedAt);
}

/** @param {any} [host] */
export function createLegacyDataAdapter(host = globalThis) {
    const current = () => host.data || null;
    const database = () => current()?.db || null;

    return Object.freeze({
        get raw() { return current(); },
        get db() { return database(); },
        get config() { return current()?.cfg || null; },
        get schemaVersion() { return Number(database()?.schemaVersion || current()?.SCHEMA_VERSION || 0); },
        get actions() { return activeRecords(current(), database()?.actions); },
        get routines() { return activeRecords(current(), database()?.routines); },
        get history() { return activeRecords(current(), database()?.history); },
        get health() { return database()?.health || null; },
        get plans() {
            const db = database();
            if (!db) return null;
            return Object.freeze({
                dailyPlans: liveArray(db.dailyPlans),
                planDraft: db.planDraft || null,
                bodyPlan: db.health?.bodyPlan || null,
                weightPlan: db.health?.weightPlan || null,
                dietGoal: db.health?.dietGoal || null
            });
        },
        get workoutHistory() { return activeRecords(current(), database()?.history); },
        get aiConfig() {
            if (host.ai?.cfg) return host.ai.cfg;
            const db = database();
            if (!db) return null;
            return Object.freeze({
                profiles: liveArray(db.aiProfiles),
                activeProfileId: db.aiActiveId || '',
                taskRoutes: db.aiTaskRoutes || {},
                search: db.aiSearchConfig || null,
                requestTimeoutMs: Number(db.aiRequestTimeoutMs || 0)
            });
        },
        get readyState() { return host.dataStore?._readyState || current()?._readyState || 'ready'; },
        async whenReady() {
            const data = current();
            if (typeof data?.ensureDataReady === 'function') return data.ensureDataReady();
            if (host.dataStore?._readyPromise) return host.dataStore._readyPromise;
            return !!data;
        },
        save(options = {}) {
            const data = current();
            if (typeof data?.save !== 'function') return false;
            return data.save(options);
        },
        summary() {
            const db = database();
            const health = db?.health || {};
            return Object.freeze({
                schemaVersion: Number(db?.schemaVersion || current()?.SCHEMA_VERSION || 0),
                readyState: host.dataStore?._readyState || current()?._readyState || 'ready',
                actions: activeRecords(current(), db?.actions).length,
                routines: activeRecords(current(), db?.routines).length,
                history: activeRecords(current(), db?.history).length,
                dailyPlans: liveArray(db?.dailyPlans).length,
                weights: activeRecords(current(), health.weights).length,
                foodLogs: activeRecords(current(), health.foodLogs).length,
                exerciseLogs: activeRecords(current(), health.exerciseLogs).length,
                rehabWeekly: activeRecords(current(), health.rehabWeekly).length,
                reports: activeRecords(current(), health.reports).length,
                hasSyncConfig: !!current()?.cfg,
                hasAiConfig: !!(host.ai?.cfg || db?.aiProfiles || db?.aiTaskRoutes || db?.aiSearchConfig)
            });
        }
    });
}


/** @param {any} [host] */
export function createLegacyServiceAdapter(host = globalThis) {
    return Object.freeze({
        get ai() { return host.ai || null; },
        get sync() { return host.sync || null; },
        get voice() { return host.workoutVoice || host.voiceEngine || null; },
        get workout() { return host.workoutSystem || host.workout || null; },
        get workoutState() { return host.workoutState || null; },
        get cardio() { return host.cardio || null; },
        get appUpdate() { return host.appUpdate || null; },
        get theme() { return host.theme || null; },
        get i18n() { return host.i18n || null; }
    });
}


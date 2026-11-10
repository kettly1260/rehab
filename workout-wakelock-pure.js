/**
 * @typedef {{ report?: (scope: string, err: unknown, meta?: any) => any }} ErrorBus
 * @typedef {{ info?: (msg: string, ...args: any[]) => void }} Logger
 * @typedef {{ request: (type: 'screen') => Promise<{ release: () => Promise<void> } & { onrelease?: any, addEventListener?: any }> }} WakeLockApi
 * @typedef {{ wakeLock?: WakeLockApi }} NavigatorLike
 * @typedef {{ hidden: boolean, addEventListener: (type: string, cb: any) => void }} DocumentLike
 * @typedef {{ addEventListener: (type: string, cb: any) => void }} WindowLike
 * @typedef {{ navigator: NavigatorLike, document: DocumentLike, window: WindowLike, errorBus?: ErrorBus, console?: Logger }} Env
 */

// @ts-nocheck
export function createWorkoutWakeLock(env) {
    const state = {
        sentinel: null,
        sentinelToken: null,
        runToken: null,
        warned: false,
        training: false
    };

    function logOnce(msg) {
        if (state.warned) return;
        state.warned = true;
        try { env.console?.info?.(msg); } catch {}
    }

    async function request(runToken = null) {
        state.training = true;
        const currentToken = runToken != null ? runToken : (env.window?.workout?._runToken ?? null);
        state.runToken = currentToken;
        try {
            if (!env.navigator?.wakeLock?.request) {
                logOnce('[wakelock] Wake Lock API unavailable');
                return false;
            }
            if (state.sentinel) {
                if (currentToken == null || state.sentinelToken === currentToken) {
                    return true;
                }
                const old = state.sentinel;
                state.sentinel = null;
                state.sentinelToken = null;
                try { await old?.release?.(); } catch {}
            }
            const sentinel = await env.navigator.wakeLock.request('screen');
            const isStale = !state.training || (currentToken != null && (state.runToken !== currentToken || (env.window?.workout?._runToken != null && env.window.workout._runToken !== currentToken)));
            if (isStale) {
                try { await sentinel?.release?.(); } catch {}
                return false;
            }
            state.sentinel = sentinel;
            state.sentinelToken = currentToken;
            const onRelease = () => {
                if (state.sentinel === sentinel) {
                    state.sentinel = null;
                    state.sentinelToken = null;
                }
            };
            if (sentinel?.addEventListener) {
                sentinel.addEventListener('release', onRelease);
            } else if ('onrelease' in (sentinel || {})) {
                sentinel.onrelease = onRelease;
            }
            return true;
        } catch (e) {
            if (currentToken == null || state.runToken === currentToken) {
                state.sentinel = null;
                state.sentinelToken = null;
            }
            try { env.errorBus?.report?.('wakelock', e); } catch {}
            return false;
        }
    }

    async function release(runToken = null) {
        const token = runToken != null ? runToken : (env.window?.workout?._runToken ?? null);
        if (typeof token === 'number' && typeof state.sentinelToken === 'number' && token < state.sentinelToken) {
            return;
        }
        state.training = false;
        state.runToken = null;
        const s = state.sentinel;
        state.sentinel = null;
        state.sentinelToken = null;
        if (!s?.release) return;
        try { await s.release(); } catch (e) {
            try { env.errorBus?.report?.('wakelock', e); } catch {}
        }
    }

    function isActive() {
        return !!state.sentinel;
    }

    function bindVisibility() {
        env.document?.addEventListener?.('visibilitychange', () => {
            if (!state.training) return;
            if (!env.document.hidden) request(env.window?.workout?._runToken ?? null);
        });
    }

    function bindWorkoutEvents() {
        env.window?.addEventListener?.('workout:state', (e) => {
            const d = e?.detail || {};
            const token = d.runToken ?? (env.window?.workout?._runToken ?? null);
            if (d.status === 'playing') request(token);
            if (d.status === 'paused' || d.status === 'stopped' || d.status === 'idle') release(token);
        });
    }

    bindVisibility();
    bindWorkoutEvents();

    return { request, release, isActive, _state: state };
}

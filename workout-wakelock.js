// @ts-nocheck
(function () {
    const errorBus = window.errorBus;
    const state = {
        sentinel: /** @type {any} */ (null),
        sentinelToken: null,
        runToken: null,
        warned: false,
        training: false
    };

    function logOnce(msg) {
        if (state.warned) return;
        state.warned = true;
        try { console.info(msg); } catch {}
    }

    function renderStatus() {
        const btn = document.getElementById('wakeLockStatusButton');
        if (!btn) return;
        const active = isActive();
        btn.classList.toggle('hidden', !state.training && !active);
        btn.classList.toggle('is-active', active);
        const icon = btn.querySelector('.material-symbols-rounded');
        if (icon) icon.textContent = active ? 'lock' : 'lock_open';
        btn.title = active ? '屏幕常亮中' : '屏幕常亮已释放，点击重新申请';
    }

    async function request(runToken = null) {
        state.training = true;
        const currentToken = runToken != null ? runToken : (window.workout?._runToken ?? null);
        state.runToken = currentToken;
        try {
            if (!navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') {
                logOnce('[wakelock] Wake Lock API unavailable');
                renderStatus();
                return false;
            }
            if (state.sentinel) {
                if (currentToken == null || state.sentinelToken === currentToken) {
                    renderStatus();
                    return true;
                }
                const old = state.sentinel;
                state.sentinel = null;
                state.sentinelToken = null;
                try { await old?.release?.(); } catch {}
            }
            const sentinel = await navigator.wakeLock.request('screen');
            const isStale = !state.training || (currentToken != null && (state.runToken !== currentToken || (window.workout?._runToken != null && window.workout._runToken !== currentToken)));
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
                    renderStatus();
                }
            };
            if (sentinel?.addEventListener) {
                sentinel.addEventListener('release', onRelease);
            } else if ('onrelease' in sentinel) {
                sentinel.onrelease = onRelease;
            }
            renderStatus();
            return true;
        } catch (e) {
            if (currentToken == null || state.runToken === currentToken) {
                state.sentinel = null;
                state.sentinelToken = null;
                renderStatus();
            }
            try { errorBus?.report?.('wakelock', e); } catch {}
            return false;
        }
    }

    async function release(runToken = null) {
        const token = runToken != null ? runToken : (window.workout?._runToken ?? null);
        if (typeof token === 'number' && typeof state.sentinelToken === 'number' && token < state.sentinelToken) {
            return;
        }
        state.training = false;
        state.runToken = null;
        const s = state.sentinel;
        state.sentinel = null;
        state.sentinelToken = null;
        renderStatus();
        if (!s?.release) return;
        try { await s.release(); } catch (e) {
            try { errorBus?.report?.('wakelock', e); } catch {}
        }
    }

    function isActive() {
        return !!state.sentinel;
    }

    document.addEventListener('visibilitychange', () => {
        if (!state.training) return;
        if (!document.hidden) request(window.workout?._runToken ?? null);
    });

    window.addEventListener('workout:state', (e) => {
        const d = e?.detail || {};
        const token = d.runToken ?? (window.workout?._runToken ?? null);
        if (d.status === 'playing') request(token);
        if (d.status === 'paused') release(token);
        if (d.status === 'stopped' || d.status === 'idle') release(token);
        renderStatus();
    });

    window.workoutWakeLock = { request, release, isActive, renderStatus };
})();

function noop() {}

function safeDispose(disposer) {
    try { disposer?.(); } catch {}
}

export function createScope(ownerId, host = globalThis) {
    const disposers = [];
    let disposed = false;

    const add = (disposer) => {
        if (typeof disposer !== 'function') return noop;
        if (disposed) {
            safeDispose(disposer);
            return noop;
        }
        disposers.push(disposer);
        return disposer;
    };

    const scope = {
        ownerId,
        get disposed() { return disposed; },
        get disposerCount() { return disposers.length; },
        add,
        listen(target, type, handler, options) {
            target?.addEventListener?.(type, handler, options);
            return add(() => target?.removeEventListener?.(type, handler, options));
        },
        timeout(callback, delay) {
            const id = host.setTimeout?.(callback, delay);
            return add(() => host.clearTimeout?.(id));
        },
        interval(callback, delay) {
            const id = host.setInterval?.(callback, delay);
            return add(() => host.clearInterval?.(id));
        },
        raf(callback) {
            const request = host.requestAnimationFrame || ((fn) => host.setTimeout?.(() => fn(Date.now()), 16));
            const cancel = host.cancelAnimationFrame || host.clearTimeout;
            const id = request.call(host, callback);
            return add(() => cancel?.call(host, id));
        },
        observe(observer, target, options) {
            observer?.observe?.(target, options);
            return add(() => observer?.disconnect?.());
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            while (disposers.length) safeDispose(disposers.pop());
        }
    };

    return Object.freeze(scope);
}

/** @param {any} [options] */
export function createLifecycle(options = {}) {
    const { events, host = globalThis } = options;
    let active = null;
    let generation = 0;
    const stats = new Map();

    async function transition(feature, context, meta = {}) {
        if (!feature?.id || typeof feature.mount !== 'function') return false;
        if (active?.id === feature.id) {
            await feature.update?.({ context, scope: active.scope, meta });
            return true;
        }

        const previous = active;
        if (previous) {
            previous.scope.dispose();
            try { await previous.feature.unmount?.({ context, meta }); } catch {}
            stats.set(previous.id, {
                ...(stats.get(previous.id) || {}),
                mounted: false,
                unmountedAt: Date.now()
            });
            events?.emit?.('feature:unmounted', { id: previous.id, generation });
        }

        generation += 1;
        const scope = createScope(feature.id, host);
        const record = { id: feature.id, feature, scope, generation };
        active = record;
        try {
            const cleanup = await feature.mount({ context, scope, meta });
            if (typeof cleanup === 'function') scope.add(cleanup);
            if (active !== record) {
                scope.dispose();
                return false;
            }
            stats.set(feature.id, {
                mounted: true,
                mountedAt: Date.now(),
                generation,
                disposerCount: scope.disposerCount
            });
            events?.emit?.('feature:mounted', { id: feature.id, generation });
            return true;
        } catch (error) {
            scope.dispose();
            if (active === record) active = null;
            events?.emit?.('feature:mount-error', { id: feature.id, generation, error });
            throw error;
        }
    }

    function dispose() {
        const previous = active;
        active = null;
        previous?.scope.dispose();
        events?.emit?.('feature:unmounted', { id: previous?.id || '', generation });
    }

    return Object.freeze({
        transition,
        dispose,
        get activeId() { return active?.id || ''; },
        get generation() { return generation; },
        snapshot() {
            return {
                activeId: active?.id || '',
                generation,
                activeDisposers: active?.scope.disposerCount || 0,
                features: Object.fromEntries(stats)
            };
        }
    });
}


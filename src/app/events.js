export function createEventBus() {
    const listeners = new Map();

    function on(type, handler) {
        if (typeof handler !== 'function') return () => {};
        const bucket = listeners.get(type) || new Set();
        bucket.add(handler);
        listeners.set(type, bucket);
        return () => {
            bucket.delete(handler);
            if (!bucket.size) listeners.delete(type);
        };
    }

    function emit(type, detail) {
        const bucket = listeners.get(type);
        if (!bucket?.size) return;
        [...bucket].forEach((handler) => {
            try { handler(detail); } catch {}
        });
    }

    return Object.freeze({
        on,
        emit,
        clear() { listeners.clear(); }
    });
}


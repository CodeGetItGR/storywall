'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
    return () => {};
}

function clientSnapshot() {
    return true;
}

function serverSnapshot() {
    return false;
}

// False on the server and while this component hydrates, true from the render after. Anything only
// the browser knows waits for it, so the hydrating render matches the server's HTML.
export function useIsHydrated(): boolean {
    return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

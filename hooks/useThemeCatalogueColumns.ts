'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type CatalogueColumns = 1 | 2;

const STORAGE_KEY = 'storywall:theme-catalogue-columns';
const listeners = new Set<() => void>();

function read(): CatalogueColumns {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === '2' ? 2 : 1;
    } catch {
        return 1;
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function serverSnapshot(): CatalogueColumns {
    return 1;
}

// How many cards a row shows on a phone: one or two. Kept on the device, so the choice stays when the
// visitor comes back. One on the server and in the first render, then the saved choice.
export function useThemeCatalogueColumns() {
    const columns = useSyncExternalStore(subscribe, read, serverSnapshot);

    const setColumns = useCallback((next: CatalogueColumns) => {
        try {
            window.localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
            // Storage blocked: the choice lasts until the page closes.
        }
        for (const listener of listeners) listener();
    }, []);

    return { columns, setColumns };
}

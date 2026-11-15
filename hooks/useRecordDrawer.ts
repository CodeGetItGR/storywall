'use client';

import { useCallback, useRef, useState } from 'react';

// token: which opening this is. A drawer closes only its own opening, so a save that finishes after
// the admin moved on (or a create, which has no id) can't close the drawer they have open now.
export type RecordDrawerState<T> = { open: false } | { open: true; record: T | null; token: number };

// Which record a list's drawer shows. null opens it on a new record.
export function useRecordDrawer<T>() {
    const [drawer, setDrawer] = useState<RecordDrawerState<T>>({ open: false });
    const nextToken = useRef(0);

    const openDrawer = useCallback((record: T | null) => {
        nextToken.current += 1;
        setDrawer({ open: true, record, token: nextToken.current });
    }, []);
    const openCreate = useCallback(() => openDrawer(null), [openDrawer]);

    // Bound to the opening it was rendered for: a stale call finds a different token and does nothing.
    const openToken = drawer.open ? drawer.token : 0;
    const closeDrawer = useCallback(() => {
        setDrawer((current) => (current.open && current.token === openToken ? { open: false } : current));
    }, [openToken]);

    return { drawer, openDrawer, openCreate, closeDrawer };
}

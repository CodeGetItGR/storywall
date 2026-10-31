'use client';

import { type MouseEvent, useCallback, useState } from 'react';

// Which rows of a list are open. The toggle button carries its row's key in data-key.
export function useExpandedKeys() {
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

    const handleToggle = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const key = event.currentTarget.dataset.key;
        if (key === undefined) return;
        setExpanded((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    return { expanded, handleToggle };
}

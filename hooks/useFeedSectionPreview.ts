'use client';

import { useCallback, useMemo, useState } from 'react';

// Which row's preview popup is open, if any. Closes itself if that section leaves the list.
export function useFeedSectionPreview<Item extends { type: string }>(items: readonly Item[]) {
    const [type, setType] = useState<Item['type'] | null>(null);
    const current = useMemo(() => items.find((item) => item.type === type) ?? null, [items, type]);
    const open = useCallback((next: Item['type']) => setType(next), []);
    const close = useCallback(() => setType(null), []);
    return { current, open, close };
}

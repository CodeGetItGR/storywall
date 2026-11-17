import { useEffect, useRef } from 'react';

import type { Item, ListMode } from '../lib/reviewOrder';

export function useScrollToCurrentRow(item: Item, mode: ListMode) {
    const treeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        treeRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [item, mode]);

    return treeRef;
}

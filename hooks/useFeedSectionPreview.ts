'use client';

import { useCallback, useMemo, useState } from 'react';

import type { FeedSectionPreview } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';

// Which row's preview popup is open, if any. Closes itself if that section leaves the list.
export function useFeedSectionPreview(items: readonly FeedSectionPreview[]) {
    const [type, setType] = useState<NewSectionType | null>(null);
    const current = useMemo(() => items.find((item) => item.type === type) ?? null, [items, type]);
    const open = useCallback((next: NewSectionType) => setType(next), []);
    const close = useCallback(() => setType(null), []);
    return { current, open, close };
}

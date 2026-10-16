'use client';

import { type SyntheticEvent, useCallback, useState } from 'react';

// The feature whose image the desktop frame shows. Falls back to the first when the list changes.
// `pick` reads the key from the element's `data-feature-key`.
export function useOccasionFeatureExplorer(keys: readonly string[]) {
    const [selected, setSelected] = useState<string | null>(null);
    const activeKey = selected && keys.includes(selected) ? selected : (keys[0] ?? null);
    const pick = useCallback((event: SyntheticEvent<HTMLElement>) => setSelected(event.currentTarget.dataset.featureKey ?? null), []);
    return { activeKey, pick };
}

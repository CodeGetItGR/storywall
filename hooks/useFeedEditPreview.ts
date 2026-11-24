'use client';

import { useCallback, useState } from 'react';

// Edit mode's eye: whether the feed shows as guests will see it, unsaved changes included.
export function useFeedEditPreview() {
    const [previewing, setPreviewing] = useState(false);
    const toggle = useCallback(() => setPreviewing((current) => !current), []);

    return { previewing, toggle };
}

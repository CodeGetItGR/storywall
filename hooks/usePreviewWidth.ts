'use client';

import { useState } from 'react';

export type PreviewWidth = 'mobile' | 'desktop';

// The preview's screen size. Phones only ever show the phone width, so the switch is hidden there.
export function usePreviewWidth(initial: PreviewWidth = 'mobile') {
    const [width, setWidth] = useState<PreviewWidth>(initial);
    return { width, setWidth };
}

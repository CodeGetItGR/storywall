'use client';

import { useCallback, useState } from 'react';

/** Which gallery photo is open full screen, if any. */
export function useGalleryLightbox() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const close = useCallback(() => setOpenIndex(null), []);

    return { openIndex, open: setOpenIndex, close };
}

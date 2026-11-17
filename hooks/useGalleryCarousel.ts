'use client';

import { useCallback, useState } from 'react';

import { stepGalleryIndex } from '@/lib/invitation/gallery';

/** The photo a gallery carousel is showing. */
export function useGalleryCarousel(count: number) {
    const [active, setActive] = useState(0);

    const previous = useCallback(() => setActive((index) => stepGalleryIndex(index, -1, count)), [count]);
    const next = useCallback(() => setActive((index) => stepGalleryIndex(index, 1, count)), [count]);

    return { active, previous, next, goTo: setActive };
}

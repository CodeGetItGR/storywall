'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useRef, useState } from 'react';

export interface StoryFilterCarousel {
    emblaRef: ReturnType<typeof useEmblaCarousel>[0];
    currentIndex: number;
    visibleName: string | null;
    scrollTo: (index: number) => void;
}

const NAME_PILL_DURATION_MS = 1000;

/** Drives the swipeable preset carousel in the story composer preview: which preset is
 * active, and the transient name pill shown for a second after each swipe. */
export function useStoryFilterCarousel(presetIds: string[]): StoryFilterCarousel {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visibleName, setVisibleName] = useState<string | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!emblaApi) return;

        function handleSelect() {
            const index = emblaApi!.selectedScrollSnap();
            setCurrentIndex(index);
            setVisibleName(presetIds[index] ?? null);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = setTimeout(() => setVisibleName(null), NAME_PILL_DURATION_MS);
        }

        emblaApi.on('select', handleSelect);
        return () => {
            emblaApi.off('select', handleSelect);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- presetIds is stable for a given composer session; resubscribing on identity churn would tear down Embla listeners unnecessarily.
    }, [emblaApi]);

    function scrollTo(index: number) {
        emblaApi?.scrollTo(index, true);
    }

    return { emblaRef, currentIndex, visibleName, scrollTo };
}

'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';

export type ModuleDescriptionSide = 'left' | 'right';

export function useModuleReveal(descriptionSide: ModuleDescriptionSide) {
    const descriptionIndex = descriptionSide === 'left' ? 0 : 1;
    const previewIndex = descriptionSide === 'left' ? 1 : 0;
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        containScroll: false,
        dragFree: false,
        startIndex: previewIndex,
    });
    const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);

    useEffect(() => {
        if (!emblaApi) return;

        function handleSelect() {
            setIsDescriptionVisible(emblaApi!.selectedScrollSnap() === descriptionIndex);
        }

        handleSelect();
        emblaApi.on('select', handleSelect);
        emblaApi.on('reInit', handleSelect);

        return () => {
            emblaApi.off('select', handleSelect);
            emblaApi.off('reInit', handleSelect);
        };
    }, [descriptionIndex, emblaApi]);

    const togglePanel = useCallback(() => {
        emblaApi?.scrollTo(isDescriptionVisible ? previewIndex : descriptionIndex);
    }, [descriptionIndex, emblaApi, isDescriptionVisible, previewIndex]);

    return { emblaRef, isDescriptionVisible, togglePanel };
}

'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { type TourCardPlacement, tourCardPlacement, type TourRect, type TourViewport } from '@/lib/invitation/editorTour';

const FALLBACK_CARD = { width: 350, height: 180 };

function viewportSize(): TourViewport {
    return { width: window.innerWidth, height: window.innerHeight };
}

// Where the tour card sits for the lit area, measured from the card itself and the screen.
export function useTourCardPlacement(spot: TourRect | null, stepKey: string) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [placement, setPlacement] = useState<TourCardPlacement>({ kind: 'center' });

    useLayoutEffect(() => {
        const place = () => {
            const card = cardRef.current;
            const size = card ? { width: card.offsetWidth, height: card.offsetHeight } : FALLBACK_CARD;
            setPlacement(tourCardPlacement(spot, viewportSize(), size.width && size.height ? size : FALLBACK_CARD));
        };
        place();
        window.addEventListener('resize', place);
        return () => window.removeEventListener('resize', place);
    }, [spot, stepKey]);

    return { cardRef, placement };
}

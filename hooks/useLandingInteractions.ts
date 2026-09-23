import type { RefObject } from 'react';

import { useLandingFaqInteraction } from '@/hooks/useLandingFaqInteraction';
import { useLandingFeatureCarousel } from '@/hooks/useLandingFeatureCarousel';
import { useLandingStoryInteractions } from '@/hooks/useLandingStoryInteractions';

export function useLandingInteractions(landingRef: RefObject<HTMLElement | null>, motionPaused = false) {
    useLandingStoryInteractions(landingRef);
    useLandingFeatureCarousel(landingRef, motionPaused);
    useLandingFaqInteraction(landingRef);
}

'use client';

import type { ReactNode } from 'react';

import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

type OccasionHeroVisualProps = {
    className?: string;
    feed?: ReactNode;
    posts?: readonly [ReactNode, ReactNode];
};

// The landing's phone and floating posts; an occasion with its own photos passes its feed and cards.
export function OccasionHeroVisual({ className, feed, posts }: OccasionHeroVisualProps) {
    const { paused } = useLandingMotion();
    return <LandingHeroVisual className={className} feed={feed} motionPaused={paused} posts={posts} />;
}

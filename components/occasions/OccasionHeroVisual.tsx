'use client';

import type { ReactNode } from 'react';

import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

type OccasionHeroVisualProps = {
    className?: string;
    comments?: readonly [ReactNode, ReactNode];
    feed?: ReactNode;
    posts?: readonly [ReactNode, ReactNode];
};

// The landing's phone and floating cards; an occasion with its own photos passes its feed and cards.
export function OccasionHeroVisual({ className, comments, feed, posts }: OccasionHeroVisualProps) {
    const { paused } = useLandingMotion();
    return <LandingHeroVisual className={className} comments={comments} feed={feed} motionPaused={paused} posts={posts} />;
}

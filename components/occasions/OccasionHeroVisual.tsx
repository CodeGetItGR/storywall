'use client';

import type { ReactNode } from 'react';

import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

// The landing's phone and floating posts; an occasion with its own photos passes its feed and cards.
export function OccasionHeroVisual({ feed, posts }: { feed?: ReactNode; posts?: readonly [ReactNode, ReactNode] }) {
    const { paused } = useLandingMotion();
    return <LandingHeroVisual feed={feed} motionPaused={paused} posts={posts} />;
}

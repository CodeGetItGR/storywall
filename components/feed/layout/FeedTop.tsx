'use client';

import dynamic from 'next/dynamic';

import { FeedTopFrame, type FeedTopProps, PLAIN_PARTS } from '@/components/feed/layout/FeedTopFrame';

// Loaded only when a layout uses the invitation look, so the plain feed loads none of its styles or fonts.
const FeedLookTop = dynamic(() => import('@/components/feed/layout/FeedLookTop').then((module) => module.FeedLookTop));

// The top of the feed: plainly, as today, or in the invitation look.
export function FeedTop(props: FeedTopProps) {
    return props.view.look ? <FeedLookTop {...props} /> : <FeedTopFrame {...props} parts={PLAIN_PARTS} />;
}

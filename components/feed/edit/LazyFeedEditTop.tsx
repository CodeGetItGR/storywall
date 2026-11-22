'use client';

import dynamic from 'next/dynamic';

// Edit mode's code loads only when a host taps Edit.
export const LazyFeedEditTop = dynamic(() => import('@/components/feed/edit/FeedEditTop').then((module) => module.FeedEditTop));

'use client';

import { type ComponentProps, lazy, type ReactNode, Suspense } from 'react';

// Edit mode's code loads only when a host taps Edit.
const FeedEditTop = lazy(() => import('@/components/feed/edit/FeedEditTop').then((module) => ({ default: module.FeedEditTop })));

type LazyFeedEditTopProps = ComponentProps<typeof FeedEditTop> & { fallback: ReactNode };

// While that code loads, the feed's own top stays on screen.
export function LazyFeedEditTop({ fallback, ...props }: LazyFeedEditTopProps) {
    return (
        <Suspense fallback={fallback}>
            <FeedEditTop {...props} />
        </Suspense>
    );
}

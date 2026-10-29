'use client';

import { useEffect, useRef } from 'react';

import { useContentViews } from '@/hooks/useContentViews';
import type { PostResponseDto } from '@/lib/api/types';
import { isVendorPost } from '@/lib/contentViews';
import { useActiveMember, useIsHost } from '@/providers/EventProvider';

// The spec's "seen": at least half the card on screen for at least a second.
export const POST_VIEW_RATIO = 0.5;
export const POST_VIEW_DWELL_MS = 1000;

// Attach the returned ref to a feed card. Records one view of a vendor's post, once, for guests and other vendors.
export function useVendorPostViewTracking<T extends Element>(post: PostResponseDto) {
    const ref = useRef<T | null>(null);
    const record = useContentViews();
    const activeMember = useActiveMember();
    const isHost = useIsHost();
    const tracked = isVendorPost(post) && !isHost && Boolean(activeMember) && post.authorMemberId !== activeMember?.id;

    useEffect(() => {
        const element = ref.current;
        if (!tracked || !element || typeof IntersectionObserver === 'undefined') return;
        let timer: number | null = null;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= POST_VIEW_RATIO) {
                    timer ??= window.setTimeout(() => {
                        record(post.eventId, 'post', post.id);
                        observer.disconnect();
                    }, POST_VIEW_DWELL_MS);
                } else if (timer !== null) {
                    window.clearTimeout(timer);
                    timer = null;
                }
            },
            { threshold: [POST_VIEW_RATIO] },
        );
        observer.observe(element);
        return () => {
            observer.disconnect();
            if (timer !== null) window.clearTimeout(timer);
        };
    }, [post.eventId, post.id, record, tracked]);

    return ref;
}

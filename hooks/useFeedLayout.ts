'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { feedLayoutKeys, readFeedLayout } from '@/lib/feedLayout';

export { feedLayoutKeys };

// The saved layout, or null when the host never saved one.
export async function fetchFeedLayout(eventId: string): Promise<FeedLayoutDto | null> {
    try {
        return await api.get<FeedLayoutDto>(endpoints.events.feedLayout(eventId));
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
    }
}

// The event's feed layout as the feed draws it. Off, loading or failed, it is the default layout,
// which is today's feed.
export function useFeedLayout(event: Pick<EventDetailResponseDto, 'id' | 'theme'>, { enabled }: { enabled: boolean }) {
    const query = useQuery({
        queryKey: feedLayoutKeys.detail(event.id),
        queryFn: () => fetchFeedLayout(event.id),
        enabled,
    });
    // A disabled query still hands back cached data, so the flag decides here too.
    const saved = enabled ? (query.data ?? null) : null;
    const view = useMemo(() => readFeedLayout(saved, event.theme), [saved, event.theme]);
    // isLoaded: the saved layout (or its 404) is in. Edit mode waits for it, so it never edits the stand-in.
    return { ...view, isLoading: enabled && query.isLoading, isLoaded: enabled && query.isSuccess };
}

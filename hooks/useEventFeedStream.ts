'use client';

import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { commentKeys } from '@/hooks/useComments';
import { refreshFeedFirstPage } from '@/hooks/usePosts';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isModuleNotAvailableError } from '@/lib/api/errors';
import { type Page } from '@/lib/api/pagination';
import type { EventStreamTokenDto, PostResponseDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

const RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
// Every guest of an event gets the same frame at the same moment. A random
// delay spreads their fetches over most of the backend's coalescing window
// (app.feed.sse.coalesce-window-ms, 2 s) instead of all at once.
const REFRESH_JITTER_MS = 1_500;

// The session is gone, the caller is no longer a member, the event no
// longer exists, or it no longer has posts — retrying can't change any of
// those, so stop.
function isPermanentFailure(error: unknown): boolean {
    return (error instanceof ApiError && [401, 403, 404].includes(error.status)) || isModuleNotAvailableError(error);
}

function retryAfterMs(error: unknown): number | null {
    return error instanceof ApiError && error.retryAfterSeconds !== undefined ? error.retryAfterSeconds * 1000 : null;
}

export function useEventFeedStream(eventId: string | null) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!eventId) return;

        let disposed = false;
        let evicted = false;
        let stream: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let refreshTimer: ReturnType<typeof setTimeout> | null = null;
        let failedMints = 0;

        // A refresh already waiting will see this change too.
        function scheduleRefresh() {
            if (refreshTimer) return;
            refreshTimer = setTimeout(() => {
                refreshTimer = null;
                refresh();
            }, Math.random() * REFRESH_JITTER_MS);
        }

        function refresh() {
            void refreshFeedFirstPage(queryClient, eventId!);
            const posts =
                queryClient.getQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list(eventId!))?.pages.flatMap((page) => page.content) ?? [];
            for (const post of posts) void queryClient.invalidateQueries({ queryKey: commentKeys.list(post.id), exact: true });
        }

        function scheduleReconnect(delayMs = RECONNECT_DELAY_MS) {
            if (disposed || evicted) return;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => void open(), delayMs);
        }

        async function open() {
            try {
                const { token } = await api.post<EventStreamTokenDto>(endpoints.events.streamToken(eventId!));
                if (disposed) return;
                failedMints = 0;
                stream = new EventSource(api.url(endpoints.events.stream(eventId!, token)));
                stream.addEventListener('changed', scheduleRefresh);
                // The member opened too many streams on this event (other tabs,
                // other devices) and the server dropped this one, the oldest.
                // Reconnecting would only drop the next oldest, so this tab stops
                // being pushed to and falls back to the feed's one-minute poll.
                stream.addEventListener('evicted', () => {
                    evicted = true;
                    stream?.close();
                    stream = null;
                });
                stream.addEventListener('error', () => {
                    stream?.close();
                    stream = null;
                    scheduleReconnect();
                });
            } catch (error) {
                if (isPermanentFailure(error)) return;
                failedMints += 1;
                const backoff = Math.min(RECONNECT_DELAY_MS * 2 ** (failedMints - 1), MAX_RECONNECT_DELAY_MS);
                scheduleReconnect(retryAfterMs(error) ?? backoff);
            }
        }

        void open();
        return () => {
            disposed = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (refreshTimer) clearTimeout(refreshTimer);
            stream?.close();
        };
    }, [eventId, queryClient]);
}

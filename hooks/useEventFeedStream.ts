'use client';

import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { commentKeys } from '@/hooks/useComments';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { type Page } from '@/lib/api/pagination';
import type { EventStreamTokenDto, PostResponseDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

const RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

// The session is gone, the caller is no longer a member, or the event no
// longer exists — retrying can't change any of those, so stop.
function isPermanentFailure(error: unknown): boolean {
    return error instanceof ApiError && [401, 403, 404].includes(error.status);
}

function retryAfterMs(error: unknown): number | null {
    return error instanceof ApiError && error.retryAfterSeconds !== undefined ? error.retryAfterSeconds * 1000 : null;
}

export function useEventFeedStream(eventId: string | null) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!eventId) return;

        let disposed = false;
        let stream: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let failedMints = 0;

        function refresh() {
            void queryClient.invalidateQueries({ queryKey: postKeys.list(eventId!) });
            const posts =
                queryClient.getQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list(eventId!))?.pages.flatMap((page) => page.content) ?? [];
            for (const post of posts) void queryClient.invalidateQueries({ queryKey: commentKeys.list(post.id), exact: true });
        }

        function scheduleReconnect(delayMs = RECONNECT_DELAY_MS) {
            if (disposed) return;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => void open(), delayMs);
        }

        async function open() {
            try {
                const { token } = await api.post<EventStreamTokenDto>(endpoints.events.streamToken(eventId!));
                if (disposed) return;
                failedMints = 0;
                stream = new EventSource(api.url(endpoints.events.stream(eventId!, token)));
                stream.addEventListener('changed', refresh);
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
            stream?.close();
        };
    }, [eventId, queryClient]);
}

'use client';

import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { commentKeys } from '@/hooks/useComments';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { type Page } from '@/lib/api/pagination';
import type { EventStreamTokenDto, PostResponseDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

const RECONNECT_DELAY_MS = 1_000;

export function useEventFeedStream(eventId: string | null) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!eventId) return;

        let disposed = false;
        let stream: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        function refresh() {
            void queryClient.invalidateQueries({ queryKey: postKeys.list(eventId!) });
            const posts = queryClient.getQueryData<InfiniteData<Page<PostResponseDto>>>(postKeys.list(eventId!))?.pages.flatMap((page) => page.content) ?? [];
            for (const post of posts) void queryClient.invalidateQueries({ queryKey: commentKeys.list(post.id), exact: true });
        }

        function scheduleReconnect() {
            if (!disposed) reconnectTimer = setTimeout(() => void open(), RECONNECT_DELAY_MS);
        }

        async function open() {
            try {
                const { token } = await api.post<EventStreamTokenDto>(endpoints.events.streamToken(eventId!));
                if (disposed) return;
                stream = new EventSource(api.url(endpoints.events.stream(eventId!, token)));
                stream.addEventListener('changed', refresh);
                stream.addEventListener('error', () => {
                    stream?.close();
                    stream = null;
                    scheduleReconnect();
                });
            } catch {
                scheduleReconnect();
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

'use client';

import { useCallback, useEffect } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MediaResponseDto } from '@/lib/api/types';
import { CONTENT_VIEWS_FLUSH_MS, type ContentViewKind, createContentViewQueue, isCountableProMedia } from '@/lib/contentViews';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

// One queue for the tab: the feed, the gallery viewer and the post viewer share it.
const queue = createContentViewQueue((eventId, body, keepalive) => api.post<void>(endpoints.events.contentViews(eventId), body, { keepalive }));
let flushing = false;

// Started by the first view, then kept for the tab's life: an empty flush sends nothing.
function startFlushing() {
    if (flushing || typeof window === 'undefined') return;
    flushing = true;
    window.setInterval(() => queue.flush(), CONTENT_VIEWS_FLUSH_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') queue.flush(true);
    });
}

// Records that the caller saw something. Counting only: never throws, never shows an error.
export function useContentViews() {
    return useCallback((eventId: string, kind: ContentViewKind, id: string) => {
        if (queue.add(eventId, kind, id)) startFlushing();
    }, []);
}

// Records a Pro item shown in a viewer, unless the caller is a host or uploaded it.
export function useRecordProMediaView(media: MediaResponseDto | null | undefined) {
    const record = useContentViews();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const isHost = useIsHost();
    const eventId = activeEvent?.id ?? null;
    const mediaId = media && activeMember && !isHost && isCountableProMedia(media, activeMember.id) ? media.id : null;

    useEffect(() => {
        if (eventId && mediaId) record(eventId, 'media', mediaId);
    }, [eventId, mediaId, record]);
}

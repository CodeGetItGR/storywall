'use client';

import { useCallback, useState } from 'react';

import { useFeedLayout } from '@/hooks/useFeedLayout';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

// Whether the cover shows the Edit pill, and whether edit mode is on. Hosts and co-hosts only,
// on a writable event, once the saved layout is in.
export function useFeedEditMode(event: Pick<EventDetailResponseDto, 'id' | 'theme' | 'status'>, isHost: boolean) {
    const enabled = useFeedEditorEnabled();
    const layout = useFeedLayout(event, { enabled });
    const canEdit = enabled && isHost && isEventWritable(event.status) && layout.isLoaded;
    const [editing, setEditing] = useState(false);
    const start = useCallback(() => setEditing(true), []);
    const finish = useCallback(() => setEditing(false), []);

    return { canEdit, editing: canEdit && editing, start, finish };
}

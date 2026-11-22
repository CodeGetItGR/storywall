'use client';

import { useCallback, useState } from 'react';

import { useFeedLayout } from '@/hooks/useFeedLayout';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable, isModuleAvailable } from '@/lib/eventLifecycle';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

// Whether the cover shows the Edit pill, and whether edit mode is on. Hosts and co-hosts only, on a
// writable event with Save my date, once the saved layout is in. `settled`: the role and the layout
// are known, so a request to edit (?edit=blocks) can be answered.
export function useFeedEditMode(event: Pick<EventDetailResponseDto, 'id' | 'theme' | 'status' | 'modules'>, isHost: boolean, isRoleLoading = false) {
    const enabled = useFeedEditorEnabled();
    const layout = useFeedLayout(event, { enabled });
    const canEdit = enabled && isHost && isEventWritable(event.status) && isModuleAvailable(event.modules, 'save_my_date') && layout.isLoaded;
    const settled = !isRoleLoading && !layout.isLoading;
    const [editing, setEditing] = useState(false);
    // Once editing isn't allowed any more, edit mode ends for good: it can't come back on its own later.
    if (editing && !canEdit) setEditing(false);
    const start = useCallback(() => setEditing(true), []);
    const finish = useCallback(() => setEditing(false), []);

    return { canEdit, settled, editing: canEdit && editing, start, finish };
}

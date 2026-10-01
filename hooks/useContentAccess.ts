'use client';

import { useCallback, useContext } from 'react';

import { isContentLocked } from '@/lib/contentPermissions';
import { EventContext } from '@/providers/EventProvider';

// Demo-specific rules on top of the usual author/host checks for editing and deleting content.
export function useContentAccess() {
    const mode = useContext(EventContext)?.contentAccessMode ?? 'standard';
    const isLocked = useCallback((contentId: string) => isContentLocked(mode, contentId), [mode]);

    return {
        // An admin building a demo: edits every post, including those posted as a guest, and writes wishes.
        isDemoBuilder: mode === 'demoBuilder',
        isLocked,
    };
}

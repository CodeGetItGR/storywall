'use client';

import { type MouseEvent, useCallback } from 'react';

import { opensBlockSettings } from '@/lib/feedEditing';

// A tap on a block in edit mode opens its settings, or moves the open panel to it.
// The pencil stays the keyboard way in; a block with nothing to set ignores the tap.
export function useFeedBlockTap(id: string, hasSettings: boolean, onOpenSettings: (id: string) => void) {
    return useCallback(
        (event: MouseEvent<HTMLElement>) => {
            if (hasSettings && opensBlockSettings(event.target, event.currentTarget)) onOpenSettings(id);
        },
        [hasSettings, id, onOpenSettings],
    );
}

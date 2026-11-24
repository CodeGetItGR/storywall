'use client';

import { useMemo } from 'react';

export type FeedBlockToolActions = {
    onToggleVisible: (id: string) => void;
    onDelete: (id: string) => void;
    onOpenSettings: (id: string) => void;
};

// One block's tool callbacks, bound to its id, so the tools get stable handlers.
export function useFeedBlockHandlers(id: string, actions: FeedBlockToolActions) {
    const { onToggleVisible, onDelete, onOpenSettings } = actions;
    return useMemo(
        () => ({
            toggleVisible: () => onToggleVisible(id),
            remove: () => onDelete(id),
            openSettings: () => onOpenSettings(id),
        }),
        [id, onDelete, onOpenSettings, onToggleVisible],
    );
}

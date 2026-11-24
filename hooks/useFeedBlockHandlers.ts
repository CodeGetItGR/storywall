'use client';

import { useMemo } from 'react';

export type FeedBlockToolActions = {
    onToggleVisible: (id: string) => void;
    onDelete: (id: string) => void;
    onOpenSettings: (id: string) => void;
    onMenuOpenChange: (id: string, open: boolean) => void;
};

// One block's tool callbacks, bound to its id, so the tools get stable handlers.
export function useFeedBlockHandlers(id: string, actions: FeedBlockToolActions) {
    const { onToggleVisible, onDelete, onOpenSettings, onMenuOpenChange } = actions;
    return useMemo(
        () => ({
            toggleVisible: () => onToggleVisible(id),
            remove: () => onDelete(id),
            openSettings: () => onOpenSettings(id),
            setMenuOpen: (open: boolean) => onMenuOpenChange(id, open),
        }),
        [id, onDelete, onMenuOpenChange, onOpenSettings, onToggleVisible],
    );
}

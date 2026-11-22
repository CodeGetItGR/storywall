'use client';

import { useMemo } from 'react';

import type { MoveDirection } from '@/lib/invitation/sectionActions';

export type FeedBlockToolActions = {
    onToggleVisible: (id: string) => void;
    onMove: (id: string, direction: MoveDirection) => void;
    onDelete: (id: string) => void;
    onOpenSettings: (id: string) => void;
};

// One block's tool callbacks, bound to its id, so the tools get stable handlers.
export function useFeedBlockHandlers(id: string, actions: FeedBlockToolActions) {
    const { onToggleVisible, onMove, onDelete, onOpenSettings } = actions;
    return useMemo(
        () => ({
            toggleVisible: () => onToggleVisible(id),
            moveUp: () => onMove(id, -1),
            moveDown: () => onMove(id, 1),
            remove: () => onDelete(id),
            openSettings: () => onOpenSettings(id),
        }),
        [id, onDelete, onMove, onOpenSettings, onToggleVisible],
    );
}

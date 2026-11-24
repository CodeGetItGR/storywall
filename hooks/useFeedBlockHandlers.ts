'use client';

import { useMemo } from 'react';

import type { FeedBackgroundKind } from '@/lib/feedBlockMenu';

export type FeedBlockToolActions = {
    onToggleVisible: (id: string) => void;
    onDelete: (id: string) => void;
    onOpenSettings: (id: string) => void;
    onOpenBackground: (id: string, kind: FeedBackgroundKind) => void;
    onPickBackgroundPhoto: (id: string, file: File) => void;
    onMenuOpenChange: (id: string, open: boolean) => void;
};

// One block's tool callbacks, bound to its id, so the tools get stable handlers.
export function useFeedBlockHandlers(id: string, actions: FeedBlockToolActions) {
    const { onToggleVisible, onDelete, onOpenSettings, onOpenBackground, onPickBackgroundPhoto, onMenuOpenChange } = actions;
    return useMemo(
        () => ({
            toggleVisible: () => onToggleVisible(id),
            remove: () => onDelete(id),
            openSettings: () => onOpenSettings(id),
            openBackground: (kind: FeedBackgroundKind) => onOpenBackground(id, kind),
            pickBackgroundPhoto: (file: File) => onPickBackgroundPhoto(id, file),
            setMenuOpen: (open: boolean) => onMenuOpenChange(id, open),
        }),
        [id, onDelete, onMenuOpenChange, onOpenBackground, onOpenSettings, onPickBackgroundPhoto, onToggleVisible],
    );
}

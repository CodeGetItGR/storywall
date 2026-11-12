'use client';

import { useMemo } from 'react';

import type { MoveDirection, SectionSlot } from '@/lib/invitation/sectionActions';

// What a section's tools can do, for any section by its id.
export type SectionFrameActions = {
    activate: (id: string) => void;
    toggleVisible: (id: string) => void;
    move: (id: string, direction: MoveDirection) => void;
    askDelete: (id: string) => void;
    openAddList: (slot: SectionSlot) => void;
    // Opens the section's settings sheet.
    openSettings: (id: string) => void;
};

// The same actions, bound to one section.
export function useSectionFrameHandlers(id: string, actions: SectionFrameActions) {
    return useMemo(
        () => ({
            onActivate: () => actions.activate(id),
            onToggleVisible: () => actions.toggleVisible(id),
            onMoveUp: () => actions.move(id, -1),
            onMoveDown: () => actions.move(id, 1),
            onDelete: () => actions.askDelete(id),
            onAddBefore: () => actions.openAddList({ id, place: 'before' }),
            onAddAfter: () => actions.openAddList({ id, place: 'after' }),
            onOpenSettings: () => actions.openSettings(id),
        }),
        [actions, id],
    );
}

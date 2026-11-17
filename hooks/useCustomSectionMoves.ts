'use client';

import { useCallback, useMemo } from 'react';

import {
    columnBreakMoves,
    customItemMoves,
    moveColumnBreak,
    moveCustomItem,
    type MoveDirection,
} from '@/lib/invitation/canvasHandles';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { InvitationElement } from '@/lib/invitation/elements';

// The arrows of one custom section item, or of its column split. Each tap is one undo step.
export function useCustomSectionMoves(
    edit: InvitationEditorState['edit'],
    sectionId: string,
    elements: readonly InvitationElement[],
    id: string,
    kind: 'item' | 'break',
) {
    const options = useMemo(
        () => (kind === 'item' ? customItemMoves(elements, id) : columnBreakMoves(elements, id)),
        [elements, id, kind],
    );
    const move = useCallback(
        (direction: MoveDirection) =>
            edit((draft) => (kind === 'item' ? moveCustomItem(draft, sectionId, id, direction) : moveColumnBreak(draft, sectionId, id, direction))),
        [edit, id, kind, sectionId],
    );
    const back = useCallback(() => move(-1), [move]);
    const forward = useCallback(() => move(1), [move]);

    return { options, back, forward };
}

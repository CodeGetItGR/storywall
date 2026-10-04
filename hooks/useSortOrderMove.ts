'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { type MoveDirection, planSortOrderMove, type SortOrderUpdate } from '@/lib/sortOrder';

// Up/down arrows for a sorted admin list. One move is two PATCHes (more after a
// renumber), sent in order. The list refetches either way, so a half-applied
// move shows as it really is. `idOf` must be stable (a module-level function).
export function useSortOrderMove<T extends { sortOrder: number }>({
    items,
    idOf,
    patch,
    refresh,
}: {
    items: T[];
    idOf: (item: T) => string;
    patch: (update: SortOrderUpdate) => Promise<unknown>;
    refresh: () => void;
}) {
    const mutation = useMutation({
        mutationFn: async (updates: SortOrderUpdate[]) => {
            for (const update of updates) await patch(update);
        },
        onSettled: refresh,
    });
    const { mutate } = mutation;

    const move = useCallback(
        (id: string, direction: MoveDirection) => {
            const updates = planSortOrderMove(items, idOf, id, direction);
            if (updates.length > 0) mutate(updates);
        },
        [idOf, items, mutate],
    );

    return { move, isPending: mutation.isPending, error: mutation.error };
}

export type SortOrderMove = ReturnType<typeof useSortOrderMove>;

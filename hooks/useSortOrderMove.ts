'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { arrangeByIds, type MoveDirection, moveId, planSortOrderMove, planSortOrderReorder, type SortOrderUpdate } from '@/lib/sortOrder';

// Up/down arrows and drag and drop for a sorted admin list. One move is a few
// PATCHes, sent in order. The list refetches either way, so a half-applied move
// shows as it really is. `idOf` must be stable (a module-level function).
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
    // The order a drop asked for, shown until `items` comes back refetched.
    const [dropped, setDropped] = useState<{ ids: string[]; items: T[] } | null>(null);
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

    const reorder = useCallback(
        (activeId: string, overId: string) => {
            const updates = planSortOrderReorder(items, idOf, activeId, overId);
            const ids = moveId(items.map(idOf), activeId, overId);
            if (updates.length === 0 || !ids) return;
            setDropped({ ids, items });
            // A failure that changed nothing refetches the same list, so drop the order here.
            mutate(updates, { onError: () => setDropped(null) });
        },
        [idOf, items, mutate],
    );

    // Any list drawn from `items` (the same rows, maybe filtered), in the dropped order.
    const arrange = useCallback(
        <R extends T>(list: R[]): R[] => (dropped && dropped.items === items ? arrangeByIds(list, idOf, dropped.ids) : list),
        [dropped, idOf, items],
    );

    return { move, reorder, arrange, isPending: mutation.isPending, error: mutation.error };
}

export type SortOrderMove = ReturnType<typeof useSortOrderMove>;

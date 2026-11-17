'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { adminFontPairingKeys, useAdminFontPairings } from '@/hooks/useAdminFontPairings';
import { useSortOrderMove } from '@/hooks/useSortOrderMove';
import type { AdminFontPairingDto } from '@/lib/adminFontPairings';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { nextSortOrder } from '@/lib/sortOrder';

const pairingIdOf = (pairing: AdminFontPairingDto) => pairing.id;

// The font pairings list and its order: the arrows, drag and drop, and the place a new pairing takes (last).
export function useFontPairingsList() {
    const queryClient = useQueryClient();
    const pairingsQuery = useAdminFontPairings();
    const pairings = useMemo(() => pairingsQuery.data ?? [], [pairingsQuery.data]);
    const move = useSortOrderMove({
        items: pairings,
        idOf: pairingIdOf,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.invitationFontPairings.byId(id), { sortOrder }),
        refresh: () => void queryClient.invalidateQueries({ queryKey: adminFontPairingKeys.all }),
    });

    return {
        pairings: move.arrange(pairings),
        isLoaded: pairingsQuery.data !== undefined,
        isLoading: pairingsQuery.isLoading,
        error: pairingsQuery.error ?? null,
        createSortOrder: nextSortOrder(pairings),
        canReorder: !move.isPending,
        moveError: move.error,
        movePairing: move.move,
        reorderPairing: move.reorder,
    };
}

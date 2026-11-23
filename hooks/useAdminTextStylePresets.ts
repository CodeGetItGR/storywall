'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useSortOrderMove } from '@/hooks/useSortOrderMove';
import { textStylePresetKeys } from '@/hooks/useTextStylePresets';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { TextStylePresetDto, TextStylePresetRequestDto } from '@/lib/api/types';

export const adminTextStylePresetKeys = { all: ['admin', 'text-style-presets'] as const };
const presetId = (item: TextStylePresetDto) => item.id;

// Every change refreshes the admin list and the hosts' read.
function useRefreshPresets() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminTextStylePresetKeys.all });
        void queryClient.invalidateQueries({ queryKey: textStylePresetKeys.all });
    }, [queryClient]);
}

export function useAdminTextStylePresets() {
    return useQuery({
        queryKey: adminTextStylePresetKeys.all,
        queryFn: () => api.get<TextStylePresetDto[]>(endpoints.admin.textStylePresets.list),
    });
}

// Create, replace or delete one preset.
export function useSaveTextStylePreset() {
    const refresh = useRefreshPresets();
    const save = useMutation({
        mutationFn: ({ id, body }: { id: string | null; body: TextStylePresetRequestDto }) =>
            id
                ? api.put<TextStylePresetDto>(endpoints.admin.textStylePresets.byId(id), body)
                : api.post<TextStylePresetDto>(endpoints.admin.textStylePresets.list, body),
        onSuccess: refresh,
    });
    const remove = useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.textStylePresets.byId(id)),
        onSuccess: refresh,
    });
    return { save, remove };
}

// Dragging a preset in the admin list (Open question 5): the shared sortOrder move, like the landing categories.
export function useTextStylePresetMove(items: TextStylePresetDto[]) {
    const refresh = useRefreshPresets();
    return useSortOrderMove({
        items,
        idOf: presetId,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.textStylePresets.byId(id), { sortOrder }),
        refresh,
    });
}

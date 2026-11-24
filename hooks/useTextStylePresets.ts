'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { TextStylePresetDto } from '@/lib/api/types';

export const textStylePresetKeys = { all: ['text-style-presets'] as const };

// The feed's Style presets, for the text toolbar. Read once per visit to edit mode; admins change them rarely.
export function useTextStylePresets(enabled = true) {
    return useQuery({
        queryKey: textStylePresetKeys.all,
        queryFn: () => api.get<TextStylePresetDto[]>(endpoints.textStylePresets),
        enabled,
        staleTime: 10 * 60 * 1000,
    });
}

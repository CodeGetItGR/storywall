'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { TypographyPresetOption } from '@/lib/invitation/themeEditing';

export const invitationTypographyPresetKeys = {
    list: (eventType: string) => ['invitation-typography-presets', eventType] as const,
};

// The font pairings offered for an event type (hidden ones left out by the backend).
export function useInvitationTypographyPresets(eventType: string) {
    return useQuery({
        queryKey: invitationTypographyPresetKeys.list(eventType),
        queryFn: () => api.get<TypographyPresetOption[]>(endpoints.invitationTypographyPresets(eventType)),
        staleTime: 5 * 60_000,
    });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDetailResponseDto, EventThemeRequestDto, EventThemeResponseDto, ThemePresetDto } from '@/lib/api/types';

export const eventThemeKeys = {
    presets: (eventId: string) => ['events', eventId, 'theme-presets'] as const,
};

// GET /api/events/{eventId}/theme-presets — host only, and only while the
// event's plan includes the theme module (callers pass null otherwise).
// Already in display order; don't re-sort.
export function useEventThemePresets(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventThemeKeys.presets(eventId ?? ''),
        queryFn: () => api.get<ThemePresetDto[]>(endpoints.events.themePresets(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

// PUT /api/events/{eventId}/theme — null clears it. The reply is just
// { theme }, so it is merged into the cached event detail and every page
// repaints at once; the event lists carry the theme too and refetch.
export function useSetEventTheme(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (presetId: string | null) => {
            const body: EventThemeRequestDto = { presetId };
            return api.put<EventThemeResponseDto>(endpoints.events.theme(eventId), body);
        },
        onSuccess: ({ theme }) => {
            queryClient.setQueryData<EventDetailResponseDto>(eventKeys.detail(eventId), (event) => (event ? { ...event, theme } : event));
            queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
        },
    });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { eventKeys } from '@/hooks/useEvent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { EventDetailResponseDto, EventThemeRequestDto, EventThemeResponseDto, ThemePresetDto } from '@/lib/api/types';

export const eventThemeKeys = {
    presets: (eventId: string) => ['events', eventId, 'theme-presets'] as const,
    presetsForType: (eventType: string) => ['theme-presets', eventType] as const,
};

// GET /api/theme-presets?eventType= — the creation form's theme step, before the
// event exists. Empty for a type without themes; callers pass null when the chosen
// plan doesn't list the theme module. Already in display order; don't re-sort.
export function useThemePresetsForType(eventType: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventThemeKeys.presetsForType(eventType ?? ''),
        queryFn: () => api.get<ThemePresetDto[]>(endpoints.themePresets.byEventType(eventType!)),
        enabled: Boolean(eventType) && isAuthenticated,
    });
}

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
// repaints at once. No other cached query carries a theme (the only /api/events call here is create; /api/me/events rows have none), so nothing else needs invalidating.
// A refusal means the picker's data is stale: 5143 (the preset was archived or
// is no longer offered) refetches the presets; 5144 (event ended) and 5012
// (module gone) also refetch the event, and the picker goes quiet.
export function useSetEventTheme(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (presetId: string | null) => {
            const body: EventThemeRequestDto = { presetId };
            return api.put<EventThemeResponseDto>(endpoints.events.theme(eventId), body);
        },
        onSuccess: ({ theme }) => {
            queryClient.setQueryData<EventDetailResponseDto>(eventKeys.detail(eventId), (event) => (event ? { ...event, theme } : event));
        },
        onError: (error) => {
            const code = getErrorCode(error);
            if (code === ERROR_CODES.EVENT_ENDED || code === ERROR_CODES.MODULE_NOT_AVAILABLE) {
                queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
                queryClient.invalidateQueries({ queryKey: eventThemeKeys.presets(eventId) });
            } else if (code === ERROR_CODES.THEME_PRESET_NOT_SELECTABLE) {
                queryClient.invalidateQueries({ queryKey: eventThemeKeys.presets(eventId) });
            }
        },
    });
}

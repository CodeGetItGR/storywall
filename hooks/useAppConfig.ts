import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AppConfigResponseDto, AppMediaConfigDto, AppRsvpConfigDto, PlatformFeatureFlagResponseDto } from '@/lib/api/types';

export const appConfigKeys = {
    all: ['app-config'] as const,
};

// GET /api/config — public, read-only, and safe to cache aggressively.
export function useAppConfig(options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: appConfigKeys.all,
        queryFn: () => api.publicGet<AppConfigResponseDto>(endpoints.config.get),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: options.enabled ?? true,
    });
}

export function useAppMediaConfig(): AppMediaConfigDto | null {
    const { data } = useAppConfig();
    return data?.media ?? null;
}

export function useAppRsvpConfig(): AppRsvpConfigDto | null {
    const { data } = useAppConfig();
    return data?.rsvp ?? null;
}

export function useAppFeatureFlags(): PlatformFeatureFlagResponseDto[] {
    const { data } = useAppConfig();
    return data?.featureFlags ?? [];
}

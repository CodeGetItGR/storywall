import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    AppConfigResponseDto,
    AppCoverageConfigDto,
    AppMediaConfigDto,
    AppNewsletterConfigDto,
    AppRsvpConfigDto,
    PlatformFeatureFlagResponseDto,
} from '@/lib/api/types';

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

export function useAppCoverageConfig(): AppCoverageConfigDto | null {
    const { data } = useAppConfig();
    return data?.coverage ?? null;
}

// Null while the newsletter is switched off (or config hasn't loaded) — every
// newsletter surface hides on null rather than on a build-time flag.
export function useAppNewsletterConfig(): AppNewsletterConfigDto | null {
    const { data } = useAppConfig();
    return data?.newsletter?.enabled ? data.newsletter : null;
}

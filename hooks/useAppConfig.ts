import { type QueryClient, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { revalidatePublicConfig } from '@/lib/api/publicConfigActions';
import type {
    AppBetaFeedbackConfigDto,
    AppConfigResponseDto,
    AppCoverageConfigDto,
    AppMediaConfigDto,
    AppNewsletterConfigDto,
    AppRsvpConfigDto,
    PlatformFeatureFlagResponseDto,
} from '@/lib/api/types';
import type { MemberRoleCatalog } from '@/lib/memberRoles';
import { presignedUrlRefreshMs } from '@/lib/presignedUrls';

export const appConfigKeys = {
    all: ['app-config'] as const,
};

// After an admin edit that changes public config: refetch it here and drop the
// server-cached copy the landing page renders from.
export function invalidatePublicConfig(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    revalidatePublicConfig().catch(() => {
        // Best-effort — the server copy still expires on its own.
    });
}

// The backend sends max-age=60, so a plain fetch could return the browser's
// stale copy after an admin edit. no-cache revalidates with the ETag instead,
// which costs a 304 when nothing changed.
export function fetchAppConfig(): Promise<AppConfigResponseDto> {
    return api.publicGet<AppConfigResponseDto>(endpoints.config.get, { cache: 'no-cache' });
}

// GET /api/config — public, read-only, and safe to cache aggressively.
export function useAppConfig(options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: appConfigKeys.all,
        queryFn: fetchAppConfig,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: options.enabled ?? true,
    });
}

export function useAppMediaConfig(): AppMediaConfigDto | null {
    const { data } = useAppConfig();
    return data?.media ?? null;
}

// How often a list carrying presigned media URLs must refetch so none of them expire.
export function usePresignedUrlRefreshMs(): number {
    return presignedUrlRefreshMs(useAppMediaConfig()?.presignedUrlTtlMinutes);
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

// Null while beta feedback is off (or config hasn't loaded): no report button.
export function useAppBetaFeedbackConfig(): AppBetaFeedbackConfigDto | null {
    const { data } = useAppConfig();
    return data?.betaFeedback?.enabled ? data.betaFeedback : null;
}

// Whether the crash reporter runs. A backend from before the split has no
// `errorTracking`; it still gated crashes on beta feedback.
export function useAppErrorTrackingEnabled(): boolean {
    const { data } = useAppConfig();
    return data?.errorTracking?.enabled ?? data?.betaFeedback?.enabled ?? false;
}

const EMPTY_MEMBER_ROLE_CATALOG: MemberRoleCatalog = {};

// Each event type's member role catalog, retired roles included.
export function useMemberRoleCatalog(): MemberRoleCatalog {
    const { data } = useAppConfig();
    return data?.memberRolesByEventType ?? EMPTY_MEMBER_ROLE_CATALOG;
}

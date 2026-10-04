'use client';

import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';

import { adminKeys } from '@/hooks/useAdmin';
import { useRefreshPlans } from '@/hooks/useAdminCoverageOptions';
import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { useSortOrderMove } from '@/hooks/useSortOrderMove';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    CoverageOptionResponseDto,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformEventTypeResponseDto,
    PlatformModuleResponseDto,
    ReactionTypeResponseDto,
} from '@/lib/api/types';

// The arrows of each admin catalog: what one row's sortOrder PATCH is, and what
// refetches afterwards. Every catalog also feeds /api/config.

type Resource = 'reaction-types' | 'paid-services' | 'platform-modules' | 'platform-event-types' | 'plan-tiers';

function useRefreshCatalog(resource: Resource, dataProviderName: string | undefined, queryKey: readonly unknown[]) {
    const queryClient = useQueryClient();
    const invalidate = useInvalidate();
    return () => {
        void invalidate({ resource, dataProviderName, invalidates: ['list'] });
        void queryClient.invalidateQueries({ queryKey });
        invalidatePublicConfig(queryClient);
    };
}

const idOf = (item: { id: string }) => item.id;
const moduleKeyOf = (item: PlatformModuleResponseDto) => item.moduleKey;
const eventTypeKeyOf = (item: PlatformEventTypeResponseDto) => item.eventTypeKey;

export function useReactionTypeMove(items: ReactionTypeResponseDto[]) {
    return useSortOrderMove({
        items,
        idOf,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.reactionTypes.byId(id), { sortOrder }),
        refresh: useRefreshCatalog('reaction-types', 'reaction-types', ['admin', 'reaction-types']),
    });
}

export function usePaidServiceMove(items: PaidServiceResponseDto[]) {
    return useSortOrderMove({
        items,
        idOf,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.paidServices.byId(id), { sortOrder }),
        refresh: useRefreshCatalog('paid-services', undefined, ['admin', 'paid-services']),
    });
}

export function usePlatformModuleMove(items: PlatformModuleResponseDto[]) {
    return useSortOrderMove({
        items,
        idOf: moduleKeyOf,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.platformModules.byKey(id), { sortOrder }),
        refresh: useRefreshCatalog('platform-modules', 'platform-modules', adminKeys.platformModules),
    });
}

export function usePlatformEventTypeMove(items: PlatformEventTypeResponseDto[]) {
    return useSortOrderMove({
        items,
        idOf: eventTypeKeyOf,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.platformEventTypes.byKey(id), { sortOrder }),
        refresh: useRefreshCatalog('platform-event-types', 'platform-event-types', adminKeys.platformEventTypes),
    });
}

export function usePlanTierMove(items: PlanTierResponseDto[]) {
    return useSortOrderMove({
        items,
        idOf,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.planTiers.byId(id), { sortOrder }),
        refresh: useRefreshCatalog('plan-tiers', 'plan-tiers', adminKeys.all),
    });
}

export function useCoverageOptionMove(planTierId: string, items: CoverageOptionResponseDto[]) {
    return useSortOrderMove({
        items,
        idOf,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.planTiers.coverageOption(planTierId, id), { sortOrder }),
        refresh: useRefreshPlans(),
    });
}

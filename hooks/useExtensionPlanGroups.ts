'use client';

import { useMemo } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminEventTypeLabel } from '@/hooks/useAdminEventTypeLabel';
import { extensionPlanGroups } from '@/lib/adminExtensions';
import type { PlanTierResponseDto } from '@/lib/api/types';

// The event plans grouped under their event type's name, in the registry's
// order, for the extension picker and the Paid services plan filter.
export function useExtensionPlanGroups(plans: PlanTierResponseDto[]) {
    const eventTypesQuery = useAdminPlatformEventTypes();
    const eventTypeLabel = useAdminEventTypeLabel();

    const groups = useMemo(() => {
        const order = [...(eventTypesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder).map((type) => type.eventTypeKey);
        return extensionPlanGroups(plans, order).map((group) => ({ ...group, label: eventTypeLabel(group.eventTypeKey) }));
    }, [eventTypeLabel, eventTypesQuery.data, plans]);

    return { groups, eventTypeLabel };
}

export type LabeledExtensionPlanGroup = ReturnType<typeof useExtensionPlanGroups>['groups'][number];

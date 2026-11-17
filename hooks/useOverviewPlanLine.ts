'use client';

import { useTranslations } from 'next-intl';

import type { EventUsageResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { routes } from '@/lib/routes';
import { hasProAllowance } from '@/lib/vendors';

/** The plan line under the Before and On the day journeys: plan name, storage used, and the Pro meter. */
export function useOverviewPlanLine(eventId: string, planName: string | null, usage: EventUsageResponseDto | null) {
    const t = useTranslations('ManagePage');
    if (!usage || !planName) return null;
    const used = formatBytes(usage.storageBytes);
    return {
        planName,
        usage: usage.storageLimitBytes === null ? used : t('journey.storage', { used, limit: formatBytes(usage.storageLimitBytes) }),
        percent: usage.storageLimitBytes === null ? null : usage.storagePercent,
        href: routes.events.manage(eventId, { tab: 'billing' }),
        showPro: hasProAllowance(usage),
        proUsedBytes: usage.proUsedBytes ?? 0,
        proAllowanceBytes: usage.proStorageBytes ?? 0,
    };
}

export type OverviewPlanLine = NonNullable<ReturnType<typeof useOverviewPlanLine>>;

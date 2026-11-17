'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useBillingDate } from '@/hooks/useEventBillingPanel';
import type { DiscountSummaryDto, EventScheduleDto, EventUsageResponseDto } from '@/lib/api/types';
import { formatBytes, numberFormat } from '@/lib/format';

// One usage line on the plan card: what is used, the limit (null: no limit) and the bar's fill.
export type BillingUsageMeterData = { key: 'storage' | 'members'; label: string; usedLabel: string; limitLabel: string | null; percent: number };

/** The event's active code, which later upgrades inherit too. Null when it has none. */
export function useBillingDiscountLine(discount: DiscountSummaryDto | null): string | null {
    const t = useTranslations('EventPlanSettingsPage');
    if (!discount) return null;
    return discount.discountPercent === null ? discount.label : t('yourPlan.discount', { label: discount.label, discount: discount.discountPercent });
}

/**
 * The Your plan card's facts: the coverage end pinned at activation, then storage and
 * members against the limits that actually gate uploads and guests. Limits come from
 * usage, not the plan, because storage packs raise the storage limit above the plan's own.
 */
export function useBillingPlanCard(schedule: EventScheduleDto, usage: EventUsageResponseDto | null) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const formatDate = useBillingDate();

    const keptUntil = schedule.coverageEndsAt ? formatDate(schedule.coverageEndsAt) : null;
    const meters = useMemo<BillingUsageMeterData[]>(() => {
        if (!usage) return [];
        const count = numberFormat(locale).format;
        return [
            {
                key: 'storage',
                label: t('compare.storage'),
                usedLabel: formatBytes(usage.storageBytes),
                limitLabel: usage.storageLimitBytes === null ? null : formatBytes(usage.storageLimitBytes),
                percent: usage.storagePercent,
            },
            {
                key: 'members',
                label: t('compare.members'),
                usedLabel: count(usage.memberCount),
                limitLabel: usage.memberLimit === null ? null : count(usage.memberLimit),
                percent: usage.memberPercent,
            },
        ];
    }, [locale, t, usage]);

    return { keptUntil, meters };
}

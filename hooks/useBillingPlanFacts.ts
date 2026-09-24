'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useBillingDate } from '@/hooks/useEventBillingPanel';
import type { DiscountSummaryDto, EventScheduleDto, EventUsageResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';

export type BillingPlanFact = { key: string; label: string; value: string };

/**
 * The plan summary's facts: the coverage end pinned at activation, then the
 * limits that actually gate uploads and guests. Limits come from usage, not the
 * plan, because storage packs raise the storage limit above the plan's own.
 */
/** The event's active code, which later upgrades inherit too. Null when it has none. */
export function useBillingDiscountLine(discount: DiscountSummaryDto | null): string | null {
    const t = useTranslations('EventPlanSettingsPage');
    if (!discount) return null;
    return discount.discountPercent === null ? discount.label : t('yourPlan.discount', { label: discount.label, discount: discount.discountPercent });
}

export function useBillingPlanFacts(schedule: EventScheduleDto, usage: EventUsageResponseDto | null): BillingPlanFact[] {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const formatDate = useBillingDate();

    return useMemo(() => {
        const facts: BillingPlanFact[] = [];
        if (schedule.coverageEndsAt) {
            facts.push({ key: 'keptUntil', label: t('coverage.keptUntil'), value: formatDate(schedule.coverageEndsAt) });
        }
        if (usage) {
            facts.push({
                key: 'storage',
                label: t('compare.storage'),
                value: usage.storageLimitBytes === null ? t('compare.unlimited') : formatBytes(usage.storageLimitBytes),
            });
            facts.push({
                key: 'members',
                label: t('compare.members'),
                value: usage.memberLimit === null ? t('compare.unlimited') : new Intl.NumberFormat(locale).format(usage.memberLimit),
            });
        }
        return facts;
    }, [formatDate, locale, schedule.coverageEndsAt, t, usage]);
}

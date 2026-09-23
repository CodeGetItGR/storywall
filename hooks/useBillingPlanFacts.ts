'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useBillingDate } from '@/hooks/useEventBillingPanel';
import type { EventScheduleDto, EventUsageResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';

export type BillingPlanFact = { key: string; label: string; value: string };

/**
 * The plan summary's facts: the coverage dates pinned at activation, then the
 * limits that actually gate uploads and guests. Limits come from usage, not the
 * plan, because storage packs raise the storage limit above the plan's own.
 */
export function useBillingPlanFacts(schedule: EventScheduleDto, usage: EventUsageResponseDto | null): BillingPlanFact[] {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const formatDate = useBillingDate();

    return useMemo(() => {
        const facts: BillingPlanFact[] = [];
        if (schedule.galleryOpensAt) {
            facts.push({ key: 'galleryOpens', label: t('coverage.galleryOpens'), value: formatDate(schedule.galleryOpensAt) });
        }
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
    }, [formatDate, locale, schedule.coverageEndsAt, schedule.galleryOpensAt, t, usage]);
}

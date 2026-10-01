'use client';

import { useLocale, useTranslations } from 'next-intl';

import { PlatformMetricBar } from '@/components/admin/PlatformMetricBar';
import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { PlatformMetricGroup } from '@/components/admin/PlatformMetricGroup';
import { ratioOf } from '@/lib/adminUtils';
import type { PlatformMetricsResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatBytes, formatPercent } from '@/lib/format';

const DETAIL_KEYS = ['paidUsedBytes', 'freeUsedBytes', 'pendingPurgeBytes', 'purchasedExtraBytes'] as const;

export function PlatformStorageGroup({ storage }: { storage: PlatformMetricsResponseDto['storage'] }) {
    const t = useTranslations('AdminPage.metrics.storage');
    const locale = useLocale();
    const usedRatio = ratioOf(storage.usedBytes, storage.committedBytes);

    return (
        <PlatformMetricGroup title={t('title')}>
            {/* Usage and cost */}
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-10">
                <div className="min-w-0">
                    <PlatformMetricFigure size="lg" label={t('usedBytes')} value={formatBytes(storage.usedBytes)} />
                    <div className="mt-3 flex items-center gap-3">
                        <PlatformMetricBar ratio={usedRatio} className="flex-1" />
                        <span className="shrink-0 text-xs text-ink-faint tabular-nums">
                            {t('usedOfCommitted', { percent: formatPercent(locale, usedRatio), committed: formatBytes(storage.committedBytes) })}
                        </span>
                    </div>
                </div>
                <PlatformMetricFigure
                    size="lg"
                    mono
                    label={t('estimatedMonthlyCostMinor')}
                    value={t('approx', { amount: formatMoney(locale, storage.estimatedMonthlyCostMinor, storage.costCurrency) })}
                />
            </div>

            {/* Details */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {DETAIL_KEYS.map((key) => (
                    <PlatformMetricFigure key={key} label={t(key)} value={formatBytes(storage[key])} />
                ))}
            </div>
        </PlatformMetricGroup>
    );
}

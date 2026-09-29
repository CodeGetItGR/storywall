'use client';

import { useLocale, useTranslations } from 'next-intl';

import { PlatformMetricBar } from '@/components/admin/PlatformMetricBar';
import type { MetricShare } from '@/lib/adminUtils';
import { formatCount, formatPercent } from '@/lib/format';

export function PlatformMetricBreakdown({ title, shares }: { title: string; shares: MetricShare[] }) {
    const t = useTranslations('AdminPage.metrics');
    const locale = useLocale();

    return (
        <div>
            <h3 className="mb-2 text-xs font-semibold text-ink-muted">{title}</h3>
            {shares.length === 0 ? (
                <p className="text-sm text-ink-faint">{t('empty')}</p>
            ) : (
                <ul className="space-y-2">
                    {shares.map((share) => (
                        <li key={share.key} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3">
                            <span className="truncate font-mono text-xs font-bold text-ink" title={share.key}>
                                {share.key}
                            </span>
                            <PlatformMetricBar ratio={share.ratio} />
                            <span className="w-20 text-right text-sm tabular-nums">
                                <span className="font-bold text-ink">{formatCount(share.value)}</span>
                                <span className="ml-1.5 text-xs text-ink-faint">{formatPercent(locale, share.ratio)}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

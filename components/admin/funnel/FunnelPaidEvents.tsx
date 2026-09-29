'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FunnelFigures } from '@/components/admin/funnel/FunnelFigures';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { PlatformMetricBar } from '@/components/admin/PlatformMetricBar';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { rateOf } from '@/lib/adminFunnel';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

const ATTACH_KEYS = ['withUpgrade', 'withStoragePack', 'withExtension'] as const;

export function FunnelPaidEvents({ paidEvents }: { paidEvents: FunnelMetricsResponseDto['paidEvents'] }) {
    const t = useTranslations('AdminPage.funnel.paidEvents');
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('title')} window="payment">
            {/* Usage */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
                <FunnelFigures
                    className="lg:grid-cols-3"
                    figures={[
                        { key: 'count', label: t('count'), value: format.count(paidEvents.count) },
                        { key: 'ended', label: t('ended'), value: format.count(paidEvents.ended) },
                        { key: 'endedWithoutGuests', label: t('endedWithoutGuests'), value: format.count(paidEvents.endedWithoutGuests) },
                        { key: 'medianGuests', label: t('medianGuests'), value: format.median(paidEvents.medianGuests), hint: t('medianScope') },
                        { key: 'medianUploads', label: t('medianUploads'), value: format.median(paidEvents.medianUploads), hint: t('medianScope') },
                    ]}
                />

                {/* Paid but unused */}
                <div className="rounded-lg bg-status-warn-wash p-4 text-status-warn">
                    <p className="flex items-center gap-1.5 text-xs font-bold">
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('endedWithoutUploads')}
                    </p>
                    <p className="mt-1 text-3xl font-extrabold tabular-nums">{format.count(paidEvents.endedWithoutUploads)}</p>
                    <p className="mt-0.5 text-xs">{t('endedWithoutUploadsHint', { percent: format.rate(rateOf(paidEvents.endedWithoutUploads, paidEvents.ended)) })}</p>
                </div>
            </div>

            {/* Add-ons */}
            <h3 className="mt-6 mb-2 text-xs font-semibold text-ink-muted">{t('attachTitle')}</h3>
            <ul className="space-y-2">
                {ATTACH_KEYS.map((key) => {
                    const ratio = rateOf(paidEvents[key], paidEvents.count);
                    return (
                        <li key={key} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3">
                            <span className="truncate text-sm text-ink">{t(key)}</span>
                            <PlatformMetricBar ratio={ratio ?? 0} />
                            <span className="w-24 text-right text-sm tabular-nums">
                                <span className="font-bold text-ink">{format.count(paidEvents[key])}</span>
                                <span className="ml-1.5 text-xs text-ink-faint">{format.rate(ratio)}</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </FunnelGroup>
    );
}

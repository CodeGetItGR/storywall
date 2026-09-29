'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { rateOf } from '@/lib/adminFunnel';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

export function FunnelHeadline({ funnel }: { funnel: FunnelMetricsResponseDto['funnel'] }) {
    const t = useTranslations('AdminPage.funnel.headline');
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('title')} window="signup">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] md:items-end">
                {/* Hero */}
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-muted">{t('paidHost')}</p>
                    <p className="mt-1 text-5xl font-extrabold tracking-tight text-ink tabular-nums">{format.count(funnel.paidHost)}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                        {t('paidRate', { percent: format.rate(rateOf(funnel.paidHost, funnel.signedUp)), signedUp: format.count(funnel.signedUp) })}
                    </p>
                </div>

                {/* Secondary measures */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <PlatformMetricFigure label={t('engagedHost')} value={format.count(funnel.engagedHost)} />
                    <PlatformMetricFigure label={t('repeatPaidHost')} value={format.count(funnel.repeatPaidHost)} />
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-muted">
                            {t('adminSettledHost')}{' '}
                            <button
                                type="button"
                                title={t('adminSettledInfo')}
                                aria-label={t('adminSettledInfo')}
                                className="inline-flex align-[-2px] text-ink-faint hover:text-ink"
                            >
                                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </p>
                        <p className="mt-1 text-lg font-bold tracking-tight text-ink tabular-nums">{format.count(funnel.adminSettledHost)}</p>
                    </div>
                </div>
            </div>
        </FunnelGroup>
    );
}

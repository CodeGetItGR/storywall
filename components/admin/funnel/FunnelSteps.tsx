'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { PlatformMetricBar } from '@/components/admin/PlatformMetricBar';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { funnelSteps, rateOf } from '@/lib/adminFunnel';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

export function FunnelSteps({ funnel }: { funnel: FunnelMetricsResponseDto['funnel'] }) {
    const t = useTranslations('AdminPage.funnel.steps');
    const format = useFunnelFormat();
    const steps = useMemo(() => funnelSteps(funnel), [funnel]);
    const engagedShare = rateOf(funnel.engagedHost, funnel.signedUp);

    return (
        <FunnelGroup title={t('title')} window="signup">
            <ol className="space-y-4">
                {steps.map((step) => (
                    <li key={step.key} className="grid gap-1.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,19rem)] sm:items-center sm:gap-4">
                        <span className="text-sm font-semibold text-ink">{t(step.key)}</span>
                        <PlatformMetricBar ratio={step.share} className="h-3" />
                        <span className="flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums sm:justify-end">
                            <span className="font-bold text-ink">{format.count(step.count)}</span>
                            {step.key !== 'signedUp' && (
                                <span className="text-xs text-ink-faint">
                                    {t('ofPrevious', { percent: format.rate(step.ofPrevious) })} · {t('ofSignups', { percent: format.rate(step.ofSignups) })}
                                </span>
                            )}
                        </span>
                    </li>
                ))}

                {/* Engaged hosts: shown beside the paid step, not a step of its own */}
                <li className="grid gap-1.5 border-l-2 border-dashed border-status-good pl-3 sm:ml-40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                    <span className="text-sm text-ink-muted">
                        <span className="font-semibold text-ink">{t('engagedHost')}</span> · {t('engagedHint')}
                    </span>
                    <span className="flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums sm:justify-end">
                        <span className="font-bold text-ink">{format.count(funnel.engagedHost)}</span>
                        <span className="text-xs text-ink-faint">{t('ofSignups', { percent: format.rate(engagedShare) })}</span>
                    </span>
                </li>
            </ol>
        </FunnelGroup>
    );
}

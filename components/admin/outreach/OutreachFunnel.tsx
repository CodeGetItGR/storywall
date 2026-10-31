'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { OutreachGroup } from '@/components/admin/outreach/OutreachGroup';
import { PlatformMetricBar } from '@/components/admin/PlatformMetricBar';
import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import { outreachFunnelSteps } from '@/lib/adminOutreach';
import type { OutreachSummaryDto } from '@/lib/api/types';

export function OutreachFunnel({ summary }: { summary: OutreachSummaryDto }) {
    const t = useTranslations('AdminPage.outreach.funnel');
    const format = useOutreachFormat();
    const steps = useMemo(() => outreachFunnelSteps(summary), [summary]);

    return (
        <OutreachGroup
            title={t('title')}
            caption={summary.total > 0 ? t('caption', { total: summary.total, contacted: summary.contacted }) : t('captionEmpty')}
        >
            {/* Steps */}
            <ol className="space-y-3">
                {steps.map((step) => (
                    <li key={step.key} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_4.5rem] items-center gap-3">
                        <span className="truncate text-sm font-semibold text-ink">{t(step.key)}</span>
                        <PlatformMetricBar ratio={step.share ?? 0} className="h-2.5" />
                        <span className="text-right text-sm tabular-nums">
                            <span className="font-bold text-ink">{format.count(step.count)}</span>
                            <span className="ml-1.5 text-xs text-ink-faint">{format.rate(step.share)}</span>
                        </span>
                    </li>
                ))}
            </ol>
        </OutreachGroup>
    );
}

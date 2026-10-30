'use client';

import { useTranslations } from 'next-intl';

import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import { outreachReplyRate } from '@/lib/adminOutreach';
import type { OutreachSummaryDto } from '@/lib/api/types';

export function OutreachSummaryStrip({ summary }: { summary: OutreachSummaryDto }) {
    const t = useTranslations('AdminPage.outreach.summary');
    const format = useOutreachFormat();

    return (
        <section aria-label={t('label')} className="@container rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-4 @lg:grid-cols-3 @3xl:grid-cols-6">
                {/* Prospects */}
                <PlatformMetricFigure
                    label={t('prospects')}
                    value={format.count(summary.total)}
                    hint={t('topPriority', { count: summary.topPriority })}
                />
                {/* Contacted */}
                <PlatformMetricFigure label={t('contacted')} value={format.count(summary.contacted)} />
                {/* Replied */}
                <PlatformMetricFigure
                    label={t('replied')}
                    value={format.count(summary.replied)}
                    hint={t('replyRate', { rate: format.rate(outreachReplyRate(summary)) })}
                />
                {/* Meetings */}
                <PlatformMetricFigure label={t('meetings')} value={format.count(summary.meetings)} />
                {/* Partners */}
                <PlatformMetricFigure label={t('partners')} value={format.count(summary.partners)} />
                {/* Follow-ups due */}
                <PlatformMetricFigure
                    label={t('followupsDue')}
                    value={format.count(summary.followupsDue)}
                    hint={summary.followupsDue > 0 ? t('followupsDueHint') : undefined}
                />
            </div>
        </section>
    );
}

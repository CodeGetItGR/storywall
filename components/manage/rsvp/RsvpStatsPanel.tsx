'use client';

import { useTranslations } from 'next-intl';

import { MetricStrip } from '@/components/ui/MetricStrip';

const categories = ['ATTENDING', 'DECLINED'] as const;

export function RsvpStatsPanel({
    daysToGo,
    responseCount,
    seatsClaimed,
    adultsTotal,
    kidsTotal,
    peopleByStatus,
}: {
    daysToGo: number;
    responseCount: number;
    seatsClaimed: number;
    adultsTotal: number;
    kidsTotal: number;
    peopleByStatus: Record<'ATTENDING' | 'DECLINED', number>;
}) {
    const t = useTranslations('ManagePage');
    const peopleTotal = peopleByStatus.ATTENDING + peopleByStatus.DECLINED;

    return (
        <div className="flex flex-col gap-5">
            <p className="text-sm text-ink-muted">{t('rsvpStats.daysToGo', { count: daysToGo })}</p>

            {/* Headline numbers */}
            <MetricStrip
                items={[
                    { key: 'responses', label: t('rsvpStats.responses'), value: responseCount },
                    { key: 'people', label: t('rsvpStats.totalPeople'), value: seatsClaimed },
                    { key: 'adults', label: t('rsvpStats.adults'), value: adultsTotal },
                    { key: 'kids', label: t('rsvpStats.kids'), value: kidsTotal },
                ]}
            />

            {/* Attendance by category */}
            <div className="p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">{t('rsvpStats.byCategory')}</p>
                <div className="flex flex-col gap-3">
                    {categories.map((status) => {
                        const count = peopleByStatus[status];
                        if (count === 0) return null;
                        const percent = peopleTotal === 0 ? 0 : Math.round((count / peopleTotal) * 100);

                        return (
                            <div key={status}>
                                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                                    <span className="text-ink-muted">{t(`rsvpBreakdown.${status.toLowerCase()}`)}</span>
                                    <span className="font-bold tabular-nums text-ink">
                                        {count} <span className="font-normal text-ink-faint">{percent}%</span>
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

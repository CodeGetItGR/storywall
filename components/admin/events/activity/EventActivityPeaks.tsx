'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { type Peak, wallClockDate } from '@/lib/adminEventActivity';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

// The three busiest single hours of the whole event.
export function EventActivityPeaks({ peaks }: { peaks: Peak[] }) {
    const t = useTranslations('AdminPage.events.activity');
    const locale = useLocale();
    const { count } = useFunnelFormat();

    return (
        <section className="space-y-3">
            {/* Header */}
            <h3 className="text-sm font-semibold text-ink">{t('peaks.title')}</h3>
            {/* Ranking */}
            <ol className="space-y-2.5">
                {peaks.map((peak, index) => (
                    <li key={peak.hour} className="flex items-center gap-3 text-sm">
                        <span
                            aria-hidden="true"
                            className={cn(
                                'inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] tabular-nums',
                                index === 0 ? 'bg-ink font-semibold text-card' : 'bg-card text-ink-muted',
                            )}
                        >
                            {index + 1}
                        </span>
                        <span className="flex-1 text-ink">
                            {formatDate(locale, wallClockDate(peak.hour), { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                        </span>
                        <span className="font-semibold text-ink tabular-nums">{count(peak.total)}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}

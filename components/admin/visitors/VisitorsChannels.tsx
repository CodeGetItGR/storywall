'use client';

import { useLocale, useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { formatPer100, isFewVisits, signupsPer100Visits } from '@/lib/adminVisitors';
import type { VisitorMetricsDto } from '@/lib/api/types';

export function VisitorsChannels({ rows }: { rows: VisitorMetricsDto['channels'] }) {
    const t = useTranslations('AdminPage.visitors');
    const tChannel = useTranslations('AdminPage.signupChannel');
    const locale = useLocale();
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('channels.title')} window="visit">
            {rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table aria-label={t('channels.title')} className="w-full min-w-[520px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="py-2 pr-3 font-bold">{t('channels.channel')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('channels.visits')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('channels.signups')}</th>
                                <th className="py-2 pl-3 text-right font-bold">{t('channels.per100')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const few = isFewVisits(row.visits);
                                return (
                                    <tr key={row.channel} className="border-b border-border last:border-b-0">
                                        {/* Channel */}
                                        <td className="py-2 pr-3 text-ink">
                                            <span className="inline-flex flex-wrap items-center gap-2">
                                                {tChannel(row.channel)}
                                                {few && (
                                                    <span className="rounded-full bg-status-neutral-wash px-2 py-0.5 text-[11px] font-semibold text-status-neutral">
                                                        {t('channels.fewVisits')}
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        {/* Counts */}
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.visits)}</td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.signups)}</td>
                                        {/* Rate */}
                                        <td className="py-2 pl-3 text-right font-mono tabular-nums">
                                            {formatPer100(locale, few ? null : signupsPer100Visits(row.signups, row.visits))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </FunnelGroup>
    );
}

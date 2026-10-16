'use client';

import { useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { EMPTY_VALUE, FEW_SIGNUPS } from '@/lib/adminFunnel';
import type { FunnelChannelRowDto } from '@/lib/api/types';

export function FunnelChannels({ rows }: { rows: FunnelChannelRowDto[] }) {
    const t = useTranslations('AdminPage.funnel.channels');
    const tChannel = useTranslations('AdminPage.signupChannel');
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('title')} window="signup">
            {rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table aria-label={t('title')} className="w-full min-w-[560px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="py-2 pr-3 font-bold">{t('columns.channel')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('columns.signedUp')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('columns.createdEvent')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('columns.paidHost')}</th>
                                <th className="py-2 pl-3 text-right font-bold">{t('columns.revenue')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const revenue = Object.entries(row.revenueMinorByCurrency);
                                return (
                                    <tr key={row.channel} className="border-b border-border last:border-b-0">
                                        {/* Channel */}
                                        <td className="py-2 pr-3 text-ink">
                                            <span className="inline-flex flex-wrap items-center gap-2">
                                                {tChannel(row.channel)}
                                                {row.signedUp < FEW_SIGNUPS && (
                                                    <span className="rounded-full bg-status-neutral-wash px-2 py-0.5 text-[11px] font-semibold text-status-neutral">
                                                        {t('fewSignups')}
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        {/* Counts */}
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.signedUp)}</td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.createdEvent)}</td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.paidHost)}</td>
                                        {/* Revenue */}
                                        <td className="py-2 pl-3 text-right font-mono tabular-nums">
                                            {revenue.length ? revenue.map(([currency, minor]) => format.money(minor, currency)).join(' · ') : EMPTY_VALUE}
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

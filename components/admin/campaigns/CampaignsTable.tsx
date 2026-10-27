'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { EMPTY_VALUE } from '@/lib/adminFunnel';
import type { CampaignRowDto } from '@/lib/api/types';
import { campaignRowKey } from '@/lib/campaignLinks';

export function CampaignsTable({ rows, onLinkAction }: { rows: CampaignRowDto[]; onLinkAction: (event: MouseEvent<HTMLButtonElement>) => void }) {
    const t = useTranslations('AdminPage.campaigns');
    const format = useFunnelFormat();

    return (
        <div className="overflow-x-auto">
            <table aria-label={t('title')} className="w-full min-w-[760px] border-collapse text-left text-sm">
                {/* Columns */}
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-4 py-3 font-bold">{t('columns.name')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.source')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.campaign')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.signedUp')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.createdEvent')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.paidHost')}</th>
                        <th className="px-4 py-3 text-right font-bold">{t('columns.revenue')}</th>
                    </tr>
                </thead>

                {/* Rows */}
                <tbody>
                    {rows.map((row) => {
                        const revenue = Object.entries(row.revenueMinorByCurrency);
                        return (
                            <tr key={campaignRowKey(row)} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                                {/* Name */}
                                <td className="px-4 py-3">
                                    {row.link ? (
                                        <button
                                            type="button"
                                            data-link-id={row.link.id}
                                            onClick={onLinkAction}
                                            className="text-left font-semibold text-ink underline-offset-2 hover:underline"
                                        >
                                            {row.link.name}
                                        </button>
                                    ) : (
                                        <span className="text-ink-faint">{t('notSaved')}</span>
                                    )}
                                </td>
                                {/* Values */}
                                <td className="px-3 py-3 font-mono text-xs text-ink-muted">
                                    {row.utmSource ?? EMPTY_VALUE} / {row.utmMedium ?? EMPTY_VALUE}
                                </td>
                                <td className="px-3 py-3 font-mono text-xs text-ink-muted">{row.utmCampaign ?? EMPTY_VALUE}</td>
                                {/* Counts */}
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.signedUp)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.createdEvent)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.paidHost)}</td>
                                {/* Revenue */}
                                <td className="px-4 py-3 text-right font-mono tabular-nums">
                                    {revenue.length ? revenue.map(([currency, minor]) => format.money(minor, currency)).join(' · ') : EMPTY_VALUE}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

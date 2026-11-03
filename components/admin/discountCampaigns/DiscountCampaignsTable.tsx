'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { SiteNoticeStatusPill } from '@/components/admin/siteNotices/SiteNoticePills';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { numberFormat } from '@/lib/format';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function DiscountCampaignsTable({
    campaigns,
    onEditAction,
}: {
    campaigns: AdminDiscountCampaignDto[];
    onEditAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.discountCampaigns');
    const locale = useLocale();

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                {/* Columns */}
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-4 py-3 font-bold">{t('columns.name')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.percent')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.status')}</th>
                        <th className="hidden px-3 py-3 font-bold lg:table-cell">{t('columns.dates')}</th>
                        <th className="w-10 px-2 py-3" />
                    </tr>
                </thead>

                {/* Rows */}
                <tbody>
                    {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                            <td className="w-full max-w-0 px-4 py-3">
                                <span className="block truncate text-ink">{campaign.name}</span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{numberFormat(locale).format(campaign.percent)}</td>
                            <td className="px-3 py-3">
                                <SiteNoticeStatusPill status={campaign.status} />
                            </td>
                            <td className="hidden px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted lg:table-cell">
                                {formatDate(locale, campaign.startsAt, DATE_FORMAT)} → {formatDate(locale, campaign.endsAt, DATE_FORMAT)}
                            </td>
                            <td className="px-2 py-3">
                                <button
                                    type="button"
                                    data-campaign-id={campaign.id}
                                    onClick={onEditAction}
                                    aria-label={`${t('editTitle')} ${campaign.name}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                >
                                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

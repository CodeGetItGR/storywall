'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { SiteNoticeStatusPill } from '@/components/admin/siteNotices/SiteNoticePills';
import { DISCOUNT_CAMPAIGNS_HASH_ROOT, formatRecordHash } from '@/lib/adminRecordRouting';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { numberFormat } from '@/lib/format';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function DiscountCampaignsTable({
    campaigns,
    onLinkAction,
    onRowAction,
}: {
    campaigns: AdminDiscountCampaignDto[];
    onLinkAction: (event: MouseEvent<HTMLAnchorElement>) => void;
    onRowAction: (event: MouseEvent<HTMLTableRowElement>) => void;
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
                    </tr>
                </thead>

                {/* Rows */}
                <tbody>
                    {campaigns.map((campaign) => (
                        <tr
                            key={campaign.id}
                            data-record-id={campaign.id}
                            onClick={onRowAction}
                            className="cursor-pointer border-b border-border last:border-b-0 hover:bg-canvas/55"
                        >
                            <td className="w-full max-w-0 px-4 py-3">
                                <a
                                    href={formatRecordHash(DISCOUNT_CAMPAIGNS_HASH_ROOT, campaign.id)}
                                    data-record-id={campaign.id}
                                    onClick={onLinkAction}
                                    className="block truncate font-semibold text-ink underline-offset-2 hover:underline"
                                >
                                    {campaign.name}
                                </a>
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{numberFormat(locale).format(campaign.percent)}</td>
                            <td className="px-3 py-3">
                                <SiteNoticeStatusPill status={campaign.status} />
                            </td>
                            <td className="hidden px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted lg:table-cell">
                                {formatDate(locale, campaign.startsAt, DATE_FORMAT)} → {formatDate(locale, campaign.endsAt, DATE_FORMAT)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

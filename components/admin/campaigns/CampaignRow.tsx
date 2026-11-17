'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { CampaignChange } from '@/components/admin/campaigns/CampaignChange';
import { CampaignDiscountBadge } from '@/components/admin/campaigns/CampaignDiscountBadge';
import { CampaignStatusBadge } from '@/components/admin/campaigns/CampaignStatusBadge';
import { CampaignTrend } from '@/components/admin/campaigns/CampaignTrend';
import { CampaignVerdict } from '@/components/admin/campaigns/CampaignVerdict';
import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import { CAMPAIGNS_HASH_ROOT, formatRecordHash } from '@/lib/adminRecordRouting';
import { type CampaignListRow, changeOf } from '@/lib/campaignCompare';

const COUNT_KEYS = ['visitors', 'signedUp', 'sales'] as const;

export function CampaignRow({
    row,
    compared,
    muted,
    onLinkClickAction,
    onRowClickAction,
}: {
    row: CampaignListRow;
    compared: string | null;
    muted: boolean;
    onLinkClickAction: (event: MouseEvent<HTMLAnchorElement>) => void;
    onRowClickAction: (event: MouseEvent<HTMLTableRowElement>) => void;
}) {
    const t = useTranslations('AdminPage.campaigns');
    const format = useCampaignFormat();
    const { campaign, current, previous, daily } = row.item;

    return (
        <tr
            data-testid="campaign-row"
            data-record-id={campaign.id}
            onClick={onRowClickAction}
            className="grid cursor-pointer grid-cols-3 gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 hover:bg-canvas sm:table-row sm:p-0"
        >
            {/* Campaign */}
            <td className="col-span-3 min-w-0 sm:px-4 sm:py-3">
                <a
                    href={formatRecordHash(CAMPAIGNS_HASH_ROOT, campaign.id)}
                    data-record-id={campaign.id}
                    onClick={onLinkClickAction}
                    className="font-semibold text-ink hover:underline"
                >
                    {campaign.name}
                </a>
                <div className="mt-1 flex flex-wrap gap-1.5">
                    <CampaignStatusBadge status={campaign.status} />
                    {campaign.discount && <CampaignDiscountBadge discount={campaign.discount} />}
                </div>
            </td>

            {/* Trend */}
            <td className="col-span-3 sm:px-4 sm:py-3">
                <CampaignTrend daily={daily} trend={row.trend} muted={muted} />
            </td>

            {/* Counts */}
            {COUNT_KEYS.map((key) => (
                <td key={key} className="sm:px-4 sm:py-3 sm:text-right">
                    <span className="block text-[11px] font-semibold text-ink-muted sm:hidden">{t(`columns.${key}`)}</span>
                    <span className="inline-flex items-baseline gap-1.5">
                        <span className="font-mono text-sm text-ink tabular-nums">{format.count(current[key])}</span>
                        <CampaignChange change={changeOf(current[key], previous?.[key])} compared={compared} />
                    </span>
                </td>
            ))}

            {/* Vs other campaigns */}
            <td className="col-span-3 sm:px-4 sm:py-3">
                <CampaignVerdict verdict={row.verdict} />
            </td>
        </tr>
    );
}

'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCampaignLinkShare } from '@/hooks/useCampaignLinkShare';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { CampaignRowDto } from '@/lib/api/types';
import { campaignShortUrl } from '@/lib/campaignLinks';

// One link of a campaign's set: its name, its visits, sales and a copy button.
export function CampaignSetLinkRow({ row }: { row: CampaignRowDto }) {
    const t = useTranslations('AdminPage.campaigns.share');
    const format = useFunnelFormat();
    const link = row.link;
    const { copied, handleCopyClick } = useCampaignLinkShare(link ? campaignShortUrl(link) : '', link?.name ?? '');
    if (!link) return null;

    return (
        <tr className="border-b border-border last:border-b-0">
            {/* Name */}
            <td className="w-full py-2 pr-3">
                <span className="block break-words text-ink">{link.name}</span>
            </td>

            {/* Visits */}
            <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.visits)}</td>

            {/* Sales */}
            <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.sales)}</td>
            <td className="px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                {format.moneyByCurrency(row.salesRevenueMinorByCurrency ?? {})}
            </td>

            {/* Copy */}
            <td className="py-2 pl-3">
                <button
                    type="button"
                    onClick={handleCopyClick}
                    aria-label={`${copied ? t('copied') : t('copy')} ${link.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                >
                    {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
                </button>
            </td>
        </tr>
    );
}

'use client';

import { useTranslations } from 'next-intl';

import { CampaignLinkCopyButton } from '@/components/admin/campaigns/CampaignLinkCopyButton';
import { CampaignPlatformIcon } from '@/components/admin/campaigns/CampaignPlatformIcon';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { CampaignRowDto } from '@/lib/api/types';
import { campaignSetLinkFormat, campaignSetLinkUrl } from '@/lib/campaignLinks';

// One link of a campaign's set: its placement, its visits, sales and a copy button. The platform
// shows as the icon, and screen readers get the link's full name.
export function CampaignSetLinkRow({ row }: { row: CampaignRowDto }) {
    const t = useTranslations('AdminPage.discountCampaigns.links.formats');
    const format = useFunnelFormat();
    const link = row.link;
    if (!link) return null;
    const placement = campaignSetLinkFormat(link);

    return (
        <tr className="border-b border-border last:border-b-0">
            {/* Name */}
            <td className="w-full py-2 pr-3">
                <div className="flex items-center gap-2">
                    <CampaignPlatformIcon source={row.utmSource} medium={row.utmMedium} />
                    {placement ? (
                        <>
                            <span aria-hidden="true" className="min-w-0 break-words text-ink">
                                {t(placement)}
                            </span>
                            <span className="sr-only">{link.name}</span>
                        </>
                    ) : (
                        <span className="min-w-0 break-words text-ink">{link.name}</span>
                    )}
                </div>
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
                <CampaignLinkCopyButton link={link} url={campaignSetLinkUrl(link)} />
            </td>
        </tr>
    );
}

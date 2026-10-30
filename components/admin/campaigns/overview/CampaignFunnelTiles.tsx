'use client';

import { useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { campaignFunnelTiles } from '@/lib/adminCampaignOverview';
import { EMPTY_VALUE } from '@/lib/adminFunnel';
import type { CampaignOverviewDto } from '@/lib/api/types';

export function CampaignFunnelTiles({ data }: { data: CampaignOverviewDto }) {
    const t = useTranslations('AdminPage.campaignOverview.tiles');
    const format = useFunnelFormat();
    // Null for marketing, who don't see revenue.
    const revenue = data.revenueMinorByCurrency && Object.entries(data.revenueMinorByCurrency);

    return (
        <FunnelGroup title={t('title')} window="visit">
            <div className="@container">
                <div className="grid grid-cols-2 gap-4 @xl:grid-cols-4">
                    {campaignFunnelTiles(data).map((tile) => (
                        <PlatformMetricFigure
                            key={tile.key}
                            label={t(tile.key)}
                            value={format.count(tile.value)}
                            hint={tile.share === null ? undefined : t('share', { rate: format.rate(tile.share) })}
                        />
                    ))}
                    {/* Revenue */}
                    {revenue && (
                        <PlatformMetricFigure
                            label={t('revenue')}
                            value={revenue.length ? revenue.map(([currency, minor]) => format.money(minor, currency)).join(' · ') : EMPTY_VALUE}
                        />
                    )}
                </div>
            </div>
        </FunnelGroup>
    );
}

'use client';

import { useTranslations } from 'next-intl';

import { CampaignChange } from '@/components/admin/campaigns/CampaignChange';
import { type CampaignValue, CampaignValueLabel } from '@/components/admin/campaigns/CampaignValueTip';
import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import type { CampaignCountsDto } from '@/lib/api/types';
import { changeOf, revenueChangeOf } from '@/lib/campaignCompare';

type CountTile = { key: 'visitors' | 'signedUp' | 'sales'; value: CampaignValue };

const COUNT_TILES: readonly CountTile[] = [
    { key: 'visitors', value: 'visitors' },
    { key: 'signedUp', value: 'signedUp' },
    { key: 'sales', value: 'sales' },
];

const TILE = 'min-w-0 rounded-xl bg-card px-4 py-3';

// Every campaign together in the range. The tab below doesn't change it.
export function CampaignSummary({
    current,
    previous,
    compared,
}: {
    current: CampaignCountsDto;
    previous: CampaignCountsDto | null;
    compared: string | null;
}) {
    const t = useTranslations('AdminPage.campaigns');
    const format = useCampaignFormat();
    const revenue = current.salesRevenueMinorByCurrency;
    const revenueChange = revenueChangeOf(revenue, previous?.salesRevenueMinorByCurrency);

    return (
        <section aria-label={t('title')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Counts */}
            {COUNT_TILES.map((tile) => (
                <div key={tile.key} className={TILE}>
                    <p className="text-xs font-semibold text-ink-muted">
                        <CampaignValueLabel value={tile.value} label={t(`columns.${tile.key}`)} />
                    </p>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-2xl font-semibold text-ink tabular-nums">{format.count(current[tile.key])}</span>
                        <CampaignChange change={changeOf(current[tile.key], previous?.[tile.key])} compared={compared} />
                    </p>
                </div>
            ))}

            {/* Revenue: what the range's sales paid. Left out for marketing. */}
            {revenue !== null && (
                <div className={TILE}>
                    <p className="text-xs font-semibold text-ink-muted">
                        <CampaignValueLabel value="salesRevenue" label={t('columns.revenue')} />
                    </p>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-2xl font-semibold text-ink tabular-nums">{format.moneyByCurrency(revenue)}</span>
                        {revenueChange && <CampaignChange change={revenueChange.change} compared={compared} currency={revenueChange.currency} />}
                    </p>
                </div>
            )}
        </section>
    );
}

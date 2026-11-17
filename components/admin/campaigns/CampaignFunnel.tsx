'use client';

import { useTranslations } from 'next-intl';

import { CampaignChange } from '@/components/admin/campaigns/CampaignChange';
import { CampaignValueLabel } from '@/components/admin/campaigns/CampaignValueTip';
import { CampaignVerdict } from '@/components/admin/campaigns/CampaignVerdict';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { PlatformMetricBar } from '@/components/admin/PlatformMetricBar';
import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import type { CampaignCountsDto } from '@/lib/api/types';
import type { CampaignFunnelRow, Change, MoneyChange, Verdict } from '@/lib/campaignCompare';

const RESULT_LABEL = 'text-xs font-semibold text-ink-muted';
const RESULT_VALUE = 'font-mono text-xl font-semibold text-ink tabular-nums';

// From visitors to paid, each step a bar out of the visitors with its change, then what it brought in
// and how it compares with the other campaigns.
export function CampaignFunnel({
    rows,
    current,
    salesChange,
    revenueChange,
    verdict,
    compared,
}: {
    rows: CampaignFunnelRow[];
    current: CampaignCountsDto;
    salesChange: Change | null;
    revenueChange: MoneyChange | null;
    verdict: Verdict | null;
    compared: string | null;
}) {
    const t = useTranslations('AdminPage.campaigns');
    const format = useCampaignFormat();
    const revenue = current.salesRevenueMinorByCurrency;

    return (
        <FunnelGroup title={t('funnel.title')} window="visit">
            {/* Steps */}
            <ol className="space-y-2.5">
                {rows.map((row) => (
                    <li
                        key={row.step}
                        className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
                    >
                        <span className="block min-w-0 text-sm leading-tight text-ink-muted">
                            <CampaignValueLabel value={row.step} label={t(`columns.${row.step}`)} />
                        </span>
                        <PlatformMetricBar ratio={row.width} />
                        <span className="flex items-baseline justify-end gap-2 whitespace-nowrap">
                            <span className="font-mono text-sm font-semibold text-ink tabular-nums">{format.count(row.value)}</span>
                            {row.share !== null && (
                                <span className="hidden font-mono text-xs text-ink-faint sm:inline">
                                    {t('funnel.share', { rate: format.rate(row.share) })}
                                </span>
                            )}
                            <CampaignChange change={row.change} compared={compared} />
                        </span>
                    </li>
                ))}
            </ol>

            {/* Results */}
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4 border-t border-border pt-4">
                <div>
                    <dt className={RESULT_LABEL}>
                        <CampaignValueLabel value="sales" label={t('columns.sales')} />
                    </dt>
                    <dd className="mt-1 flex items-baseline gap-2">
                        <span className={RESULT_VALUE}>{format.count(current.sales)}</span>
                        <CampaignChange change={salesChange} compared={compared} />
                    </dd>
                </div>

                {/* Revenue: left out for marketing */}
                {revenue !== null && (
                    <div>
                        <dt className={RESULT_LABEL}>
                            <CampaignValueLabel value="salesRevenue" label={t('columns.revenue')} />
                        </dt>
                        <dd className="mt-1 flex items-baseline gap-2">
                            <span className={RESULT_VALUE}>{format.moneyByCurrency(revenue)}</span>
                            {revenueChange && <CampaignChange change={revenueChange.change} compared={compared} currency={revenueChange.currency} />}
                        </dd>
                    </div>
                )}

                <div>
                    <dt className={RESULT_LABEL}>{t('columns.verdict')}</dt>
                    <dd className="mt-1">
                        <CampaignVerdict verdict={verdict} />
                    </dd>
                </div>
            </dl>
        </FunnelGroup>
    );
}

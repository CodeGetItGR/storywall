'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { CampaignRow } from '@/components/admin/campaigns/CampaignRow';
import { CampaignSummary } from '@/components/admin/campaigns/CampaignSummary';
import { CampaignTabs } from '@/components/admin/campaigns/CampaignTabs';
import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import { FunnelRangeControl } from '@/components/admin/funnel/FunnelRangeControl';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCampaignList } from '@/hooks/useCampaignList';
import type { useFunnelRange } from '@/hooks/useFunnelRange';
import { CAMPAIGN_RANGE_PRESETS } from '@/lib/adminFunnel';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CampaignTab } from '@/lib/campaignCompare';

const COLUMNS = ['campaign', 'trend', 'visitors', 'signedUp', 'sales', 'verdict'] as const;
const NUMBER_COLUMNS = new Set<string>(['visitors', 'signedUp', 'sales']);

export function CampaignListPage({
    range,
    tab,
    onTabChangeAction,
    onRecordLinkClickAction,
    onRecordRowClickAction,
}: {
    range: ReturnType<typeof useFunnelRange>;
    tab: CampaignTab;
    onTabChangeAction: (tab: CampaignTab) => void;
    onRecordLinkClickAction: (event: MouseEvent<HTMLAnchorElement>) => void;
    onRecordRowClickAction: (event: MouseEvent<HTMLTableRowElement>) => void;
}) {
    const t = useTranslations('AdminPage');
    const list = useCampaignList(range.bounds, tab);

    return (
        <>
            {/* Header */}
            <FunnelHeader title={t('campaigns.title')} updatedAt={list.updatedAt} isFetching={list.isFetching} onRefreshAction={list.refresh} />

            <div className="space-y-5">
                {/* Range */}
                <FunnelRangeControl range={range} presets={CAMPAIGN_RANGE_PRESETS} />

                {/* Summary */}
                {list.data && <CampaignSummary current={list.data.current} previous={list.data.previous} compared={list.compared} />}

                {/* Tabs */}
                <CampaignTabs tab={tab} onChangeAction={onTabChangeAction} />

                {/* Campaigns */}
                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    {list.isLoading && <LoadingState className="justify-start px-4 py-6" />}
                    {Boolean(list.error) && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(list.error)}`)}</p>}
                    {list.data && list.rows.length === 0 && (
                        <p className="px-4 py-6 text-sm text-ink-muted">{tab === 'current' ? t('campaigns.empty') : t('campaigns.pastEmpty')}</p>
                    )}
                    {list.rows.length > 0 && (
                        <table className="block w-full text-sm sm:table">
                            <thead className="hidden border-b border-border text-xs font-semibold text-ink-muted sm:table-header-group">
                                <tr>
                                    {COLUMNS.map((column) => (
                                        <th key={column} scope="col" className={NUMBER_COLUMNS.has(column) ? 'px-4 py-2.5 text-right' : 'px-4 py-2.5 text-left'}>
                                            {t(`campaigns.columns.${column}`)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="block sm:table-row-group">
                                {list.rows.map((row) => (
                                    <CampaignRow
                                        key={row.item.campaign.id}
                                        row={row}
                                        compared={list.compared}
                                        muted={tab === 'past'}
                                        onLinkClickAction={onRecordLinkClickAction}
                                        onRowClickAction={onRecordRowClickAction}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>
        </>
    );
}

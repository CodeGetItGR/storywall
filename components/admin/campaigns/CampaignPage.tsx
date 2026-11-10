'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { CampaignDailyChart } from '@/components/admin/campaigns/CampaignDailyChart';
import { CampaignFormDrawer } from '@/components/admin/campaigns/CampaignFormDrawer';
import { CampaignFunnel } from '@/components/admin/campaigns/CampaignFunnel';
import { CampaignHeader } from '@/components/admin/campaigns/CampaignHeader';
import { CampaignLinksDrawer } from '@/components/admin/campaigns/CampaignLinksDrawer';
import { CampaignPages } from '@/components/admin/campaigns/CampaignPages';
import { CampaignPlatforms } from '@/components/admin/campaigns/CampaignPlatforms';
import { CampaignSplits } from '@/components/admin/campaigns/CampaignSplits';
import { FunnelRangeControl } from '@/components/admin/funnel/FunnelRangeControl';
import { BackButton } from '@/components/ui/BackButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCampaignDetail } from '@/hooks/useCampaignDetail';
import type { CampaignDrawers } from '@/hooks/useCampaignsPage';
import type { useFunnelRange } from '@/hooks/useFunnelRange';
import { CAMPAIGN_RANGE_PRESETS } from '@/lib/adminFunnel';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CampaignTab } from '@/lib/campaignCompare';

// One campaign: is it paying off, which platforms bring people, and how its days went.
export function CampaignPage({
    id,
    range,
    tabHref,
    drawers,
    canEditDiscount,
    onBackAction,
    onNotFoundAction,
}: {
    id: string;
    range: ReturnType<typeof useFunnelRange>;
    tabHref: (tab: CampaignTab) => string;
    drawers: CampaignDrawers;
    canEditDiscount: boolean;
    onBackAction: (event: MouseEvent<HTMLAnchorElement>) => void;
    onNotFoundAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const detail = useCampaignDetail(id, range.bounds, onNotFoundAction);
    const { data, view } = detail;

    return (
        <div className="@container space-y-5">
            {/* Back */}
            <BackButton href={tabHref(detail.tab)} label={t('campaigns.back')} onClick={onBackAction} />

            {/* Header */}
            {data && (
                <CampaignHeader
                    campaign={data.campaign}
                    updatedAt={detail.updatedAt}
                    isFetching={detail.isFetching}
                    onRefreshAction={detail.refresh}
                    onLinksAction={drawers.openLinks}
                    onEditAction={drawers.openEdit}
                />
            )}

            {/* Range */}
            <FunnelRangeControl range={range} presets={CAMPAIGN_RANGE_PRESETS} />

            {/* Loading and errors */}
            {detail.isLoading && <LoadingState className="justify-start py-6" />}
            {Boolean(detail.error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(detail.error)}`)}</p>}

            {data && view && (
                <>
                    {/* Funnel */}
                    <CampaignFunnel
                        rows={view.funnel}
                        current={data.current}
                        salesChange={view.salesChange}
                        revenueChange={view.revenueChange}
                        verdict={view.verdict}
                        compared={detail.compared}
                    />

                    {/* Platforms */}
                    {view.platforms.length > 0 && <CampaignPlatforms rows={view.platforms} measure={view.measure} />}

                    {/* Visitors per day */}
                    <CampaignDailyChart rows={view.dailyRows} hasPrevious={data.previous !== null} />

                    {/* Language, device and landing page */}
                    <div className="grid gap-5 @3xl:grid-cols-2">
                        <CampaignSplits devices={data.devices} languages={data.languages} />
                        <CampaignPages pages={data.pages} />
                    </div>

                    {/* Edit */}
                    <CampaignFormDrawer
                        key={`edit-${drawers.token}`}
                        open={drawers.drawer === 'edit'}
                        campaign={data.campaign}
                        links={detail.links}
                        deletable={data.deletable}
                        canEditDiscount={canEditDiscount}
                        onCloseAction={drawers.close}
                        onCreatedAction={drawers.close}
                        onDeletedAction={drawers.handleDeleted}
                    />

                    {/* Links */}
                    <CampaignLinksDrawer
                        key={`links-${drawers.token}`}
                        open={drawers.drawer === 'links'}
                        campaign={data.campaign}
                        links={detail.links}
                        others={detail.others}
                        onCloseAction={drawers.close}
                    />
                </>
            )}
        </div>
    );
}

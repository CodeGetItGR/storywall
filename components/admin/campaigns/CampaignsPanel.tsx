'use client';

import { CampaignFormDrawer } from '@/components/admin/campaigns/CampaignFormDrawer';
import { CampaignListPage } from '@/components/admin/campaigns/CampaignListPage';
import { CampaignPage } from '@/components/admin/campaigns/CampaignPage';
import { useCampaignsPage } from '@/hooks/useCampaignsPage';
import type { CampaignLinkDto } from '@/lib/api/types';

const SHELL_CLASS = 'mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10';
const NO_LINKS: readonly CampaignLinkDto[] = [];

// Every campaign, compared with the period before and with each other, and one page per campaign.
// canEditDiscount is false for marketing, who see a discount but can't change it.
export function CampaignsPanel({ canEditDiscount }: { canEditDiscount: boolean }) {
    const c = useCampaignsPage();

    return (
        <div className={SHELL_CLASS}>
            {c.campaignId ? (
                // Remounted per campaign, so nothing of the last one shows while the next loads.
                <CampaignPage
                    key={c.campaignId}
                    id={c.campaignId}
                    range={c.range}
                    tabHref={c.tabHref}
                    drawers={c.drawers}
                    canEditDiscount={canEditDiscount}
                    onBackAction={c.handleBackClick}
                    onNotFoundAction={c.showList}
                />
            ) : (
                <CampaignListPage
                    range={c.range}
                    tab={c.tab}
                    onTabChangeAction={c.handleTabChange}
                    onNewCampaignAction={c.openNewCampaign}
                    onRecordLinkClickAction={c.handleRecordLinkClick}
                    onRecordRowClickAction={c.handleRecordRowClick}
                />
            )}

            {/* New campaign */}
            <CampaignFormDrawer
                key={`new-${c.drawers.token}`}
                open={c.drawers.drawer === 'new'}
                campaign={null}
                links={NO_LINKS}
                deletable={false}
                canEditDiscount={canEditDiscount}
                onCloseAction={c.drawers.close}
                onCreatedAction={c.openCampaign}
                onDeletedAction={c.drawers.close}
            />
        </div>
    );
}

'use client';

import { CampaignListPage } from '@/components/admin/campaigns/CampaignListPage';
import { useCampaignsPage } from '@/hooks/useCampaignsPage';

const SHELL_CLASS = 'mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10';

// Every campaign, compared with the period before and with each other.
export function CampaignsPanel() {
    const c = useCampaignsPage();

    return (
        <div className={SHELL_CLASS}>
            <CampaignListPage
                range={c.range}
                tab={c.tab}
                onTabChangeAction={c.handleTabChange}
                onRecordLinkClickAction={c.handleRecordLinkClick}
                onRecordRowClickAction={c.handleRecordRowClick}
            />
        </div>
    );
}

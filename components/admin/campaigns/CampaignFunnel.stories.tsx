import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import {
    campaignDetailFixture,
    campaignDetailForMarketingFixture,
    campaignListFixture,
    countsFixture,
} from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignFunnel } from '@/components/admin/campaigns/CampaignFunnel';
import type { CampaignDetailDto } from '@/lib/api/types';
import { campaignFunnel, changeOf, revenueChangeOf, verdictOf } from '@/lib/campaignCompare';

const OTHERS = campaignListFixture.items.filter((item) => item.campaign.id !== 'launch').map((item) => item.current);

// The funnel's props as the campaign page works them out.
function funnelOf({ current, previous }: Pick<CampaignDetailDto, 'current' | 'previous'>, compared: string | null) {
    return {
        rows: campaignFunnel(current, previous),
        current,
        salesChange: changeOf(current.sales, previous?.sales),
        revenueChange: revenueChangeOf(current.salesRevenueMinorByCurrency, previous?.salesRevenueMinorByCurrency),
        verdict: verdictOf(current, OTHERS),
        compared,
    };
}

const meta = {
    title: 'Admin/Campaigns/Funnel',
    component: CampaignFunnel,
    args: funnelOf(campaignDetailFixture, '17 Apr – 16 May'),
    decorators: [withAdminShell],
} satisfies Meta<typeof CampaignFunnel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ForMarketing: Story = { args: funnelOf(campaignDetailForMarketingFixture, '17 Apr – 16 May') };
// All time: no changes.
export const AllTime: Story = { args: funnelOf({ current: campaignDetailFixture.current, previous: null }, null) };
export const NoVisits: Story = { args: funnelOf({ current: countsFixture(), previous: countsFixture() }, '17 Apr – 16 May') };

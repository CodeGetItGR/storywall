import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { campaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignRow } from '@/components/admin/campaigns/CampaignRow';
import { type CampaignListRow, campaignListRows, type CampaignTab } from '@/lib/campaignCompare';

// A fixture campaign's row as its tab shows it.
function rowOf(tab: CampaignTab, id: string): CampaignListRow {
    const row = campaignListRows(campaignListFixture.items, tab).find((entry) => entry.item.campaign.id === id);
    if (!row) throw new Error(`No ${id} row on the ${tab} tab`);
    return row;
}

const meta = {
    title: 'Admin/Campaigns/Row',
    component: CampaignRow,
    args: { row: rowOf('current', 'launch'), compared: '17 Apr – 16 May', muted: false, onLinkClickAction: fn(), onRowClickAction: fn() },
    // A row sits in the list's table.
    decorators: [
        (Story) => (
            <table className="block w-full text-sm sm:table">
                <tbody className="block sm:table-row-group">
                    <Story />
                </tbody>
            </table>
        ),
        withAdminShell,
    ],
} satisfies Meta<typeof CampaignRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// A live discount, doing better than the others.
export const WithDiscount: Story = {};
export const Falling: Story = { args: { row: rowOf('current', 'autumn') } };
export const Scheduled: Story = { args: { row: rowOf('current', 'wedding-fair') } };
export const Ended: Story = { args: { row: rowOf('past', 'spring'), muted: true } };
export const Archived: Story = { args: { row: rowOf('past', 'old-bio'), muted: true } };

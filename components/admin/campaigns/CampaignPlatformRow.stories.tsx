import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { campaignDetailFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignPlatformRow } from '@/components/admin/campaigns/CampaignPlatformRow';
import { type CampaignPlatformRowData, campaignPlatformRows } from '@/lib/campaignCompare';
import type { CampaignPlatform } from '@/lib/campaignLinks';

// A fixture platform's row: Instagram has four links, Facebook one, and the partner no visits yet.
function rowOf(platform: CampaignPlatform): CampaignPlatformRowData {
    const row = campaignPlatformRows(campaignDetailFixture.links, 'sales').find((entry) => entry.platform === platform);
    if (!row) throw new Error(`No ${platform} row`);
    return row;
}

const meta = {
    title: 'Admin/Campaigns/PlatformRow',
    component: CampaignPlatformRow,
    args: { row: rowOf('instagram'), rateTitle: 'Sales rate' },
    // The rate's title comes from the catalog, in the toolbar's language.
    render: (args, { globals }) => <CampaignPlatformRow row={args.row} rateTitle={copyFor(globals).AdminPage.campaigns.platforms.salesRate} />,
    // A row sits in the platforms table.
    decorators: [
        (Story) => (
            <table className="block w-full text-sm sm:table">
                <Story />
            </table>
        ),
        withAdminShell,
    ],
} satisfies Meta<typeof CampaignPlatformRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = {
    async play({ canvasElement, globals }) {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: copyFor(globals).AdminPage.campaigns.presets.instagram }));
        await expect(canvas.getAllByTestId('platform-link')).toHaveLength(4);
    },
};
export const OneLink: Story = { args: { row: rowOf('facebook') } };
export const NoVisits: Story = { args: { row: rowOf('partner') } };

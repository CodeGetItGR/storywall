import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { copyFor } from '@/.storybook/copy';
import { CampaignDailyTooltip } from '@/components/admin/campaigns/CampaignDailyTooltip';

const meta = {
    title: 'Admin/Campaigns/DailyTooltip',
    component: CampaignDailyTooltip,
    args: {
        active: true,
        label: '2026-06-10',
        payload: [
            { dataKey: 'current', value: 42 },
            { dataKey: 'previous', value: 30 },
        ],
        currentName: 'This period',
        previousName: 'Previous period',
    },
    // The period names come from the catalog, in the toolbar's language.
    render: (args, { globals }) => {
        const copy = copyFor(globals).AdminPage.campaigns.chart;
        return (
            <CampaignDailyTooltip
                active={args.active}
                label={args.label}
                payload={args.payload}
                currentName={copy.current}
                previousName={copy.previous}
            />
        );
    },
    decorators: [withAdminShell],
    tags: ['visual-desktop-only'],
} satisfies Meta<typeof CampaignDailyTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BothPeriods: Story = {};
// Past the previous period's days, or all time.
export const ThisPeriodOnly: Story = { args: { payload: [{ dataKey: 'current', value: 42 }] } };

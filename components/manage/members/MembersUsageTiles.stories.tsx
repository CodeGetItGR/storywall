import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { MembersUsageTiles } from '@/components/manage/members/MembersUsageTiles';

const meta = {
    title: 'Manage/Members/MembersUsageTiles',
    component: MembersUsageTiles,
    decorators: [
        (Story) => (
            <div className="max-w-[420px] p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: {
        members: { used: 58, limit: 100, percent: 58 },
        coHosts: { used: 1, limit: 2, percent: 50 },
        notices: [],
    },
} satisfies Meta<typeof MembersUsageTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

// Members and co-hosts side by side.
export const Both: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copyFor(globals).PlanUsage.items.members)).toBeVisible();
        await expect(canvas.getByText('/ 100')).toBeVisible();
    },
};

// The plan has no co-hosts: one tile.
export const MembersOnly: Story = {
    args: { coHosts: null },
};

// No member limit: no bar.
export const Unlimited: Story = {
    args: { members: { used: 58, limit: null, percent: 0 }, coHosts: null },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByText(copyFor(globals).PlanUsage.unlimited)).toBeVisible();
    },
};

// Every member seat taken, with the notice under the tiles.
function FullTiles() {
    const t = useTranslations('ManagePage.invitations.full');
    return (
        <MembersUsageTiles members={{ used: 100, limit: 100, percent: 100 }} coHosts={{ used: 1, limit: 2, percent: 50 }} notices={[t('notice')]} />
    );
}

export const Full: Story = {
    render: () => <FullTiles />,
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByText(copyFor(globals).ManagePage.invitations.full.notice)).toBeVisible();
    },
};

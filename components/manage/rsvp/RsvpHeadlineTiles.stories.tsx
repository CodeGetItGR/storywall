import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { RsvpHeadlineTiles } from '@/components/manage/rsvp/RsvpHeadlineTiles';

const meta = {
    title: 'Manage/RSVP/RsvpHeadlineTiles',
    component: RsvpHeadlineTiles,
    decorators: [
        (Story) => (
            <div className="max-w-[390px] p-4">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: { totals: { responses: 96, people: 168, adults: 142, children: 26 }, isLoading: false },
} satisfies Meta<typeof RsvpHeadlineTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

// Four tiles in one row at phone width.
export const Numbers: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).ManagePage.rsvpStats;
        for (const label of [copy.responses, copy.totalPeople, copy.adults, copy.kids]) {
            await expect(canvas.getByText(label)).toBeInTheDocument();
        }
    },
};

export const Loading: Story = {
    args: { totals: null, isLoading: true },
};

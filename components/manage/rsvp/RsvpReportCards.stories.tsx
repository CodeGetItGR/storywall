import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { RsvpReportCards } from '@/components/manage/rsvp/RsvpReportCards';

const meta = {
    title: 'Manage/RSVP/RsvpReportCards',
    component: RsvpReportCards,
    decorators: [
        (Story) => (
            <div className="max-w-[720px] overflow-hidden p-4">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: { eventId: 'evt-story' },
} satisfies Meta<typeof RsvpReportCards>;

export default meta;
type Story = StoryObj<typeof meta>;

// A swipe row on phones, 2x2 from lg.
export const Cards: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const types = copyFor(globals).ManagePage.rsvpReports.types;
        for (const type of Object.values(types)) {
            await expect(canvas.getByRole('link', { name: new RegExp(type.label) })).toBeInTheDocument();
        }
    },
};

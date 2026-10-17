import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { RsvpSummarySection } from '@/components/layout/right-context-panel/RsvpSummarySection';

const meta = {
    title: 'Layout/RightContextPanel/RsvpSummarySection',
    component: RsvpSummarySection,
    args: {
        eventId: 'evt-story',
        title: 'RSVP',
        summary: { totalMembers: 48, attending: 31, declined: 4, noResponse: 13 },
    },
    decorators: [
        (Story) => (
            <div className="max-w-xs">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof RsvpSummarySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoAnswersYet: Story = {
    args: { summary: { totalMembers: 48, attending: 0, declined: 0, noResponse: 48 } },
};

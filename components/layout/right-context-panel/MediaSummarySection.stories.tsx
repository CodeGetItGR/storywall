import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { MediaSummarySection } from '@/components/layout/right-context-panel/MediaSummarySection';

const meta = {
    title: 'Layout/RightContextPanel/MediaSummarySection',
    component: MediaSummarySection,
    args: { eventId: 'evt-story', summary: { photoCount: 214, videoCount: 18 } },
    decorators: [
        (Story) => (
            <div className="max-w-xs">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof MediaSummarySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
    args: { summary: { photoCount: 0, videoCount: 0 } },
};

export const LargeCounts: Story = {
    args: { summary: { photoCount: 12_480, videoCount: 1_204 } },
};

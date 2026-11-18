import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { storyEvent, storySession } from '@/.storybook/fixtures';
import { EventSessionActionButtons } from '@/components/feed/EventSessionActionButtons';

// Shown over the cover photo, so the frame is dark.
const meta = {
    title: 'Feed/EventSessionActionButtons',
    component: EventSessionActionButtons,
    args: { event: storyEvent() },
    decorators: [
        (Story) => (
            <div className="inline-flex rounded-2xl bg-ink/70 p-3">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof EventSessionActionButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MainAndSecondary: Story = {};

export const MainOnly: Story = {
    args: { event: storyEvent({ sessions: [storySession()] }) },
};

export const Baptism: Story = {
    args: { event: storyEvent({ eventType: 'BAPTISM' }) },
};

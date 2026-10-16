import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EventDescription } from '@/components/feed/EventDescription';
import { eventDescriptionViewsKey } from '@/lib/storageKeys';

// The description hides itself after two views, counted in localStorage, so
// the count is cleared before each story.
const meta = {
    title: 'Feed/EventDescription',
    component: EventDescription,
    args: { eventId: 'evt-story', description: 'Join us for a summer wedding by the sea.' },
    beforeEach() {
        window.localStorage.removeItem(eventDescriptionViewsKey('evt-story'));
    },
} satisfies Meta<typeof EventDescription>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongDescription: Story = {
    args: {
        description:
            'Join us for a summer wedding by the sea. The ceremony starts at six at the little white church above the harbour, and the party moves down to the beach right after. Bring comfortable shoes for the steps, a light jacket for the evening breeze, and every photo you take along the way.',
    },
};

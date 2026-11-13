import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { STORY_EVENT_ID, storyEvent } from '@/.storybook/fixtures';
import { GiftClaimCelebration } from '@/components/giftMode/GiftClaimCelebration';

// The claimed event is seeded in the cache by withAppContext, so the card shows at once.
const meta = {
    title: 'Gift Mode/GiftClaimCelebration',
    component: GiftClaimCelebration,
    decorators: [withAppContext],
    parameters: { layout: 'fullscreen', app: { event: storyEvent() } },
    args: { outcome: { eventId: STORY_EVENT_ID, status: 'COMPLETED', ownershipTransfersAt: null } },
} satisfies Meta<typeof GiftClaimCelebration>;

export default meta;
type Story = StoryObj<typeof meta>;

// The event is theirs now.
export const Completed: Story = {};

// A host now, the owner on a date.
export const ClaimedWithDate: Story = {
    args: { outcome: { eventId: STORY_EVENT_ID, status: 'CLAIMED', ownershipTransfersAt: '2026-07-18T12:00:00Z' } },
};

// A host now, the owner once a review ends.
export const ClaimedSoon: Story = {
    args: { outcome: { eventId: STORY_EVENT_ID, status: 'CLAIMED', ownershipTransfersAt: null } },
};

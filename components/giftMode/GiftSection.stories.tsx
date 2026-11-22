import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { STORY_EVENT_ID, storyEvent } from '@/.storybook/fixtures';
import { GiftSection } from '@/components/giftMode/GiftSection';
import type { GiftHandoverResponseDto } from '@/lib/api/types';

function gift(overrides: Partial<GiftHandoverResponseDto> = {}): GiftHandoverResponseDto {
    return {
        status: 'NOT_ISSUED',
        recipientLabel: 'Anna & Nikos',
        giverDisplayName: 'Aunt Maria',
        recipientEmail: null,
        token: null,
        cardIssuedAt: null,
        claimedByDisplayName: null,
        claimedAt: null,
        ownershipTransfersAt: null,
        ownershipTransferredAt: null,
        ...overrides,
    };
}

const meta = {
    title: 'Gift Mode/GiftSection',
    component: GiftSection,
    decorators: [
        (Story) => (
            <div className="max-w-[720px] p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { event: storyEvent() } },
    args: { eventId: STORY_EVENT_ID, gift: null, canManage: true, eventActive: true },
} satisfies Meta<typeof GiftSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// Nothing set up: the drawing, the steps with the first one current, and the setup button.
export const NotSetUp: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals);
        await expect(canvas.getByRole('img', { name: copy.GiftMode.manage.illustrationAlt })).toBeVisible();
        const steps = canvas.getAllByRole('listitem');
        await expect(steps).toHaveLength(3);
        await expect(steps[0]).toHaveAttribute('aria-current', 'step');
        await expect(canvas.getByRole('button', { name: copy.GiftMode.manage.setUp })).toBeVisible();
    },
};

// Names saved, no card yet: the second step is current.
export const NoCard: Story = {
    args: { gift: gift() },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
    },
};

// The card is out: waiting on the recipient.
export const CardReady: Story = {
    args: { gift: gift({ status: 'ISSUED', token: 'tok', recipientEmail: 'anna@example.com', cardIssuedAt: '2026-11-20T10:00:00Z' }) },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step');
    },
};

// Claimed: every step ticked.
export const Claimed: Story = {
    args: {
        gift: gift({
            status: 'COMPLETED',
            token: 'tok',
            claimedByDisplayName: 'Anna',
            claimedAt: '2026-11-21T10:00:00Z',
            ownershipTransferredAt: '2026-11-21T10:00:00Z',
        }),
    },
    play: async ({ canvasElement }) => {
        const steps = within(canvasElement).getAllByRole('listitem');
        for (const step of steps) await expect(step).not.toHaveAttribute('aria-current');
    },
};

// A co-host sees the steps and the state, with no actions.
export const CoHost: Story = {
    args: { gift: gift({ status: 'ISSUED', token: 'tok' }), canManage: false },
};

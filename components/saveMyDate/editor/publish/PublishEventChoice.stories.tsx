import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { storyEvent } from '@/.storybook/fixtures';
import { PublishEventChoice } from '@/components/saveMyDate/editor/publish/PublishEventChoice';
import type { InvitationEventChoice } from '@/hooks/useInvitationEventChoice';

const wedding = storyEvent({ id: 'evt-wedding' });
const party = storyEvent({ id: 'evt-party', title: 'Engagement party' });

const choice = (state: Partial<InvitationEventChoice> = {}): InvitationEventChoice => ({
    events: [wedding, party],
    isLoading: false,
    choose: fn(),
    choosingId: null,
    error: null,
    reset: fn(),
    ...state,
});

const meta = {
    title: 'SaveMyDate/Editor/Publish/PublishEventChoice',
    component: PublishEventChoice,
    decorators: [
        (Story) => (
            <div className="max-w-md bg-white p-5 text-sm text-ink">
                <Story />
            </div>
        ),
    ],
    args: { choice: choice(), onNew: fn() },
} satisfies Meta<typeof PublishEventChoice>;

export default meta;
type Story = StoryObj<typeof meta>;

// The host's events of the theme's type, then a new one from the invitation.
export const Events: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /Engagement party/ }));
        await expect(args.choice.choose).toHaveBeenCalledWith(party.id);
        await userEvent.click(canvas.getByRole('button', { name: copy.newEvent }));
        await expect(args.onNew).toHaveBeenCalledOnce();
    },
};

export const Loading: Story = { args: { choice: choice({ events: [], isLoading: true }) } };

// Putting it on the wedding: the rows wait for the answer.
export const Choosing: Story = {
    args: { choice: choice({ choosingId: wedding.id }) },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button', { name: /Engagement party/ })).toBeDisabled();
    },
};

export const Failed: Story = { args: { choice: choice({ error: 'This invitation already belongs to another event.' }) } };

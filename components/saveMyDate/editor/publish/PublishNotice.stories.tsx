import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { withEditorChrome } from '@/.storybook/editor';
import { PublishNotice } from '@/components/saveMyDate/editor/publish/PublishNotice';

const meta = {
    title: 'SaveMyDate/Editor/Publish/PublishNotice',
    component: PublishNotice,
    decorators: [withEditorChrome],
    args: { notice: { kind: 'published', path: '/save-my-date/i/maria-nikos' }, onOpen: fn() },
} satisfies Meta<typeof PublishNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

// The first publish: the notice opens the invitation.
export const Published: Story = {
    play: async ({ args, canvasElement, globals }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).InvitationEditor.open }));
        await expect(args.onOpen).toHaveBeenCalledOnce();
    },
};

export const Republished: Story = { args: { notice: { kind: 'republished' } } };

// The draft isn't on an event yet.
export const Unavailable: Story = { args: { notice: { kind: 'unavailable' } } };

export const Failed: Story = { args: { notice: { kind: 'failed' } } };

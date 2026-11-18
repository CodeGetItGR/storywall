import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { SlugStatus } from '@/components/saveMyDate/editor/publish/SlugStatus';

const meta = {
    title: 'SaveMyDate/Editor/Publish/SlugStatus',
    component: SlugStatus,
    args: { id: 'slug-status', check: 'available' },
} satisfies Meta<typeof SlugStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByText(copyFor(globals).InvitationEditor.slugAvailable)).toBeVisible();
    },
};

// The spinner turns, so the visual check skips it.
export const Checking: Story = { args: { check: 'checking' }, tags: ['visual-skip'] };

export const Taken: Story = { args: { check: 'taken' } };

export const NotAllowed: Story = { args: { check: 'reserved' } };

export const Invalid: Story = { args: { check: 'invalid' } };

// An empty field, or a check that failed: the line stays empty.
export const Empty: Story = {
    args: { check: 'empty' },
    tags: ['visual-skip'],
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('#slug-status')).toBeEmptyDOMElement();
    },
};

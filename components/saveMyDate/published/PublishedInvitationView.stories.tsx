import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { FOUND_STATE, PUBLISHED_LABELS } from '@/.storybook/publishedInvitation';
import { PublishedInvitationView } from '@/components/saveMyDate/published/PublishedInvitationView';

const meta = {
    title: 'SaveMyDate/Published/PublishedInvitationView',
    component: PublishedInvitationView,
    parameters: { layout: 'fullscreen' },
    args: { state: { kind: 'not-found' }, labels: PUBLISHED_LABELS.en },
} satisfies Meta<typeof PublishedInvitationView>;

export default meta;
type Story = StoryObj<typeof meta>;

// The whole invitation, to scroll through. The visual check covers the renderer one section at a time.
export const Found: Story = {
    tags: ['visual-skip'],
    args: { state: FOUND_STATE },
};

export const NotFound: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('heading', { level: 1 })).toHaveTextContent(PUBLISHED_LABELS.en.notFound);
    },
};

export const Expired: Story = { args: { state: { kind: 'expired' } } };

export const LoadFailed: Story = {
    args: { state: { kind: 'error' } },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button', { name: PUBLISHED_LABELS.en.retry })).toBeVisible();
    },
};

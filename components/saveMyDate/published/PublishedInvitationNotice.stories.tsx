import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PUBLISHED_LABELS } from '@/.storybook/publishedInvitation';
import { PublishedInvitationNotice } from '@/components/saveMyDate/published/PublishedInvitationNotice';

const meta = {
    title: 'SaveMyDate/Published/PublishedInvitationNotice',
    component: PublishedInvitationNotice,
    parameters: { layout: 'fullscreen' },
    args: { title: PUBLISHED_LABELS.en.notFound },
} satisfies Meta<typeof PublishedInvitationNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MessageOnly: Story = {};

export const WithRetry: Story = { args: { title: PUBLISHED_LABELS.en.loadFailed, retryLabel: PUBLISHED_LABELS.en.retry } };

// The longest Greek message, to check it wraps on a phone.
export const LongGreekMessage: Story = { args: { title: PUBLISHED_LABELS.el.expired } };

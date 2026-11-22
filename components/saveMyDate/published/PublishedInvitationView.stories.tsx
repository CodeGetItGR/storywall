import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { FOUND_STATE, PUBLISHED_LABELS } from '@/.storybook/publishedInvitation';
import { PublishedInvitationView } from '@/components/saveMyDate/published/PublishedInvitationView';
import { withoutRsvp } from '@/lib/invitation/publishedInvitation';
import { previewDocument } from '@/lib/saveMyDatePreview';

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

const rsvpSectionId = previewDocument().sections.find((section) => section.type === 'rsvp')?.id ?? '';

// The event takes no replies (rsvpOpen false): the RSVP section is hidden. Found shows it.
export const NoReplies: Story = {
    tags: ['visual-skip'],
    args: {
        state:
            FOUND_STATE.kind === 'found'
                ? { ...FOUND_STATE, invitation: { ...FOUND_STATE.invitation, document: withoutRsvp(FOUND_STATE.invitation.document) } }
                : FOUND_STATE,
    },
    play: async ({ canvasElement }) => {
        await expect(rsvpSectionId).not.toBe('');
        await expect(canvasElement.querySelector(`[data-section-id="${rsvpSectionId}"]`)).toBeNull();
        await expect(canvasElement.querySelector('[data-section-id]')).not.toBeNull();
    },
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

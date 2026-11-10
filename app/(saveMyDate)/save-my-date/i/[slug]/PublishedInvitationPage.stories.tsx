import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { FOUND_STATE, PUBLISHED_LABELS } from '@/.storybook/publishedInvitation';
import { PublishedInvitationView } from '@/components/saveMyDate/published/PublishedInvitationView';

// What the published invitation page renders, in Greek, the language most guests read it in.
// The page itself only adds the release check, the backend call and the uploaded fonts.
const meta = {
    title: 'SaveMyDate/Pages/Published invitation',
    component: PublishedInvitationView,
    parameters: { layout: 'fullscreen' },
    args: { state: FOUND_STATE, labels: PUBLISHED_LABELS.el },
} satisfies Meta<typeof PublishedInvitationView>;

export default meta;
type Story = StoryObj<typeof meta>;

// The visual check captures the invitation one section at a time instead (Preview Sections).
export const Invitation: Story = { tags: ['visual-skip'] };

export const NotFound: Story = { args: { state: { kind: 'not-found' } } };

export const Expired: Story = { args: { state: { kind: 'expired' } } };

export const LoadFailed: Story = { args: { state: { kind: 'error' } } };

export const EnglishExpired: Story = { args: { state: { kind: 'expired' }, labels: PUBLISHED_LABELS.en } };

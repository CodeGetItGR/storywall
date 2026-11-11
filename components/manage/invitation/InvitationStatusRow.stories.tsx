import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { InvitationStatusRow } from '@/components/manage/invitation/InvitationStatusRow';
import type { EventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';

const invitation = (state: Partial<EventOnlineInvitation> = {}): EventOnlineInvitation => ({
    isLoading: false,
    isError: false,
    status: 'live',
    liveUntil: 'Jun 15, 2027',
    publicUrl: 'https://invite.storywall.gr/maria-nikos',
    planMissing: false,
    canExtend: true,
    editHref: '/save-my-date/editor/draft-1',
    planHref: '/events/evt-story/manage?tab=plan',
    catalogueHref: '/invitations?type=WEDDING',
    chooseTheme: fn(),
    ...state,
});

const meta = {
    title: 'Manage/Invitation/InvitationStatusRow',
    component: InvitationStatusRow,
    decorators: [
        (Story) => (
            <div className="max-w-3xl bg-event p-5">
                <Story />
            </div>
        ),
    ],
    args: { invitation: invitation() },
} satisfies Meta<typeof InvitationStatusRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Live until a date, with Extend and Edit.
export const Live: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage.invitation;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.liveUntil.replace('{date}', 'Jun 15, 2027'))).toBeVisible();
        await expect(canvas.getByRole('link', { name: copy.extend })).toHaveAttribute('href', '/events/evt-story/manage?tab=plan');
        await expect(canvas.getByRole('link', { name: copy.edit })).toHaveAttribute('href', '/save-my-date/editor/draft-1');
    },
};

export const Offline: Story = { args: { invitation: invitation({ status: 'offline', liveUntil: null }) } };

// Never published: Edit only.
export const NotPublished: Story = {
    args: { invitation: invitation({ status: 'draft', liveUntil: null, publicUrl: null, canExtend: false }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage.invitation;
        await expect(within(canvasElement).queryByRole('link', { name: copy.extend })).not.toBeInTheDocument();
    },
};

// The event's plan doesn't include the invitation.
export const PlanMissing: Story = {
    args: { invitation: invitation({ status: 'draft', liveUntil: null, publicUrl: null, planMissing: true, canExtend: false }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        await expect(within(canvasElement).getByRole('link', { name: copy.seePlan })).toBeVisible();
    },
};

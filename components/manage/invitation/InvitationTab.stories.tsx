import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { InvitationTab } from '@/components/manage/invitation/InvitationTab';
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
    title: 'Manage/Invitation/InvitationTab',
    component: InvitationTab,
    decorators: [
        (Story) => (
            <div className="max-w-3xl bg-event p-5">
                <Story />
            </div>
        ),
    ],
    args: { invitation: invitation() },
} satisfies Meta<typeof InvitationTab>;

export default meta;
type Story = StoryObj<typeof meta>;

// Published: until when, the link with copy and its QR code, Edit and Extend.
export const Live: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.invitation.liveUntil.replace('{date}', 'Jun 15, 2027'))).toBeVisible();
        await expect(canvas.getByText('https://invite.storywall.gr/maria-nikos')).toBeVisible();
        await expect(canvas.getByRole('img', { name: copy.invitation.qrAlt })).toBeVisible();
        await expect(canvas.getByRole('link', { name: copy.invitation.edit })).toHaveAttribute('href', '/save-my-date/editor/draft-1');
        await expect(canvas.getByRole('link', { name: copy.invitation.extend })).toHaveAttribute('href', '/events/evt-story/manage?tab=plan');
    },
};

// Its time online ran out: no link to share, Extend stays.
export const Offline: Story = {
    args: { invitation: invitation({ status: 'offline', liveUntil: null }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.invitation.offline)).toBeVisible();
        await expect(canvas.queryByRole('img', { name: copy.invitation.qrAlt })).not.toBeInTheDocument();
    },
};

// On the event, never published.
export const NotPublished: Story = {
    args: { invitation: invitation({ status: 'draft', liveUntil: null, publicUrl: null, canExtend: false }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.invitation.notPublished)).toBeVisible();
        await expect(canvas.queryByRole('link', { name: copy.invitation.extend })).not.toBeInTheDocument();
    },
};

// The event's plan doesn't include the invitation.
export const PlanMissing: Story = {
    args: { invitation: invitation({ status: 'draft', liveUntil: null, publicUrl: null, planMissing: true, canExtend: false }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.planMissingTitle, { exact: false })).toBeVisible();
        await expect(canvas.getByRole('link', { name: copy.seePlan })).toHaveAttribute('href', '/events/evt-story/manage?tab=plan');
    },
};

// No invitation yet: choosing a theme starts one on this event.
export const Empty: Story = {
    args: { invitation: invitation({ status: 'none', liveUntil: null, publicUrl: null, editHref: null, canExtend: false }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.invitation.empty)).toBeVisible();
        await expect(canvas.getByRole('link', { name: copy.invitation.chooseTheme })).toHaveAttribute('href', '/invitations?type=WEDDING');
    },
};

export const Loading: Story = { args: { invitation: invitation({ isLoading: true }) } };

export const Failed: Story = { args: { invitation: invitation({ isError: true }) } };

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { GuestChoicesList } from '@/components/manage/invitations/GuestChoicesList';
import type { EventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';

const invitation = (state: Partial<EventOnlineInvitation> = {}): EventOnlineInvitation => ({
    isLoading: false,
    isError: false,
    status: 'live',
    liveUntil: 'Jun 15, 2027',
    publicUrl: 'https://invite.storywall.gr/maria-nikos',
    planMissing: false,
    locked: false,
    addOnHref: null,
    addOnPrice: null,
    canExtend: true,
    editHref: '/save-my-date/editor/draft-1',
    planHref: '/events/evt-story/manage?tab=plan',
    catalogueHref: '/invitations?type=WEDDING',
    chooseTheme: fn(),
    ...state,
});

const meta = {
    title: 'Manage/Invitations/GuestChoicesList',
    component: GuestChoicesList,
    decorators: [
        (Story) => (
            <div className="max-w-[340px] p-5">
                <Story />
            </div>
        ),
    ],
    args: { rows: ['join', 'invitation', 'upload', 'wish'], invitation: invitation() },
} satisfies Meta<typeof GuestChoicesList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every choice, with the published invitation's status, Extend and Edit on its row.
export const AllChoices: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { name: copy.ManagePage.invitationsQr.guestsSee })).toBeVisible();
        await expect(canvas.getByText(copy.QrCodePage.choices.invitation)).toBeVisible();
        await expect(canvas.getByText(copy.ManagePage.invitation.liveUntil.replace('{date}', 'Jun 15, 2027'))).toBeVisible();
        await expect(canvas.getByRole('link', { name: copy.ManagePage.invitation.edit })).toHaveAttribute('href', '/save-my-date/editor/draft-1');
    },
};

// No invitation yet: choosing a theme starts one.
export const NoInvitationYet: Story = {
    args: { invitation: invitation({ status: 'none', liveUntil: null, publicUrl: null, editHref: null, canExtend: false }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage.invitation;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.empty)).toBeVisible();
        await expect(canvas.getByRole('link', { name: copy.chooseTheme })).toHaveAttribute('href', '/invitations?type=WEDDING');
    },
};

// Started, never published: Edit only.
export const Draft: Story = {
    args: { invitation: invitation({ status: 'draft', liveUntil: null, publicUrl: null, canExtend: false }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage.invitation;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.notPublished)).toBeVisible();
        await expect(canvas.queryByRole('link', { name: copy.extend })).not.toBeInTheDocument();
    },
};

// Its time online ran out: Extend stays.
export const Offline: Story = {
    args: { invitation: invitation({ status: 'offline', liveUntil: null }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage.invitation;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.offline)).toBeVisible();
        await expect(canvas.getByRole('link', { name: copy.extend })).toBeVisible();
    },
};

// The plan doesn't include the invitation: the upgrade sits on its row.
export const PlanMissing: Story = {
    args: {
        invitation: invitation({
            status: 'none',
            liveUntil: null,
            publicUrl: null,
            editHref: null,
            planMissing: true,
            locked: true,
            canExtend: false,
        }),
    },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage.invitation;
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('link', { name: copy.upgradePlan })).toHaveAttribute('href', '/events/evt-story/manage?tab=plan');
        await expect(canvas.queryByRole('link', { name: copy.chooseTheme })).not.toBeInTheDocument();
    },
};

// No photo uploads, wishbook or invitation: joining is all the code offers.
export const JoinOnly: Story = {
    args: { rows: ['join'], invitation: null },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).QrCodePage.choices;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.join)).toBeVisible();
        await expect(canvas.queryByText(copy.invitation)).not.toBeInTheDocument();
    },
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { delay, http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { storyHostMember, storyMember } from '@/.storybook/fixtures';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { RsvpListPanel } from '@/components/manage/rsvp/RsvpListPanel';
import type { RsvpResponseDto } from '@/lib/api/types';

const members = [
    storyHostMember,
    storyMember({ id: 'mem-anna', displayName: 'Anna Papadopoulou' }),
    storyMember({ id: 'mem-kostas', displayName: 'Kostas Nikolaou' }),
    storyMember({ id: 'mem-sofia', displayName: 'Sofia Dimitriou' }),
];

function storyRsvp(overrides: Partial<RsvpResponseDto>): RsvpResponseDto {
    return {
        id: 'rsvp-anna',
        eventMemberId: 'mem-anna',
        attendanceStatus: 'ATTENDING',
        phone: '6941234567',
        adultCount: 2,
        childCount: 1,
        notes: null,
        submittedAt: '2026-06-10T10:00:00Z',
        updatedAt: '2026-06-10T10:00:00Z',
        replyOnly: false,
        email: null,
        possibleDuplicate: false,
        ...overrides,
    };
}

const memberRsvps = [
    storyRsvp({ guestName: 'Anna Papadopoulou' }),
    storyRsvp({ id: 'rsvp-kostas', eventMemberId: 'mem-kostas', guestName: 'Kostas Nikolaou', attendanceStatus: 'DECLINED', adultCount: 0, childCount: 0 }),
];

// Replies from the published invitation: guests with no account, not in the member list.
const invitationRsvps = [
    storyRsvp({
        id: 'rsvp-maria',
        eventMemberId: 'mem-maria',
        guestName: 'Maria Ioannou',
        replyOnly: true,
        phone: '+30 694 765 4321',
        email: 'maria@example.com',
        adultCount: 2,
        childCount: 0,
        notes: 'Vegetarian menu, please',
    }),
    // The same phone as Anna's reply.
    storyRsvp({
        id: 'rsvp-anna-again',
        eventMemberId: 'mem-anna-again',
        guestName: 'Anna P.',
        replyOnly: true,
        phone: '694 123 4567',
        adultCount: 1,
        childCount: 0,
        possibleDuplicate: true,
    }),
];

const meta = {
    title: 'Manage/Rsvp/RsvpListPanel',
    component: RsvpListPanel,
    args: { eventId: 'evt-1', members, rsvps: memberRsvps, canWrite: true },
} satisfies Meta<typeof RsvpListPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MembersOnly: Story = {};

export const WithInvitationReplies: Story = {
    args: { rsvps: [...memberRsvps, ...invitationRsvps] },
};

// The event can no longer change: the mark stays, its actions don't.
export const ReadOnly: Story = {
    args: { rsvps: [...memberRsvps, ...invitationRsvps], canWrite: false },
    play: async ({ canvasElement, globals }) => {
        const t = copyFor(globals).ManagePage;
        await expect(within(canvasElement).getAllByText(t.rsvpDuplicate.label).length).toBeGreaterThan(0);
        await expect(within(canvasElement).queryByRole('button', { name: t.rsvpDuplicate.keep })).toBeNull();
    },
};

export const NoGuests: Story = {
    args: { members: [storyHostMember], rsvps: [] },
};

export const ConfirmRemove: Story = {
    args: { rsvps: [...memberRsvps, ...invitationRsvps] },
    play: async ({ canvasElement, globals }) => {
        const t = copyFor(globals).ManagePage;
        const [removeButton] = within(canvasElement).getAllByRole('button', { name: t.members.remove });
        await userEvent.click(removeButton);
        const dialog = await waitForOpen('dialog');
        await expect(within(dialog).getByText(t.rsvpDuplicate.removeBody.replace('{name}', 'Anna P.'))).toBeInTheDocument();
    },
};

export const Keeping: Story = {
    args: { rsvps: [...memberRsvps, ...invitationRsvps] },
    beforeEach({ msw }) {
        msw.use(
            http.delete('*/api/rsvps/:id/duplicate-mark', async () => {
                await delay('infinite');
                return HttpResponse.json(null);
            }),
        );
    },
    play: async ({ canvasElement, globals }) => {
        const t = copyFor(globals).ManagePage;
        const [keepButton] = within(canvasElement).getAllByRole('button', { name: t.rsvpDuplicate.keep });
        await userEvent.click(keepButton);
        await expect(keepButton).toBeDisabled();
    },
};

// A server error (500, 9001): the shared API error copy for it.
export const KeepFailed: Story = {
    args: { rsvps: [...memberRsvps, ...invitationRsvps] },
    beforeEach({ msw }) {
        msw.use(http.delete('*/api/rsvps/:id/duplicate-mark', () => HttpResponse.json({ status: 500, errorCode: 9001 }, { status: 500 })));
    },
    play: async ({ canvasElement, globals }) => {
        const t = copyFor(globals);
        const [keepButton] = within(canvasElement).getAllByRole('button', { name: t.ManagePage.rsvpDuplicate.keep });
        await userEvent.click(keepButton);
        await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(t.ApiErrors.internalError);
    },
};

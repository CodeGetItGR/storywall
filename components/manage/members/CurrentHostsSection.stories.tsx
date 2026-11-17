import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { STORY_EVENT_ID, storyHostMember, storyMember } from '@/.storybook/fixtures';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { CurrentHostsSection } from '@/components/manage/members/CurrentHostsSection';
import type { MembersPageState } from '@/hooks/useMembersPage';
import type { EventHostResponseDto, EventInvitationResponseDto } from '@/lib/api/types';

// The story clock is 2026-06-15 12:00 UTC.
const maria = storyMember({ id: 'mem-maria', role: 'HOST', displayName: 'Maria Papadopoulou', userId: 'usr-maria' });
const nikos = storyMember({ id: 'mem-nikos', role: 'HOST', displayName: 'Nikos Alexiou', userId: 'usr-nikos' });

function host(id: string, memberId: string, displayOrder: number): EventHostResponseDto {
    return { id, eventId: STORY_EVENT_ID, memberId, displayOrder } as EventHostResponseDto;
}

function invitation(overrides: Partial<EventInvitationResponseDto> = {}): EventInvitationResponseDto {
    return {
        id: 'inv-eleni',
        eventId: STORY_EVENT_ID,
        role: 'HOST',
        inviteCode: 'K7QX2P',
        inviteToken: 'tok-eleni',
        email: 'eleni@example.com',
        firstName: null,
        lastName: null,
        usedAt: null,
        expiresAt: '2026-06-22T10:00:00Z',
        ...overrides,
    } as EventInvitationResponseDto;
}

function hostsPage(overrides: Partial<MembersPageState> = {}): MembersPageState {
    return {
        eventId: STORY_EVENT_ID,
        locale: 'en',
        canWrite: true,
        hostRows: [{ host: host('host-maria', maria.id, 0), member: maria }],
        pendingInvitations: [],
        canManageHosts: true,
        canInviteCoHost: true,
        inviteOpen: false,
        openInvite: fn(),
        closeInvite: fn(),
        canManageRoles: false,
        roleSheet: { member: null, open: fn(), close: fn() },
        ...overrides,
    } as MembersPageState;
}

const withCoHost = [
    { host: host('host-maria', maria.id, 0), member: maria },
    { host: host('host-nikos', nikos.id, 1), member: nikos },
];

const meta = {
    title: 'Manage/Members/CurrentHostsSection',
    component: CurrentHostsSection,
    decorators: [
        (Story) => (
            <div className="max-w-[560px] p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: { page: hostsPage() },
} satisfies Meta<typeof CurrentHostsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// Only the primary host, with Invite co-host.
export const PrimaryOnly: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals).ManagePage.invitations.coHosts;
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.primary)).toBeVisible();
        await expect(canvas.getByRole('button', { name: copy.cta })).toBeVisible();
    },
};

// A co-host and a pending invitation that has not expired.
export const WithCoHostAndInvitation: Story = {
    args: { page: hostsPage({ hostRows: withCoHost, pendingInvitations: [invitation()] }) },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('eleni@example.com')).toBeVisible();
    },
};

// An invitation past its date: it says Expired and can still be revoked.
export const ExpiredInvitation: Story = {
    args: { page: hostsPage({ hostRows: withCoHost, pendingInvitations: [invitation({ expiresAt: '2026-06-01T10:00:00Z' })] }) },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByText(copyFor(globals).ManagePage.qr.status.EXPIRED)).toBeVisible();
    },
};

// A read-only event: no Invite co-host, no host actions.
export const ReadOnly: Story = {
    args: {
        page: hostsPage({
            canWrite: false,
            canManageHosts: false,
            canInviteCoHost: false,
            hostRows: withCoHost,
            pendingInvitations: [invitation()],
        }),
    },
    play: async ({ canvasElement, globals }) => {
        await expect(within(canvasElement).getByText(copyFor(globals).ManagePage.invitations.readOnly)).toBeVisible();
    },
};

// Nikos's ⋯ menu open: Transfer ownership and Remove co-host.
export const MenuOpen: Story = {
    args: { page: hostsPage({ hostRows: withCoHost }) },
    play: async ({ canvasElement, globals }) => {
        const label = copyFor(globals).ManagePage.members.moreFor.replace('{name}', nikos.displayName);
        await userEvent.click(within(canvasElement).getByRole('button', { name: label }));
        await waitForOpen('menu');
    },
};

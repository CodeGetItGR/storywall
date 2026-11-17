import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventHostResponseDto, EventInvitationResponseDto, EventMemberResponseDto } from '@/lib/api/types';

import { CurrentHostsSection } from './CurrentHostsSection';

const requestTransfer = vi.fn();
const requestRemove = vi.fn();
const copy = vi.fn();

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useMemberAvatarUrl', () => ({ useMemberAvatarUrl: () => () => null }));
vi.mock('@/hooks/useCoHostManagement', () => ({
    useCoHostManagement: () => ({
        canTransfer: true,
        requestTransfer,
        requestRemove,
        transferTarget: null,
        removeTarget: null,
        closeTransfer: vi.fn(),
        closeRemove: vi.fn(),
        confirmTransfer: vi.fn(),
        confirmRemove: vi.fn(),
        isTransferring: false,
        isRemoving: false,
        error: null,
    }),
}));
vi.mock('@/hooks/useEventInvitations', () => ({ useDeleteEventInvitation: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/useCopyText', () => ({ useCopyText: () => ({ copied: false, copy }) }));
vi.mock('@/hooks/useShareLink', () => ({ useShareLink: (url: string) => url }));
vi.mock('./InviteCoHostSheet', () => ({ InviteCoHostSheet: ({ open }: { open: boolean }) => (open ? <p>sheet</p> : null) }));

function member(id: string, displayName: string): EventMemberResponseDto {
    return { id, userId: `u-${id}`, displayName, avatarUrl: null, role: 'HOST', isFeatured: false } as unknown as EventMemberResponseDto;
}

function host(id: string, memberId: string, displayOrder: number): EventHostResponseDto {
    return { id, memberId, displayOrder } as unknown as EventHostResponseDto;
}

function invitation(overrides: Partial<EventInvitationResponseDto> = {}): EventInvitationResponseDto {
    return {
        id: 'inv-1',
        role: 'HOST',
        inviteCode: 'ABC123',
        inviteToken: 'token-1',
        email: 'eleni@example.com',
        firstName: null,
        lastName: null,
        usedAt: null,
        expiresAt: null,
        ...overrides,
    } as unknown as EventInvitationResponseDto;
}

const openInvite = vi.fn();
const basePage = () => ({
    eventId: 'e1',
    locale: 'en',
    canWrite: true,
    hostRows: [
        { host: host('h1', 'm1', 0), member: member('m1', 'Maria') },
        { host: host('h2', 'm2', 1), member: member('m2', 'Nikos') },
    ],
    pendingInvitations: [] as EventInvitationResponseDto[],
    canManageHosts: true,
    canInviteCoHost: false,
    inviteOpen: false,
    openInvite,
    closeInvite: vi.fn(),
    canManageRoles: false,
    roleSheet: { open: vi.fn() },
});

function renderSection(overrides: Record<string, unknown> = {}) {
    return render(<CurrentHostsSection page={{ ...basePage(), ...overrides } as never} />);
}

beforeEach(() => {
    requestTransfer.mockReset();
    requestRemove.mockReset();
    copy.mockReset();
});
afterEach(cleanup);

describe('CurrentHostsSection', () => {
    it('shows the primary host without a menu and a co-host with Transfer and Remove', async () => {
        renderSection({ canManageHosts: true });
        expect(screen.queryByRole('button', { name: /members.moreFor.*Maria/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /members.moreFor.*Nikos/ }));
        expect(await screen.findByRole('menuitem', { name: 'invitations.coHosts.transfer' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('menuitem', { name: 'invitations.coHosts.remove' }));
        expect(requestRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'h2' }));
    });

    it('gives a co-host no menu when the viewer cannot manage hosts', () => {
        renderSection({ canManageHosts: false });
        expect(screen.queryByRole('button', { name: /members.moreFor/ })).toBeNull();
    });

    it('lists a pending invitation by email with its expiry, and copies its link', async () => {
        renderSection({ pendingInvitations: [invitation({ email: 'eleni@example.com', expiresAt: '2099-11-20T10:00:00Z' })] });
        expect(screen.getByText('eleni@example.com')).toBeInTheDocument();
        expect(screen.getByText(/invitations.coHosts.expiresOn/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /members.moreFor.*eleni@example.com/ }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'invitations.copyLink' }));
        expect(copy).toHaveBeenCalled();
    });

    it('marks an expired invitation', () => {
        renderSection({ pendingInvitations: [invitation({ expiresAt: '2020-01-01T00:00:00Z' })] });
        expect(screen.getByText('qr.status.EXPIRED')).toBeInTheDocument();
    });

    it('opens the invite sheet from Invite co-host, and hides the button when not allowed', () => {
        renderSection({ canInviteCoHost: true, openInvite });
        fireEvent.click(screen.getByRole('button', { name: 'invitations.coHosts.cta' }));
        expect(openInvite).toHaveBeenCalled();

        cleanup();
        renderSection({ canInviteCoHost: false });
        expect(screen.queryByRole('button', { name: 'invitations.coHosts.cta' })).toBeNull();
    });
});

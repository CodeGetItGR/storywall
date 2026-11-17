import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventInvitationResponseDto, EventMemberResponseDto } from '@/lib/api/types';

import { type MembersPanelProps, useMembersPage } from './useMembersPage';

let coHostsFull = false;

vi.mock('@/hooks/useModuleCopy', () => {
    const copy = (moduleKey: string) => ({ name: moduleKey, description: `${moduleKey} description`, cardLabel: moduleKey, Icon: () => null });
    return {
        useModuleCopy: () => copy,
        useActiveModuleCopy: copy,
        useModuleCopyResolver: () => (_eventType: unknown, moduleKey: string) => copy(moduleKey),
    };
});
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { reportTargetTypes: ['MEMBER'] } }) }));
vi.mock('@/hooks/useBilling', () => ({ useUpgradeOptions: () => ({ data: [] }) }));
vi.mock('@/hooks/useCoHostCapacity', () => ({
    useCoHostCapacity: () => ({ isFull: coHostsFull, used: 0, limit: null, percent: 0, valueLabel: '', fullNotice: null }),
}));
vi.mock('@/hooks/usePromoteCoHost', () => ({
    usePromoteCoHost: () => ({
        target: null,
        error: null,
        isPromoting: false,
        request: vi.fn(),
        requestForMember: vi.fn(),
        close: vi.fn(),
        confirm: vi.fn(),
    }),
}));
vi.mock('@/hooks/useMemberModeration', () => ({
    useMemberModeration: () => ({
        memberToRemove: null,
        memberToReport: null,
        removeError: null,
        isRemoving: false,
        requestRemove: vi.fn(),
        requestReport: vi.fn(),
        closeRemove: vi.fn(),
        closeReport: vi.fn(),
        confirmRemove: vi.fn(),
    }),
}));
vi.mock('@/hooks/useMemberRoleSheet', () => ({ useMemberRoleSheet: () => ({ member: null, open: vi.fn(), close: vi.fn() }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveMember: () => ({ id: 'm1' }),
    useActiveEvent: () => null,
}));

function member(id: string, displayName: string, role: 'HOST' | 'ATTENDEE' = 'HOST', userId: string | null = `u-${id}`): EventMemberResponseDto {
    return {
        id,
        userId,
        displayName,
        avatarUrl: null,
        role,
        joinedAt: '2026-09-01T10:00:00Z',
    } as unknown as EventMemberResponseDto;
}

function invitation(overrides: Partial<EventInvitationResponseDto>): EventInvitationResponseDto {
    return {
        id: 'i1',
        eventId: 'e1',
        inviteCode: 'ABC',
        inviteToken: 't1',
        email: 'eleni@example.com',
        firstName: null,
        lastName: null,
        maxGuests: 1,
        expiresAt: null,
        usedAt: null,
        createdAt: '2026-11-01T10:00:00Z',
        role: 'HOST',
        ...overrides,
    };
}

const baseProps: MembersPanelProps = {
    canModerate: true,
    canWrite: true,
    eventId: 'event-1',
    members: [],
    invitations: [],
    eventUsage: null,
    planTiers: [],
    eventModules: [{ moduleKey: 'co_hosts', isAvailable: true } as never],
    hosts: [],
    isPrimaryHost: true,
};

beforeEach(() => {
    coHostsFull = false;
});

describe('useMembersPage', () => {
    it('lists guests without the hosts and pending invitations only', () => {
        const { result } = renderHook(() =>
            useMembersPage({
                ...baseProps,
                members: [member('m1', 'Maria'), member('m2', 'Anna', 'ATTENDEE')],
                hosts: [{ id: 'h1', memberId: 'm1', displayOrder: 0 } as never],
                invitations: [invitation({ id: 'p' }), invitation({ id: 'c', usedAt: '2026-11-02T10:00:00Z' })],
            }),
        );

        expect(result.current.guests.map((item) => item.id)).toEqual(['m2']);
        expect(result.current.pendingInvitations.map((item) => item.id)).toEqual(['p']);
        expect(result.current.hostRows).toEqual([{ host: expect.objectContaining({ id: 'h1' }), member: expect.objectContaining({ id: 'm1' }) }]);
    });

    it('offers Invite co-host only when the plan has co-hosts and seats are free', () => {
        coHostsFull = false;
        expect(renderHook(() => useMembersPage(baseProps)).result.current.canInviteCoHost).toBe(true);

        coHostsFull = true;
        expect(renderHook(() => useMembersPage(baseProps)).result.current.canInviteCoHost).toBe(false);

        coHostsFull = false;
        expect(renderHook(() => useMembersPage({ ...baseProps, eventModules: [] })).result.current.canInviteCoHost).toBe(false);
    });

    it('opens and closes the invite sheet', () => {
        const { result } = renderHook(() => useMembersPage(baseProps));
        act(() => result.current.openInvite());
        expect(result.current.inviteOpen).toBe(true);
        act(() => result.current.closeInvite());
        expect(result.current.inviteOpen).toBe(false);
    });
});

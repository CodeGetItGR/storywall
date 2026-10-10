import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventMemberResponseDto } from '@/lib/api/types';

import { MembersPanel } from './MembersPanel';

let activeMemberId: string | null = 'm1';
let coHostsFull = false;
const requestForMember = vi.fn();

vi.mock('@/hooks/useModuleCopy', () => {
    const copy = (moduleKey: string) => ({ name: moduleKey, description: `${moduleKey} description`, cardLabel: moduleKey, Icon: () => null });
    return {
        useModuleCopy: () => copy,
        useActiveModuleCopy: copy,
        useModuleCopyResolver: () => (_eventType: unknown, moduleKey: string) => copy(moduleKey),
    };
});
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks', () => ({ useAppConfig: () => ({ data: { reportTargetTypes: ['MEMBER'] } }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { reportTargetTypes: ['MEMBER'] } }) }));
vi.mock('@/hooks/useBilling', () => ({ useUpgradeOptions: () => ({ data: [] }) }));
vi.mock('@/hooks/useCoHostCapacity', () => ({
    useCoHostCapacity: () => ({ isFull: coHostsFull, used: 0, limit: null, percent: 0, valueLabel: '', fullNotice: null }),
}));
vi.mock('@/hooks/usePromoteCoHost', () => ({
    usePromoteCoHost: () => ({ target: null, error: null, isPromoting: false, request: vi.fn(), requestForMember, close: vi.fn(), confirm: vi.fn() }),
}));
vi.mock('@/hooks/useMemberAvatarUrl', () => ({ useMemberAvatarUrl: () => () => null }));
vi.mock('@/hooks/useMemberRoleLabel', () => ({ useMemberRoleLabel: () => null }));
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
vi.mock('@/providers/EventProvider', () => ({
    useActiveMember: () => (activeMemberId ? { id: activeMemberId } : null),
    useActiveEvent: () => null,
}));
vi.mock('@/components/manage/invitations', () => ({
    CoHostInvitationRow: () => null,
    CreateCoHostInvitationForm: () => null,
    ShareLanguageNote: () => null,
}));
vi.mock('@/components/plan/UsagePanel', () => ({ UsagePanel: () => null }));
vi.mock('@/components/reports', () => ({ ReportTargetModal: () => null }));
vi.mock('./CoHostManagementList', () => ({ CoHostManagementList: () => null }));

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

function renderPanel(members = [member('m1', 'Me'), member('m2', 'Other')]) {
    return render(
        <MembersPanel
            canModerate
            canWrite
            eventId="event-1"
            members={members}
            invitations={[]}
            eventUsage={null}
            planTiers={[]}
            eventModules={[{ moduleKey: 'co_hosts', isAvailable: true } as never]}
            hosts={[]}
            isPrimaryHost
        />,
    );
}

beforeEach(() => {
    activeMemberId = 'm1';
    coHostsFull = false;
    requestForMember.mockReset();
});
afterEach(cleanup);

describe('Member report action', () => {
    it('shows Report on another member but not on the viewer own row', () => {
        renderPanel();

        // The other member's row carrying the action proves the list rendered.
        const otherRow = screen.getByText('Other').closest('li') as HTMLElement;
        const ownRow = screen.getByText('Me').closest('li') as HTMLElement;
        expect(within(otherRow).getByRole('button', { name: 'report' })).toBeTruthy();
        expect(within(ownRow).queryByRole('button', { name: 'report' })).toBeNull();
    });
});

describe('Make co-host action', () => {
    const attendee = member('m3', 'Guest', 'ATTENDEE');

    it('offers it on attendees with an account, not on hosts', () => {
        renderPanel([member('m1', 'Me'), attendee, member('m4', 'No account', 'ATTENDEE', null)]);

        const row = (name: string) => screen.getByText(name).closest('li') as HTMLElement;
        within(row('Guest')).getByRole('button', { name: 'promote' }).click();
        expect(requestForMember).toHaveBeenCalledWith(attendee);
        expect(within(row('Me')).queryByRole('button', { name: 'promote' })).toBeNull();
        expect(within(row('No account')).queryByRole('button', { name: 'promote' })).toBeNull();
    });

    it('hides it when the co-host seats are full', () => {
        coHostsFull = true;
        renderPanel([member('m1', 'Me'), attendee]);

        expect(screen.queryByRole('button', { name: 'promote' })).toBeNull();
    });
});

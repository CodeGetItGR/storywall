import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventMemberResponseDto } from '@/lib/api/types';

import { MembersPanel } from './MembersPanel';

let activeMemberId: string | null = 'm1';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks', () => ({ useAppConfig: () => ({ data: { reportTargetTypes: ['MEMBER'] } }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { reportTargetTypes: ['MEMBER'] } }) }));
vi.mock('@/hooks/useBilling', () => ({ useUpgradeOptions: () => ({ data: [] }) }));
vi.mock('@/hooks/useCoHostCapacity', () => ({ useCoHostCapacity: () => ({ isFull: false, used: 0, limit: null, percent: 0, valueLabel: '', fullNotice: null }) }));
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

function member(id: string, displayName: string): EventMemberResponseDto {
    return {
        id,
        displayName,
        avatarUrl: null,
        role: 'HOST',
        joinedAt: '2026-09-01T10:00:00Z',
    } as unknown as EventMemberResponseDto;
}

function renderPanel() {
    return render(
        <MembersPanel
            canModerate
            canWrite
            eventId="event-1"
            members={[member('m1', 'Me'), member('m2', 'Other')]}
            invitations={[]}
            eventUsage={null}
            planTiers={[]}
            eventModules={[]}
            hosts={[]}
            isPrimaryHost
        />,
    );
}

beforeEach(() => {
    activeMemberId = 'm1';
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

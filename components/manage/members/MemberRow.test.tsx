import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventMemberResponseDto } from '@/lib/api/types';

import { MemberRow } from './MemberRow';

let roleLabel: string | null = null;
const onPromote = vi.fn();

vi.mock('@/hooks/useMemberRoleLabel', () => ({ useMemberRoleLabel: () => roleLabel }));
vi.mock('@/hooks/useMemberAvatarUrl', () => ({ useMemberAvatarUrl: () => () => null }));

const anna = { id: 'm1', userId: 'u1', displayName: 'Anna', avatarUrl: null, role: 'ATTENDEE' } as unknown as EventMemberResponseDto;

function renderRow({ canPromote = false, canReport = false, canRemove = false } = {}) {
    return render(
        <ul>
            <MemberRow
                member={anna}
                canPromote={canPromote}
                canReport={canReport}
                canRemove={canRemove}
                editRoleLabel="Edit role for Anna"
                eventTypeKey={null}
                joinedLabel="Joined 3 Nov 2026"
                moreLabel="More options for Anna"
                onPromoteAction={onPromote}
                onReportAction={vi.fn()}
                onRemoveAction={vi.fn()}
                promoteLabel="Make co-host"
                reportLabel="Report"
                removeLabel="Remove"
            />
        </ul>,
    );
}

beforeEach(() => {
    roleLabel = null;
    onPromote.mockReset();
});
afterEach(cleanup);

describe('MemberRow', () => {
    it('puts the role and joined date on one line', () => {
        roleLabel = 'Bride’s friend';
        renderRow();
        expect(screen.getByText('Bride’s friend · Joined 3 Nov 2026')).toBeInTheDocument();
    });

    it('shows only the joined date without a role', () => {
        roleLabel = null;
        renderRow();
        expect(screen.getByText('Joined 3 Nov 2026')).toBeInTheDocument();
    });

    it('offers Make co-host, Report and Remove in the menu', async () => {
        renderRow({ canPromote: true, canReport: true, canRemove: true });
        fireEvent.click(screen.getByRole('button', { name: 'More options for Anna' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Make co-host' }));
        expect(onPromote).toHaveBeenCalled();
        expect(screen.queryByRole('menuitem', { name: 'Report' })).toBeNull(); // the menu closed
    });

    it('has no menu when no action is allowed', () => {
        renderRow({ canPromote: false, canReport: false, canRemove: false });
        expect(screen.queryByRole('button', { name: 'More options for Anna' })).toBeNull();
    });
});

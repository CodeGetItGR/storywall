import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModerationCaseDrawer } from '@/components/admin/moderation/ModerationCaseDrawer';
import type { ModerationCaseDetailDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({
    detail: null as ModerationCaseDetailDto | null,
    reviewMutate: vi.fn(),
    reviewError: null as Error | null,
    decideMutate: vi.fn(),
    decideError: null as Error | null,
    liftMutate: vi.fn(),
    liftSuspensionMutate: vi.fn(),
    closeSuspensionMutate: vi.fn(),
    suspensionPending: false,
    liftSuspensionError: null as Error | null,
    closeSuspensionError: null as Error | null,
}));

// Values are appended so a test can see what an ICU message was given.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (error: Error) => error.message }));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
        <div>
            <h2>{title}</h2>
            {children}
        </div>
    ),
}));
vi.mock('@/hooks/useAdminModeration', () => ({
    useAdminModerationCase: () => ({ data: hooks.detail, error: null, isLoading: false }),
    useStartModerationReview: () => ({ mutate: hooks.reviewMutate, error: hooks.reviewError }),
    useDecideModerationCase: () => ({ mutate: hooks.decideMutate, isPending: false, error: hooks.decideError }),
    useLiftEventBan: () => ({ mutate: hooks.liftMutate, isPending: false, variables: undefined, error: null }),
    useLiftEventSuspension: () => ({
        mutate: hooks.liftSuspensionMutate,
        reset: vi.fn(),
        isPending: hooks.suspensionPending,
        error: hooks.liftSuspensionError,
    }),
    useCloseEventSuspension: () => ({
        mutate: hooks.closeSuspensionMutate,
        reset: vi.fn(),
        isPending: hooks.suspensionPending,
        error: hooks.closeSuspensionError,
    }),
}));

const baseDetail: ModerationCaseDetailDto = {
    targetType: 'COMMENT',
    targetId: 'c-1',
    eventId: 'e-1',
    eventTitle: 'Maria & Nikos',
    status: 'OPEN',
    reports: [
        {
            id: 'r-1',
            reason: 'HARASSMENT',
            description: 'Rude',
            status: 'OPEN',
            createdAt: '2026-09-30T10:00:00Z',
            reporterMemberId: 'm-2',
            reporterDisplayName: 'Eleni',
            noticeReference: null,
        },
    ],
    content: {
        text: 'A rude comment',
        authorMemberId: 'm-1',
        authorUserId: 'u-1',
        authorDisplayName: 'Kostas',
        authorIsHost: false,
        media: [],
        createdAt: '2026-09-29T10:00:00Z',
    },
    allowedActions: { removeContent: true, removeMember: true, banFromEvent: true, suspendAccount: true, suspendEvent: true },
    decisions: [],
    priorDecisionsAgainstAuthor: [],
    bans: [],
    eventSuspension: null,
};

function renderDrawer(onCloseAction = vi.fn()) {
    render(
        <StrictMode>
            <ModerationCaseDrawer targetType="COMMENT" targetId="c-1" onCloseAction={onCloseAction} />
        </StrictMode>,
    );
    return onCloseAction;
}

beforeEach(() => {
    hooks.detail = baseDetail;
    hooks.decideError = null;
    hooks.reviewError = null;
    hooks.reviewMutate.mockReset();
    hooks.decideMutate.mockReset();
    hooks.liftMutate.mockReset();
    hooks.liftSuspensionMutate.mockReset();
    hooks.closeSuspensionMutate.mockReset();
    hooks.suspensionPending = false;
    hooks.liftSuspensionError = null;
    hooks.closeSuspensionError = null;
});

afterEach(cleanup);

describe('ModerationCaseDrawer', () => {
    it('claims an open case for review exactly once, even under StrictMode', () => {
        renderDrawer();
        expect(hooks.reviewMutate).toHaveBeenCalledTimes(1);
        expect(hooks.reviewMutate).toHaveBeenCalledWith({ targetType: 'COMMENT', targetId: 'c-1' });
    });

    it('does not claim a case already under review or closed', () => {
        hooks.detail = { ...baseDetail, status: 'UNDER_REVIEW' };
        renderDrawer();
        cleanup();
        hooks.detail = { ...baseDetail, status: 'CLOSED' };
        renderDrawer();
        expect(hooks.reviewMutate).not.toHaveBeenCalled();
    });

    it('closes once the decision succeeds', () => {
        hooks.decideMutate.mockImplementation((_vars: unknown, options: { onSuccess: () => void }) => options.onSuccess());
        const onClose = renderDrawer();
        fireEvent.click(screen.getByRole('radio', { name: 'form.takeAction' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'form.removeContent' }));
        fireEvent.click(screen.getByRole('radio', { name: 'grounds.GUIDELINES_BREACH' }));
        fireEvent.change(screen.getByRole('combobox', { name: 'statement.rule' }), { target: { value: 'HARASSMENT' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'statement.explanation' }), {
            target: { value: 'Insults aimed at one guest, twice.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        fireEvent.click(screen.getByRole('button', { name: 'form.confirm' }));
        expect(hooks.decideMutate).toHaveBeenCalledWith(
            {
                targetType: 'COMMENT',
                targetId: 'c-1',
                request: {
                    outcome: 'ACTION_TAKEN',
                    removeContent: true,
                    removeMember: false,
                    banFromEvent: false,
                    suspendAccount: false,
                    suspendEvent: false,
                    ground: 'GUIDELINES_BREACH',
                    rule: 'HARASSMENT',
                    explanation: 'Insults aimed at one guest, twice.',
                    note: null,
                    expectedContentText: null,
                },
            },
            expect.anything(),
        );
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows a refused decision', () => {
        hooks.decideError = new Error('This action no longer applies');
        renderDrawer();
        expect(screen.getByRole('alert').textContent).toBe('This action no longer applies');
    });

    it('still shows the refusal once a 5106 refetch has closed the case', () => {
        hooks.decideError = new Error('Already decided');
        hooks.detail = { ...baseDetail, status: 'CLOSED' };
        renderDrawer();
        expect(screen.queryByRole('radio', { name: 'form.takeAction' })).toBeNull();
        expect(screen.getByRole('alert').textContent).toBe('Already decided');
    });

    it('announces a refused review claim', () => {
        hooks.reviewError = new Error('Guidelines not accepted');
        renderDrawer();
        expect(screen.getByRole('alert').textContent).toBe('Guidelines not accepted');
    });

    it('tells active reports apart from ones an earlier decision closed', () => {
        hooks.detail = {
            ...baseDetail,
            reports: [
                { ...baseDetail.reports[0], id: 'r-0', status: 'RESOLVED' },
                { ...baseDetail.reports[0], id: 'r-1', status: 'OPEN' },
            ],
        };
        renderDrawer();
        expect(screen.getByText('reportStatus.RESOLVED')).toBeTruthy();
        expect(screen.getByText('reportStatus.OPEN')).toBeTruthy();

        // Only the active report is closed by this decision.
        fireEvent.click(screen.getByRole('radio', { name: 'form.dismiss' }));
        fireEvent.click(screen.getByRole('button', { name: 'form.review' }));
        expect(screen.getByText('summary.reports {"count":1,"outcome":"DISMISSED"}')).toBeTruthy();
    });

    it('labels a report that came from a public notice with its reference', () => {
        hooks.detail = {
            ...baseDetail,
            reports: [{ ...baseDetail.reports[0], reporterMemberId: null, reporterDisplayName: null, noticeReference: 'AB12CD34' }],
        };
        renderDrawer();
        expect(screen.getByText(/publicNotice {"reference":"AB12CD34"}/)).toBeTruthy();
        expect(screen.queryByText(/reporterGone/)).toBeNull();
    });

    it('says the item is gone when the content is null', () => {
        hooks.detail = { ...baseDetail, content: null };
        renderDrawer();
        expect(screen.getByText('contentGone')).toBeTruthy();
    });

    it('lifts a ban with the case it belongs to', () => {
        hooks.detail = {
            ...baseDetail,
            bans: [{ id: 'b-1', eventId: 'e-1', userId: 'u-1', decisionId: 'd-1', createdAt: '2026-09-30T10:00:00Z', liftedAt: null }],
        };
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'liftBan' }));
        expect(hooks.liftMutate).toHaveBeenCalledWith({ banId: 'b-1', targetType: 'COMMENT', targetId: 'c-1' });
    });

    it('shows the statement of an earlier decision', () => {
        hooks.detail = {
            ...baseDetail,
            status: 'CLOSED',
            decisions: [
                {
                    id: 'd-1',
                    targetType: 'COMMENT',
                    targetId: 'c-1',
                    eventId: 'e-1',
                    outcome: 'ACTION_TAKEN',
                    contentRemoved: true,
                    memberRemoved: false,
                    banned: false,
                    accountSuspended: false,
                    eventSuspended: true,
                    ground: 'GUIDELINES_BREACH',
                    rule: 'HARASSMENT',
                    explanation: 'Insults aimed at one guest, twice.',
                    reportCount: 1,
                    adminUserId: 'a-1',
                    note: null,
                    createdAt: '2026-10-01T10:00:00Z',
                },
            ],
        };
        renderDrawer();
        expect(screen.getByText('history.actions.eventSuspended · history.actions.contentRemoved')).toBeTruthy();
        expect(screen.getByText('grounds.GUIDELINES_BREACH · rules.HARASSMENT')).toBeTruthy();
        expect(screen.getByText('Insults aimed at one guest, twice.')).toBeTruthy();
    });

    it('lifts a suspension only after a confirm', () => {
        hooks.detail = {
            ...baseDetail,
            eventSuspension: { decisionId: 'd-1', suspendedAt: '2026-10-01T10:00:00Z', closedAt: null, deletesOn: '2026-11-01T10:00:00Z' },
        };
        renderDrawer();
        expect(screen.getByText(/^suspension\.status/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'suspension.lift' }));
        expect(hooks.liftSuspensionMutate).not.toHaveBeenCalled();
        expect(screen.getByText('suspension.liftConfirm')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'suspension.liftConfirmButton' }));
        expect(hooks.liftSuspensionMutate).toHaveBeenCalledWith({ eventId: 'e-1', targetType: 'COMMENT', targetId: 'c-1' }, expect.anything());
    });

    it('can back out of lifting a suspension', () => {
        hooks.detail = {
            ...baseDetail,
            eventSuspension: { decisionId: 'd-1', suspendedAt: '2026-10-01T10:00:00Z', closedAt: null, deletesOn: '2026-11-01T10:00:00Z' },
        };
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'suspension.lift' }));
        fireEvent.click(screen.getByRole('button', { name: 'suspension.cancel' }));
        expect(screen.getByRole('button', { name: 'suspension.lift' })).toBeTruthy();
        expect(hooks.liftSuspensionMutate).not.toHaveBeenCalled();
    });

    it('offers no lift when the event is not suspended', () => {
        renderDrawer();
        expect(screen.queryByRole('button', { name: 'suspension.lift' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'suspension.close' })).toBeNull();
    });

    it('closes a StoryWall only after a confirm that names the deletion date', () => {
        hooks.detail = {
            ...baseDetail,
            eventSuspension: { decisionId: 'd-1', suspendedAt: '2026-10-01T10:00:00Z', closedAt: null, deletesOn: '2026-11-01T10:00:00Z' },
        };
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'suspension.close' }));
        expect(hooks.closeSuspensionMutate).not.toHaveBeenCalled();
        // The mocked t() prints its values after the key: the confirm must carry deletesOn.
        expect(screen.getByText(/^suspension\.closeConfirm \{.*deletesOn/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'suspension.closeConfirmButton' }));
        expect(hooks.closeSuspensionMutate).toHaveBeenCalledWith({ eventId: 'e-1', targetType: 'COMMENT', targetId: 'c-1' }, expect.anything());
        expect(hooks.liftSuspensionMutate).not.toHaveBeenCalled();
    });

    it('offers neither lift nor close once the StoryWall is closed', () => {
        hooks.detail = {
            ...baseDetail,
            eventSuspension: {
                decisionId: 'd-1',
                suspendedAt: '2026-10-01T10:00:00Z',
                closedAt: '2026-10-02T10:00:00Z',
                deletesOn: '2026-11-01T10:00:00Z',
            },
        };
        renderDrawer();
        expect(screen.getByText(/^suspension\.closedStatus \{.*deletesOn/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'suspension.lift' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'suspension.close' })).toBeNull();
    });

    it('moves focus into the confirm, and back to the button on cancel', () => {
        hooks.detail = {
            ...baseDetail,
            eventSuspension: { decisionId: 'd-1', suspendedAt: '2026-10-01T10:00:00Z', closedAt: null, deletesOn: '2026-11-01T10:00:00Z' },
        };
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'suspension.close' }));
        expect(document.activeElement).toBe(screen.getByRole('group', { name: 'suspension.close' }));
        fireEvent.click(screen.getByRole('button', { name: 'suspension.cancel' }));
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'suspension.close' }));
    });

    it('returns focus to the lift button after a successful lift', () => {
        hooks.liftSuspensionMutate.mockImplementation((_vars: unknown, options: { onSuccess: () => void }) => options.onSuccess());
        hooks.detail = {
            ...baseDetail,
            eventSuspension: { decisionId: 'd-1', suspendedAt: '2026-10-01T10:00:00Z', closedAt: null, deletesOn: '2026-11-01T10:00:00Z' },
        };
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'suspension.lift' }));
        fireEvent.click(screen.getByRole('button', { name: 'suspension.liftConfirmButton' }));
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'suspension.lift' }));
    });

    it('disables Confirm and Cancel while the suspension action is pending', () => {
        hooks.detail = {
            ...baseDetail,
            eventSuspension: { decisionId: 'd-1', suspendedAt: '2026-10-01T10:00:00Z', closedAt: null, deletesOn: '2026-11-01T10:00:00Z' },
        };
        hooks.suspensionPending = true;
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'suspension.close' }));
        expect((screen.getByRole('button', { name: 'suspension.closeConfirmButton' }) as HTMLButtonElement).disabled).toBe(true);
        expect((screen.getByRole('button', { name: 'suspension.cancel' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('shows the refusal when a lift hits 5112', () => {
        hooks.liftSuspensionError = new Error('This StoryWall has been closed.');
        hooks.detail = {
            ...baseDetail,
            eventSuspension: { decisionId: 'd-1', suspendedAt: '2026-10-01T10:00:00Z', closedAt: null, deletesOn: '2026-11-01T10:00:00Z' },
        };
        renderDrawer();
        expect(screen.getByRole('alert').textContent).toBe('This StoryWall has been closed.');
    });

    it('shows the refusal when a close hits 5111', () => {
        hooks.closeSuspensionError = new Error('This StoryWall is no longer suspended.');
        hooks.detail = {
            ...baseDetail,
            eventSuspension: { decisionId: 'd-1', suspendedAt: '2026-10-01T10:00:00Z', closedAt: null, deletesOn: '2026-11-01T10:00:00Z' },
        };
        renderDrawer();
        expect(screen.getByRole('alert').textContent).toBe('This StoryWall is no longer suspended.');
    });
});

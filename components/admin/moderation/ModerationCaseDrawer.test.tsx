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
    allowedActions: { removeContent: true, removeMember: true, banFromEvent: true, suspendAccount: true },
    decisions: [],
    priorDecisionsAgainstAuthor: [],
    bans: [],
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
                    note: null,
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
});

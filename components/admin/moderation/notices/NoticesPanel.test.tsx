import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NoticesPanel } from '@/components/admin/moderation/notices/NoticesPanel';
import type { ContentNoticeSummaryDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ useAdminNotices: vi.fn() }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (error: Error) => error.message }));
vi.mock('@/hooks/useAdminNotices', () => ({ useAdminNotices: (...args: unknown[]) => hooks.useAdminNotices(...args) }));
vi.mock('@/components/admin/moderation/notices/NoticeDrawer', () => ({
    NoticeDrawer: ({ id }: { id: string }) => <div>drawer {id}</div>,
}));

const notice: ContentNoticeSummaryDto = {
    id: 'n-1',
    reference: 'AB12CD34',
    category: 'COPYRIGHT',
    locationExcerpt: 'The photo on the main wall',
    status: 'NEW',
    closeReason: null,
    outcome: null,
    createdAt: '2026-09-30T10:00:00Z',
    handledAt: null,
};

function mockRows(rows: ContentNoticeSummaryDto[]) {
    hooks.useAdminNotices.mockReturnValue({
        data: { content: rows, page: { size: 50, number: 0, totalElements: rows.length, totalPages: 1 } },
        error: null,
        isLoading: false,
    });
}

beforeEach(() => {
    hooks.useAdminNotices.mockReset();
    mockRows([notice]);
});
afterEach(cleanup);

describe('NoticesPanel', () => {
    it('switches the view passed to the query', () => {
        render(<NoticesPanel />);
        expect(hooks.useAdminNotices).toHaveBeenLastCalledWith('NEW', 0);
        fireEvent.click(screen.getByRole('button', { name: 'views.CLOSED' }));
        expect(hooks.useAdminNotices).toHaveBeenLastCalledWith('CLOSED', 0);
        fireEvent.click(screen.getByRole('button', { name: 'views.NEW' }));
        expect(hooks.useAdminNotices).toHaveBeenLastCalledWith('NEW', 0);
    });

    it('shows reference, category, excerpt and date, and no email', () => {
        render(<NoticesPanel />);
        expect(screen.getByText('#AB12CD34')).toBeTruthy();
        expect(screen.getByText('COPYRIGHT')).toBeTruthy();
        expect(screen.getByText('The photo on the main wall')).toBeTruthy();
        expect(screen.getByText('Sep 30, 2026')).toBeTruthy();
        expect(screen.getByText('statusNew')).toBeTruthy();
        expect(screen.queryByText('pending')).toBeNull();
        expect(document.body.textContent).not.toContain('@');
    });

    it('says pending only for an attached notice whose case is undecided', () => {
        mockRows([{ ...notice, status: 'ATTACHED' }]);
        render(<NoticesPanel />);
        expect(screen.getByText('pending')).toBeTruthy();
        expect(screen.queryByText('statusNew')).toBeNull();
    });

    it('shows the outcome, else the close reason, for a closed row', () => {
        mockRows([
            { ...notice, id: 'n-2', status: 'ATTACHED', outcome: 'ACTION_TAKEN' },
            { ...notice, id: 'n-3', status: 'CLOSED', closeReason: 'SPAM' },
        ]);
        render(<NoticesPanel />);
        expect(screen.getByText('ACTION_TAKEN')).toBeTruthy();
        expect(screen.getByText('closeReasons.SPAM')).toBeTruthy();
    });

    it('opens the drawer for the clicked row', () => {
        render(<NoticesPanel />);
        expect(screen.queryByText('drawer n-1')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'openNotice {"reference":"AB12CD34"}' }));
        expect(screen.getByText('drawer n-1')).toBeTruthy();
    });
});

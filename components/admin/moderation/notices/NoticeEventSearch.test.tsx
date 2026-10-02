import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NoticeEventSearch } from '@/components/admin/moderation/notices/NoticeEventSearch';

const hooks = vi.hoisted(() => ({ useNoticeEventSearch: vi.fn() }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (error: Error) => error.message }));
vi.mock('@/hooks/useAdminNotices', () => ({ useNoticeEventSearch: (...args: unknown[]) => hooks.useNoticeEventSearch(...args) }));

beforeEach(() => {
    hooks.useNoticeEventSearch.mockReset();
    hooks.useNoticeEventSearch.mockReturnValue({
        data: {
            content: [
                {
                    eventId: 'e-1',
                    title: 'Maria & Nikos',
                    startAt: '2026-09-20T10:00:00Z',
                    primaryHostName: 'Maria',
                    status: 'ACTIVE',
                    deleted: true,
                },
            ],
            page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
        },
        error: null,
        isFetching: false,
    });
});
afterEach(cleanup);

describe('NoticeEventSearch', () => {
    it('limits the inputs and uses a date input', () => {
        render(<NoticeEventSearch noticeId="n-1" onPickAction={vi.fn()} />);
        expect(screen.getByLabelText('search.title').getAttribute('maxlength')).toBe('200');
        expect(screen.getByLabelText('search.hostEmail').getAttribute('maxlength')).toBe('320');
        expect(screen.getByLabelText('search.date').getAttribute('type')).toBe('date');
    });

    it('searches on submit, not on every keystroke', () => {
        render(<NoticeEventSearch noticeId="n-1" onPickAction={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('search.title'), { target: { value: 'Maria' } });
        expect(hooks.useNoticeEventSearch).toHaveBeenLastCalledWith('n-1', { q: '', hostEmail: '', date: '' }, 0);
        fireEvent.click(screen.getByRole('button', { name: 'search.submit' }));
        expect(hooks.useNoticeEventSearch).toHaveBeenLastCalledWith('n-1', { q: 'Maria', hostEmail: '', date: '' }, 0);
    });

    it('marks a deleted event and picks it by id', () => {
        const onPick = vi.fn();
        render(<NoticeEventSearch noticeId="n-1" onPickAction={onPick} />);
        expect(screen.getByText('search.deleted')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'search.chooseEvent {"title":"Maria & Nikos"}' }));
        expect(onPick).toHaveBeenCalledWith('e-1');
    });
});

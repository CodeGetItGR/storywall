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

const NO_FILTERS = { q: '', hostEmail: '', date: '' };

function renderSearch(props: Partial<Parameters<typeof NoticeEventSearch>[0]> = {}) {
    const onSearchAction = vi.fn();
    const onPickAction = vi.fn();
    render(<NoticeEventSearch noticeId="n-1" applied={NO_FILTERS} onSearchAction={onSearchAction} onPickAction={onPickAction} {...props} />);
    return { onSearchAction, onPickAction };
}

describe('NoticeEventSearch', () => {
    it('limits the inputs and uses a date input', () => {
        renderSearch();
        expect(screen.getByLabelText('search.title').getAttribute('maxlength')).toBe('200');
        expect(screen.getByLabelText('search.hostEmail').getAttribute('maxlength')).toBe('320');
        expect(screen.getByLabelText('search.date').getAttribute('type')).toBe('date');
    });

    it('reports the filters on submit, not on every keystroke', () => {
        const { onSearchAction } = renderSearch();
        fireEvent.change(screen.getByLabelText('search.title'), { target: { value: 'Maria' } });
        expect(onSearchAction).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'search.submit' }));
        expect(onSearchAction).toHaveBeenCalledWith({ q: 'Maria', hostEmail: '', date: '' });
    });

    it('starts from the filters the drawer kept, so they survive a Back from the picker', () => {
        renderSearch({ applied: { q: 'Maria', hostEmail: 'host@example.com', date: '2026-09-20' } });
        expect((screen.getByLabelText('search.title') as HTMLInputElement).value).toBe('Maria');
        expect((screen.getByLabelText('search.hostEmail') as HTMLInputElement).value).toBe('host@example.com');
        expect((screen.getByLabelText('search.date') as HTMLInputElement).value).toBe('2026-09-20');
        expect(hooks.useNoticeEventSearch).toHaveBeenLastCalledWith('n-1', { q: 'Maria', hostEmail: 'host@example.com', date: '2026-09-20' }, 0);
    });

    it('counts events, not notices', () => {
        renderSearch();
        expect(screen.getByText('search.count {"count":1}')).toBeTruthy();
    });

    it('puts focus on its heading when it appears', () => {
        renderSearch();
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'search.heading' }));
    });

    it('marks a deleted event and picks it by id', () => {
        const { onPickAction: onPick } = renderSearch();
        expect(screen.getByText('search.deleted')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'search.chooseEvent {"title":"Maria & Nikos"}' }));
        expect(onPick).toHaveBeenCalledWith('e-1');
    });
});

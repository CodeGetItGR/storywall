import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NoticeDrawer } from '@/components/admin/moderation/notices/NoticeDrawer';
import { ApiError } from '@/lib/api/client';
import type { ContentNoticeDetailDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

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
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...args: unknown[]) => mocks.get(...args),
        post: (...args: unknown[]) => mocks.post(...args),
    },
}));

const newNotice: ContentNoticeDetailDto = {
    id: 'n-1',
    reference: 'AB12CD34',
    category: 'COPYRIGHT',
    locationText: 'The photo on the main wall',
    link: null,
    explanation: 'It is my photo and I never agreed.',
    notifierName: null,
    notifierEmail: null,
    locale: 'en',
    status: 'NEW',
    closeReason: null,
    closeNote: null,
    outcome: null,
    handledByUserId: null,
    handledAt: null,
    createdAt: '2026-09-30T10:00:00Z',
    attachment: null,
};

const events = {
    content: [{ eventId: 'e-1', title: 'Maria and Nikos', startAt: '2026-09-20T10:00:00Z', primaryHostName: null, status: 'ACTIVE', deleted: false }],
    page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
};

beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
});
afterEach(cleanup);

describe('NoticeDrawer, another admin handles the notice while the picker is open', () => {
    it('keeps an alert on screen after the 5109 refetch moves the notice off NEW', async () => {
        let detailReads = 0;
        mocks.get.mockImplementation((url: string) => {
            if (url.includes('/items')) return Promise.reject(new ApiError(409, { errorCode: 5109 }));
            if (url.includes('/events')) return Promise.resolve(events);
            detailReads += 1;
            return Promise.resolve(detailReads === 1 ? newNotice : { ...newNotice, status: 'ATTACHED' });
        });
        render(
            <QueryClientProvider client={new QueryClient()}>
                <NoticeDrawer id="n-1" onCloseAction={vi.fn()} />
            </QueryClientProvider>,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'actions.find' }));
        fireEvent.change(screen.getByLabelText('search.title'), { target: { value: 'Maria' } });
        fireEvent.click(screen.getByRole('button', { name: 'search.submit' }));
        fireEvent.click(await screen.findByRole('button', { name: 'search.chooseEvent {"title":"Maria and Nikos"}' }));

        await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('noticeAlreadyHandled'));
        // The notice was re-read once, and the step that failed is gone with it.
        expect(detailReads).toBe(2);
        expect(screen.queryByRole('heading', { name: 'picker.heading' })).toBeNull();
    });
});

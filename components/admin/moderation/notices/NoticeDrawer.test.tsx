import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NoticeDrawer } from '@/components/admin/moderation/notices/NoticeDrawer';
import { adminNoticeKeys } from '@/hooks/useAdminNotices';
import type { ContentNoticeDetailDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({
    detail: null as ContentNoticeDetailDto | null,
    closeMutate: vi.fn(),
    closeError: null as Error | null,
    attachMutate: vi.fn(),
    attachError: null as Error | null,
}));

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
vi.mock('@/components/admin/moderation/notices/NoticeEventSearch', () => ({
    NoticeEventSearch: function NoticeEventSearchStub({
        applied,
        onSearchAction,
        onPickAction,
    }: {
        applied: { q: string };
        onSearchAction: (filters: { q: string; hostEmail: string; date: string }) => void;
        onPickAction: (id: string) => void;
    }) {
        function pick() {
            onPickAction('e-9');
        }
        function searchMaria() {
            onSearchAction({ q: 'Maria', hostEmail: '', date: '' });
        }
        return (
            <div>
                <span>applied q={applied.q}</span>
                <button type="button" onClick={searchMaria}>
                    search maria
                </button>
                <button type="button" onClick={pick}>
                    pick event
                </button>
            </div>
        );
    },
}));
vi.mock('@/components/admin/moderation/notices/NoticeItemPicker', () => ({
    NoticeItemPicker: function NoticeItemPickerStub({
        eventId,
        onBackAction,
        onAttachAction,
    }: {
        eventId: string;
        onBackAction: () => void;
        onAttachAction: (item: unknown) => void;
    }) {
        function attach() {
            onAttachAction({ targetType: 'POST', targetId: 'p-1' });
        }
        return (
            <div>
                <button type="button" onClick={attach}>
                    attach in {eventId}
                </button>
                <button type="button" onClick={onBackAction}>
                    picker back
                </button>
            </div>
        );
    },
}));
vi.mock('@/hooks/useAdminNotices', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/hooks/useAdminNotices')>()),
    useAdminNotice: () => ({ data: hooks.detail, error: null, isLoading: false }),
    useAttachNotice: () => ({ mutate: hooks.attachMutate, isPending: false, error: hooks.attachError }),
    useCloseNotice: () => ({ mutate: hooks.closeMutate, isPending: false, error: hooks.closeError }),
}));

const base: ContentNoticeDetailDto = {
    id: 'n-1',
    reference: 'AB12CD34',
    category: 'COPYRIGHT',
    locationText: 'The photo on the main wall',
    link: 'https://example.com/post/1',
    explanation: 'It is my photo and I never agreed.',
    notifierName: 'Eleni Papadopoulou',
    notifierEmail: 'eleni@example.com',
    locale: 'el',
    status: 'NEW',
    closeReason: null,
    closeNote: null,
    outcome: null,
    handledByUserId: null,
    handledAt: null,
    createdAt: '2026-09-30T10:00:00Z',
    attachment: null,
};

beforeEach(() => {
    hooks.detail = base;
    hooks.closeError = null;
    hooks.attachError = null;
    hooks.closeMutate.mockReset();
    hooks.attachMutate.mockReset();
});
afterEach(cleanup);

const seedItems = (client: QueryClient, id: string) => client.setQueryData(adminNoticeKeys.items(id, 'e-9', 'MEDIA', 0), { content: [] });
const hasItems = (client: QueryClient, id: string) => client.getQueryData(adminNoticeKeys.items(id, 'e-9', 'MEDIA', 0)) !== undefined;

function renderDrawer(onCloseAction = vi.fn(), client = new QueryClient()) {
    const view = render(
        <QueryClientProvider client={client}>
            <NoticeDrawer id="n-1" onCloseAction={onCloseAction} />
        </QueryClientProvider>,
    );
    return Object.assign(onCloseAction, { unmount: view.unmount, rerender: view.rerender });
}

describe('NoticeDrawer', () => {
    it('shows the notifier and the explanation, and an http link opens safely', () => {
        renderDrawer();
        expect(screen.getByText('Eleni Papadopoulou')).toBeTruthy();
        expect(screen.getByText('eleni@example.com')).toBeTruthy();
        expect(screen.getByText('It is my photo and I never agreed.')).toBeTruthy();
        const link = screen.getByRole('link', { name: 'https://example.com/post/1' });
        expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('renders a non-http link as plain text', () => {
        hooks.detail = { ...base, link: 'javascript:alert(1)' };
        renderDrawer();
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText('javascript:alert(1)')).toBeTruthy();
    });

    it('says so when the notice came without an identity', () => {
        hooks.detail = { ...base, notifierName: null, notifierEmail: null };
        renderDrawer();
        expect(screen.getByText('noIdentity')).toBeTruthy();
    });

    it('offers Find and Close for a NEW notice', () => {
        renderDrawer();
        expect(screen.getByRole('button', { name: 'actions.find' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'actions.close' })).toBeTruthy();
    });

    it('needs a reason before Close is enabled, and sends it with a null note', () => {
        hooks.closeMutate.mockImplementation((_vars: unknown, options: { onSuccess: () => void }) => options.onSuccess());
        const onClose = renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'actions.close' }));
        const confirm = screen.getByRole('button', { name: 'actions.confirmClose' }) as HTMLButtonElement;
        expect(confirm.disabled).toBe(true);
        fireEvent.click(screen.getByRole('radio', { name: 'closeReasons.NOT_FOUND' }));
        expect(confirm.disabled).toBe(false);
        fireEvent.click(confirm);
        expect(hooks.closeMutate).toHaveBeenCalledWith({ id: 'n-1', reason: 'NOT_FOUND', note: null }, expect.anything());
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('sends a non-blank close note trimmed', () => {
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'actions.close' }));
        fireEvent.click(screen.getByRole('radio', { name: 'closeReasons.SPAM' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'closeNote' }), { target: { value: '  looked fine  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'actions.confirmClose' }));
        expect(hooks.closeMutate).toHaveBeenCalledWith({ id: 'n-1', reason: 'SPAM', note: 'looked fine' }, expect.anything());
    });

    it('sends a blank close note as null', () => {
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'actions.close' }));
        fireEvent.click(screen.getByRole('radio', { name: 'closeReasons.SPAM' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'closeNote' }), { target: { value: '   ' } });
        fireEvent.click(screen.getByRole('button', { name: 'actions.confirmClose' }));
        expect(hooks.closeMutate).toHaveBeenCalledWith({ id: 'n-1', reason: 'SPAM', note: null }, expect.anything());
    });

    it('titles the drawer with the reference, and falls back to the loading label', () => {
        renderDrawer();
        expect(screen.getByRole('heading', { name: 'drawerTitle {"reference":"AB12CD34"}' })).toBeTruthy();
        cleanup();
        hooks.detail = null;
        renderDrawer();
        expect(screen.getByRole('heading', { name: 'loading' })).toBeTruthy();
    });

    it('drops this notice browse cache when it unmounts, and only this notice', () => {
        const client = new QueryClient();
        seedItems(client, 'n-1');
        seedItems(client, 'n-2');
        const view = renderDrawer(vi.fn(), client);
        expect(hasItems(client, 'n-1')).toBe(true);
        view.unmount();
        expect(hasItems(client, 'n-1')).toBe(false);
        expect(hasItems(client, 'n-2')).toBe(true);
    });

    it('drops the browse cache on Back from the picker, and again on Back from the search', () => {
        const client = new QueryClient();
        renderDrawer(vi.fn(), client);
        fireEvent.click(screen.getByRole('button', { name: 'actions.find' }));
        fireEvent.click(screen.getByRole('button', { name: 'pick event' }));
        seedItems(client, 'n-1');
        fireEvent.click(screen.getByRole('button', { name: 'picker back' }));
        expect(hasItems(client, 'n-1')).toBe(false);
        expect(screen.getByRole('button', { name: 'pick event' })).toBeTruthy();

        seedItems(client, 'n-1');
        fireEvent.click(screen.getByRole('button', { name: 'actions.back' }));
        expect(hasItems(client, 'n-1')).toBe(false);
    });

    it('keeps the search filters across a Back from the picker', () => {
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'actions.find' }));
        fireEvent.click(screen.getByRole('button', { name: 'search maria' }));
        fireEvent.click(screen.getByRole('button', { name: 'pick event' }));
        fireEvent.click(screen.getByRole('button', { name: 'picker back' }));
        expect(screen.getByText('applied q=Maria')).toBeTruthy();
    });

    it('returns focus to Find when the find step is left', () => {
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'actions.find' }));
        fireEvent.click(screen.getByRole('button', { name: 'actions.back' }));
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'actions.find' }));
    });

    it('caps the close note at 2000 characters', () => {
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'actions.close' }));
        expect(screen.getByRole('textbox', { name: 'closeNote' }).getAttribute('maxlength')).toBe('2000');
    });

    it('attaches with the event the admin picked', () => {
        hooks.attachMutate.mockImplementation((_vars: unknown, options: { onSuccess: () => void }) => options.onSuccess());
        const onClose = renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'actions.find' }));
        fireEvent.click(screen.getByRole('button', { name: 'pick event' }));
        fireEvent.click(screen.getByRole('button', { name: 'attach in e-9' }));
        expect(hooks.attachMutate).toHaveBeenCalledWith({ id: 'n-1', eventId: 'e-9', targetType: 'POST', targetId: 'p-1' }, expect.anything());
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows the attachment and offers no actions for an ATTACHED notice', () => {
        hooks.detail = {
            ...base,
            status: 'ATTACHED',
            attachment: { reportId: 'r-1', eventId: 'e-1', targetType: 'COMMENT', targetId: 'c-1' },
        };
        renderDrawer();
        expect(screen.getByText('COMMENT · pending')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'actions.find' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'actions.close' })).toBeNull();
    });

    it('shows the outcome, and copes with an attachment lost to a purge', () => {
        hooks.detail = { ...base, status: 'ATTACHED', outcome: 'DISMISSED', attachment: null };
        renderDrawer();
        expect(screen.getByText('attachmentGone · DISMISSED')).toBeTruthy();
    });

    it('shows the close reason and note for a CLOSED notice', () => {
        hooks.detail = { ...base, status: 'CLOSED', closeReason: 'NO_BREACH', closeNote: 'Looked fine' };
        renderDrawer();
        expect(screen.getByText('closeReasons.NO_BREACH')).toBeTruthy();
        expect(screen.getByText('Looked fine')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'actions.find' })).toBeNull();
    });

    it('says another admin handled it when the notice leaves NEW without our own mutation', () => {
        const client = new QueryClient();
        const view = renderDrawer(vi.fn(), client);
        expect(screen.queryByRole('alert')).toBeNull();
        hooks.detail = { ...base, status: 'ATTACHED', attachment: null };
        view.rerender(
            <QueryClientProvider client={client}>
                <NoticeDrawer id="n-1" onCloseAction={vi.fn()} />
            </QueryClientProvider>,
        );
        expect(screen.getByRole('alert').textContent).toBe('noticeAlreadyHandled');
    });

    it('does not say that for a notice that was never NEW', () => {
        hooks.detail = { ...base, status: 'CLOSED', closeReason: 'SPAM' };
        renderDrawer();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('keeps a 5109 refusal visible once the refetch has moved the notice off NEW', () => {
        hooks.closeError = new Error('Another admin has already handled this notice.');
        hooks.detail = { ...base, status: 'CLOSED', closeReason: 'SPAM' };
        renderDrawer();
        expect(screen.getByRole('alert').textContent).toBe('Another admin has already handled this notice.');
    });
});

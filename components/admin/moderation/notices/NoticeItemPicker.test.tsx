import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NoticeItemPicker } from '@/components/admin/moderation/notices/NoticeItemPicker';
import { adminNoticeKeys } from '@/hooks/useAdminNotices';
import type { NoticeItemCandidateDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ useNoticeItems: vi.fn() }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (error: Error) => error.message }));
vi.mock('@/hooks/useAdminNotices', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/hooks/useAdminNotices')>()),
    useNoticeItems: (...args: unknown[]) => hooks.useNoticeItems(...args),
}));

const item: NoticeItemCandidateDto = {
    targetType: 'MEDIA',
    targetId: 'm-1',
    text: null,
    thumbnailUrl: 'https://cdn.example/m-1.jpg',
    authorDisplayName: 'Kostas',
    createdAt: '2026-09-29T10:00:00Z',
};

function result(items: NoticeItemCandidateDto[]) {
    return { data: { content: items, page: { size: 30, number: 0, totalElements: items.length, totalPages: 1 } }, error: null, isLoading: false };
}

function renderPicker(client = new QueryClient()) {
    const onAttachAction = vi.fn();
    const view = render(
        <QueryClientProvider client={client}>
            <NoticeItemPicker noticeId="n-1" eventId="e-1" isAttaching={false} onBackAction={vi.fn()} onAttachAction={onAttachAction} />
        </QueryClientProvider>,
    );
    return { ...view, onAttachAction };
}

beforeEach(() => {
    hooks.useNoticeItems.mockReset();
    hooks.useNoticeItems.mockReturnValue(result([item]));
});
afterEach(cleanup);

describe('NoticeItemPicker', () => {
    it('offers the 7 types with MEDIA selected and queries only that type', () => {
        renderPicker();
        const select = screen.getByRole('combobox', { name: 'picker.type' }) as HTMLSelectElement;
        expect(select.options).toHaveLength(7);
        expect(select.value).toBe('MEDIA');
        expect(hooks.useNoticeItems).toHaveBeenCalled();
        for (const call of hooks.useNoticeItems.mock.calls) expect(call.slice(0, 4)).toEqual(['n-1', 'e-1', 'MEDIA', 0]);
    });

    it('queries POST only after the admin picks it, back at page 0', () => {
        renderPicker();
        fireEvent.change(screen.getByRole('combobox', { name: 'picker.type' }), { target: { value: 'POST' } });
        expect(hooks.useNoticeItems).toHaveBeenLastCalledWith('n-1', 'e-1', 'POST', 0);
    });

    it('attaches the picked item after a confirm step', () => {
        const { onAttachAction } = renderPicker();
        const attach = screen.getByRole('button', { name: 'actions.attach' }) as HTMLButtonElement;
        expect(attach.disabled).toBe(true);
        fireEvent.click(screen.getByRole('radio'));
        fireEvent.click(attach);
        expect(onAttachAction).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'actions.confirmAttachButton' }));
        expect(onAttachAction).toHaveBeenCalledWith(item);
    });

    it('drops the browse cache when it unmounts, so reopening it is a new logged browse', () => {
        const client = new QueryClient();
        client.setQueryData(adminNoticeKeys.items('n-1', 'e-1', 'MEDIA', 0), { content: [] });
        client.setQueryData(adminNoticeKeys.items('n-2', 'e-1', 'MEDIA', 0), { content: [] });
        const { unmount } = renderPicker(client);
        expect(client.getQueryData(adminNoticeKeys.items('n-1', 'e-1', 'MEDIA', 0))).toBeDefined();
        unmount();
        expect(client.getQueryData(adminNoticeKeys.items('n-1', 'e-1', 'MEDIA', 0))).toBeUndefined();
        // Another notice's picker cache is not touched.
        expect(client.getQueryData(adminNoticeKeys.items('n-2', 'e-1', 'MEDIA', 0))).toBeDefined();
    });
});

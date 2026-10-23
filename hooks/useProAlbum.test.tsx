import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProAlbum } from '@/hooks/useProAlbum';

const upload = vi.fn();
const del = vi.fn();
const invalidate = vi.fn();
const items = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@tanstack/react-query')>()),
    useQueryClient: () => ({ invalidateQueries: invalidate }),
}));
vi.mock('@/hooks/useMedia', () => ({
    useEventMedia: () => ({ data: { pages: [{ content: items.value }] }, isLoading: false, hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false }),
    useUploadMediaBatch: () => ({ mutateAsync: upload, isPending: false }),
    useDeleteMedia: () => ({ mutateAsync: del, isPending: false }),
}));
vi.mock('@/providers/EventProvider', () => ({ useActiveMember: () => ({ id: 'me' }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

beforeEach(() => {
    upload.mockReset();
    del.mockReset();
    invalidate.mockReset();
    items.value = [
        { id: 'mine', uploaderMemberId: 'me' },
        { id: 'theirs', uploaderMemberId: 'other' },
    ];
});

describe('useProAlbum', () => {
    it('lists only the vendor’s own Pro items', () => {
        const { result } = renderHook(() => useProAlbum('e1'));
        expect(result.current.items.map((item) => item.id)).toEqual(['mine']);
    });

    it('uploads the chosen files to the Pro album and refreshes the meter', async () => {
        upload.mockResolvedValue({ created: [{ id: 'new' }], failed: [] });
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        const { result } = renderHook(() => useProAlbum('e1'));
        act(() => result.current.chooseFiles([file]));
        await act(() => result.current.upload());
        expect(upload).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'e1', files: [file], context: 'PRO' }));
        expect(result.current.notice).toBe('me.proUploaded');
        expect(result.current.selectedFiles).toEqual([]);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'e1', 'vendors', 'me'] });
    });

    it('counts files that did not upload', async () => {
        upload.mockResolvedValue({
            created: [],
            failed: [
                { filename: 'a.jpg', errorCode: 'X', message: 'x' },
                { filename: 'b.jpg', errorCode: 'X', message: 'x' },
            ],
        });
        const { result } = renderHook(() => useProAlbum('e1'));
        act(() => result.current.chooseFiles([new File(['x'], 'a.jpg'), new File(['x'], 'b.jpg')]));
        await act(() => result.current.upload());
        expect(result.current.notice).toBe('me.proUploadFailed:{"count":2}');
    });

    it('shows the server error when the upload fails', async () => {
        upload.mockRejectedValue(new Error('413'));
        const { result } = renderHook(() => useProAlbum('e1'));
        act(() => result.current.chooseFiles([new File(['x'], 'a.jpg')]));
        await act(() => result.current.upload());
        expect(result.current.notice).toBe('failed');
    });

    it('deletes an own item after the confirmation', async () => {
        del.mockResolvedValue(undefined);
        const { result } = renderHook(() => useProAlbum('e1'));
        act(() => result.current.requestDelete('mine'));
        expect(result.current.deleteTargetId).toBe('mine');
        await act(() => result.current.confirmDelete());
        expect(del).toHaveBeenCalledWith('mine');
        expect(result.current.deleteTargetId).toBeNull();
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'e1', 'vendors', 'me'] });
    });
});

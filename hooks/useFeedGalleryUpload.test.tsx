import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFeedGalleryUpload } from '@/hooks/useFeedGalleryUpload';
import type { EventDetailResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    frameControl: null as object | null,
    prepare: vi.fn<(files: File[]) => Promise<{ files: File[]; notice: string | null }>>(),
    mutateAsync: vi.fn(),
}));

vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useMedia', () => ({ useUploadMediaBatch: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }) }));
vi.mock('@/hooks/useSlowUpload', () => ({ useSlowUpload: () => false }));
vi.mock('@/hooks/useUploadFrame', () => ({ useUploadFrame: () => ({ control: mocks.frameControl, prepare: mocks.prepare }) }));

afterEach(() => {
    cleanup();
    mocks.frameControl = null;
    mocks.prepare.mockReset();
    mocks.mutateAsync.mockReset();
});

const event = { id: 'e1', title: 'Maria', uploadFrame: 'CLASSIC', schedule: { startAt: null, timezone: null } } as unknown as EventDetailResponseDto;
const pick = (file: File) => ({ target: { files: [file], value: '' } }) as never;

describe('useFeedGalleryUpload frame', () => {
    it('uploads the framed photos, shows busy while framing, and keeps the frame notice', async () => {
        mocks.frameControl = { on: true };
        const original = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        const framed = new File(['y'], 'a.jpg', { type: 'image/jpeg' });
        let finish!: (value: { files: File[]; notice: string | null }) => void;
        mocks.prepare.mockReturnValue(new Promise((resolve) => (finish = resolve)));
        mocks.mutateAsync.mockResolvedValue({ created: [{ id: 'm' }], failed: [] });
        const { result } = renderHook(() => useFeedGalleryUpload(event));

        let first!: Promise<void>;
        act(() => {
            first = result.current.onFiles(pick(original));
        });
        expect(result.current.uploading).toBe(true);
        expect(mocks.mutateAsync).not.toHaveBeenCalled();
        // A second pick while the first is under way does nothing.
        await act(async () => {
            await result.current.onFiles(pick(original));
        });
        expect(mocks.prepare).toHaveBeenCalledTimes(1);

        await act(async () => {
            finish({ files: [framed], notice: 'x' });
            await first;
        });
        expect(mocks.prepare).toHaveBeenCalledWith([original]);
        expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'e1', files: [framed] }));
        expect(result.current.uploading).toBe(false);
        expect(result.current.notice).toContain('x');
    });

    it('uploads the photos as picked when the event has no frame', async () => {
        const original = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        mocks.mutateAsync.mockResolvedValue({ created: [{ id: 'm' }], failed: [] });
        const { result } = renderHook(() => useFeedGalleryUpload(event));
        await act(async () => {
            await result.current.onFiles(pick(original));
        });
        expect(mocks.prepare).not.toHaveBeenCalled();
        expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ files: [original] }));
    });
});

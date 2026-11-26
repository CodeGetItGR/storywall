import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type UploadFrameSource, useUploadFrame } from '@/hooks/useUploadFrame';
import en from '@/messages/en.json';

const { framePhotosForUpload } = vi.hoisted(() => ({ framePhotosForUpload: vi.fn() }));
vi.mock('@/lib/uploadImageResize', () => ({ framePhotosForUpload }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));

const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
        {children}
    </NextIntlClientProvider>
);
let nextId = 0;
const source = (frame: UploadFrameSource['frame']): UploadFrameSource => ({
    eventId: `e${++nextId}`,
    frame,
    title: 'Maria',
    startAt: '2026-07-01T10:00:00Z',
    timezone: 'Europe/Athens',
});
const photo = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

afterEach(() => {
    framePhotosForUpload.mockReset();
    sessionStorage.clear();
});

describe('useUploadFrame', () => {
    it('offers nothing on an event without a frame, and sends the files as they are', async () => {
        for (const frame of [undefined, 'NONE' as const]) {
            const event = source(frame);
            const { result } = renderHook(() => useUploadFrame(event), { wrapper });
            expect(result.current.control).toBeNull();
            expect(await result.current.prepare([photo])).toEqual({ files: [photo], notice: null });
        }
        expect(framePhotosForUpload).not.toHaveBeenCalled();
    });

    it('starts off, with the frame preview', async () => {
        const event = source('CLASSIC');
        const { result } = renderHook(() => useUploadFrame(event), { wrapper });
        expect(result.current.control).toMatchObject({ on: false, label: 'Add frame', alt: 'Graduation frame preview' });
        expect(result.current.control?.previewSrc).toMatch(/^data:image\/svg\+xml/);
        expect(await result.current.prepare([photo])).toEqual({ files: [photo], notice: null });
    });

    it('frames the photos once turned on, with the title and date, and says when some went without', async () => {
        const framed = new File(['y'], 'a.jpg', { type: 'image/jpeg' });
        framePhotosForUpload.mockResolvedValue({ files: [framed], unframed: 1 });
        const event = source('LAUREL');
        const { result } = renderHook(() => useUploadFrame(event), { wrapper });

        act(() => result.current.control!.toggle());
        expect(result.current.control?.on).toBe(true);

        expect(await result.current.prepare([photo])).toEqual({ files: [framed], notice: 'Some photos were uploaded without the frame.' });
        expect(framePhotosForUpload).toHaveBeenCalledWith([photo], 'LAUREL', { title: 'Maria', date: 'July 1, 2026' }, expect.any(Number));
    });

    it('remembers the choice for the rest of the visit', () => {
        const event = source('CONFETTI');
        const first = renderHook(() => useUploadFrame(event), { wrapper });
        act(() => first.result.current.control!.toggle());
        first.unmount();

        expect(renderHook(() => useUploadFrame(event), { wrapper }).result.current.control?.on).toBe(true);
    });
});

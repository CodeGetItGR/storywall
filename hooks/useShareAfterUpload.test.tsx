import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useShareAfterUpload } from '@/hooks/useShareAfterUpload';
import { recordSharePromptDecline } from '@/lib/shareFiles';
import type { PublishJob } from '@/providers/publishQueue/PublishQueueContext';

const photo = new File(['a'], 'a.jpg', { type: 'image/jpeg' });

function postJob(id: string, status: PublishJob['status'] = 'success'): PublishJob {
    return {
        id,
        kind: 'post',
        status,
        createdAt: 0,
        payload: {
            eventId: 'evt-1',
            authorMemberId: 'm',
            caption: '',
            images: [{ key: 'k', file: photo, previewUrl: '', filterId: 'original', status: 'uploaded' }],
        },
    };
}

const songJob: PublishJob = { id: 'song', kind: 'song', status: 'success', createdAt: 0, payload: { eventId: 'evt-1', title: 't' } };

function render(jobs: PublishJob[], dismiss = vi.fn()) {
    return renderHook(({ list }) => useShareAfterUpload(list, dismiss), { initialProps: { list: jobs } });
}

beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }));
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: vi.fn(() => true) });
    Object.defineProperty(navigator, 'share', { configurable: true, value: vi.fn(async () => undefined) });
});

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'canShare');
    Reflect.deleteProperty(navigator, 'share');
    window.localStorage.clear();
});

describe('useShareAfterUpload', () => {
    it('opens the sheet once a post finishes, not while it uploads', async () => {
        const { result, rerender } = render([postJob('j1', 'pending')]);
        expect(result.current.sheetOpen).toBe(false);

        rerender({ list: [postJob('j1')] });
        await waitFor(() => expect(result.current.sheetOpen).toBe(true));
        expect(result.current.shareableJobIds.has('j1')).toBe(true);
    });

    it('offers nothing for songs or without share support', async () => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: vi.fn(() => false) });
        const { result } = render([songJob, postJob('j1')]);
        await act(async () => {});
        expect(result.current.sheetOpen).toBe(false);
        expect(result.current.shareableJobIds.size).toBe(0);
    });

    it('shares the files from the sheet, then closes it and dismisses the job', async () => {
        const dismiss = vi.fn();
        const { result } = render([postJob('j1')], dismiss);
        await waitFor(() => expect(result.current.sheetOpen).toBe(true));

        await act(async () => result.current.shareFromSheet());
        expect(navigator.share).toHaveBeenCalledWith({ files: [photo] });
        expect(result.current.sheetOpen).toBe(false);
        expect(dismiss).toHaveBeenCalledWith('j1');
    });

    it('keeps the sheet open when the guest cancels the share menu', async () => {
        vi.mocked(navigator.share).mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));
        const dismiss = vi.fn();
        const { result } = render([postJob('j1')], dismiss);
        await waitFor(() => expect(result.current.sheetOpen).toBe(true));

        await act(async () => result.current.shareFromSheet());
        expect(result.current.sheetOpen).toBe(true);
        expect(dismiss).not.toHaveBeenCalled();
    });

    it('counts "Not now" and stops opening the sheet after two, leaving the card button', async () => {
        const dismiss = vi.fn();
        const { result } = render([postJob('j1')], dismiss);
        await waitFor(() => expect(result.current.sheetOpen).toBe(true));
        act(() => result.current.declineSheet());
        expect(result.current.sheetOpen).toBe(false);
        expect(dismiss).toHaveBeenCalledWith('j1');

        recordSharePromptDecline('evt-1');
        const second = render([postJob('j2')]);
        await waitFor(() => expect(second.result.current.shareableJobIds.has('j2')).toBe(true));
        expect(second.result.current.sheetOpen).toBe(false);
    });

    it('shares from the card button', async () => {
        recordSharePromptDecline('evt-1');
        recordSharePromptDecline('evt-1');
        const dismiss = vi.fn();
        const { result } = render([postJob('j1')], dismiss);
        await waitFor(() => expect(result.current.shareableJobIds.has('j1')).toBe(true));

        await act(async () => result.current.shareJob('j1'));
        expect(navigator.share).toHaveBeenCalledWith({ files: [photo] });
        expect(dismiss).toHaveBeenCalledWith('j1');
    });
});

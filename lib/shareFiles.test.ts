import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    canShareFiles,
    filesForFinishedJob,
    recordSharePromptDecline,
    shareFiles,
    sharePromptDeclines,
    shouldOpenSharePrompt,
} from '@/lib/shareFiles';
import type { PublishJob } from '@/providers/publishQueue/PublishQueueContext';

vi.mock('@/lib/story/storyFilters', () => ({
    STORY_FILTER_PRESETS: [{ id: 'original' }, { id: 'warm' }],
    bakeStoryFilter: vi.fn(async (file: File) => new File([file], `baked-${file.name}`, { type: file.type })),
}));

const photo = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
const video = new File(['v'], 'v.mp4', { type: 'video/mp4' });

function stubShare({ coarse = true, canShare = true }: { coarse?: boolean; canShare?: boolean } = {}) {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: coarse && query === '(pointer: coarse)' }));
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: vi.fn(() => canShare) });
    Object.defineProperty(navigator, 'share', { configurable: true, value: vi.fn(async () => undefined) });
}

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'canShare');
    Reflect.deleteProperty(navigator, 'share');
    window.localStorage.clear();
});

describe('canShareFiles', () => {
    it('is true on a touch device that can share the files', () => {
        stubShare();
        expect(canShareFiles([photo])).toBe(true);
    });

    it('is false on a desktop pointer, without files, or when the browser refuses them', () => {
        stubShare({ coarse: false });
        expect(canShareFiles([photo])).toBe(false);
        stubShare();
        expect(canShareFiles([])).toBe(false);
        stubShare({ canShare: false });
        expect(canShareFiles([photo])).toBe(false);
    });

    it('is false without the Web Share API', () => {
        vi.stubGlobal('matchMedia', () => ({ matches: true }));
        expect(canShareFiles([photo])).toBe(false);
    });
});

describe('share prompt declines', () => {
    it('counts declines per event and stops the prompt after two', () => {
        expect(shouldOpenSharePrompt('evt-1')).toBe(true);
        recordSharePromptDecline('evt-1');
        expect(sharePromptDeclines('evt-1')).toBe(1);
        expect(shouldOpenSharePrompt('evt-1')).toBe(true);
        recordSharePromptDecline('evt-1');
        expect(shouldOpenSharePrompt('evt-1')).toBe(false);
        expect(shouldOpenSharePrompt('evt-2')).toBe(true);
    });

    it('keeps prompting when storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(() => recordSharePromptDecline('evt-1')).not.toThrow();
        expect(shouldOpenSharePrompt('evt-1')).toBe(true);
        vi.restoreAllMocks();
    });
});

describe('shareFiles', () => {
    beforeEach(() => stubShare());

    it('shares files only, with no text or link', async () => {
        await expect(shareFiles([photo])).resolves.toBe('shared');
        expect(navigator.share).toHaveBeenCalledWith({ files: [photo] });
    });

    it('tells a cancelled menu from a failure', async () => {
        vi.mocked(navigator.share).mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));
        await expect(shareFiles([photo])).resolves.toBe('cancelled');
        vi.mocked(navigator.share).mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'));
        await expect(shareFiles([photo])).resolves.toBe('failed');
    });
});

describe('filesForFinishedJob', () => {
    function postJob(images: unknown[], status = 'success'): PublishJob {
        return { id: 'j', kind: 'post', status, createdAt: 0, payload: { eventId: 'e', authorMemberId: 'm', caption: '', images } } as PublishJob;
    }

    it('bakes filtered photos again and keeps videos and unfiltered photos as they are', async () => {
        const files = await filesForFinishedJob(
            postJob([
                { key: '1', file: photo, filterId: 'warm', status: 'uploaded' },
                { key: '2', file: photo, filterId: 'original', status: 'uploaded' },
                { key: '3', file: video, filterId: 'warm', status: 'uploaded' },
            ]),
        );
        expect(files.map((file) => file.name)).toEqual(['baked-a.jpg', 'a.jpg', 'v.mp4']);
    });

    it('returns nothing for unfinished jobs, text-only posts and songs', async () => {
        expect(await filesForFinishedJob(postJob([{ key: '1', file: photo, filterId: 'original', status: 'uploaded' }], 'error'))).toEqual([]);
        expect(await filesForFinishedJob(postJob([]))).toEqual([]);
        expect(await filesForFinishedJob({ id: 's', kind: 'song', status: 'success', createdAt: 0, payload: { eventId: 'e', title: 't' } })).toEqual(
            [],
        );
    });

    it('returns the posted story files', async () => {
        const job = {
            id: 's',
            kind: 'story',
            status: 'success',
            createdAt: 0,
            postedCount: 0,
            totalCount: 2,
            payload: { eventId: 'e', authorMemberId: 'm', items: [{ file: photo, mediaId: 'm1' }, { file: video }] },
        } as unknown as PublishJob;
        expect(await filesForFinishedJob(job)).toEqual([photo]);
    });
});

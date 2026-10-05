import { describe, expect, it } from 'vitest';

import type { AppMediaConfigDto } from '@/lib/api/types';
import { getUploadLimits, splitUploadBatches, UPLOAD_REQUEST_ENVELOPE_BYTES } from '@/lib/uploadLimits';

const MB = 1024 * 1024;

function file(name: string, size: number) {
    return { name, size };
}

describe('splitUploadBatches', () => {
    const limits = { filesPerRequest: 3, requestFileBytes: 10 * MB };

    it('keeps a small selection in one request', () => {
        const files = [file('a', MB), file('b', 2 * MB)];
        expect(splitUploadBatches(files, limits)).toEqual([files]);
    });

    it('starts a new request before the byte budget would be passed', () => {
        const [a, b, c] = [file('a', 6 * MB), file('b', 4 * MB), file('c', MB)];
        expect(splitUploadBatches([a, b, c], limits)).toEqual([[a, b], [c]]);
    });

    it('also caps the number of files per request', () => {
        const files = ['a', 'b', 'c', 'd', 'e'].map((name) => file(name, 1));
        expect(splitUploadBatches(files, limits)).toEqual([files.slice(0, 3), files.slice(3)]);
    });

    it('sends a file over the budget in a request of its own, keeping the order', () => {
        const [a, big, c] = [file('a', MB), file('big', 30 * MB), file('c', MB)];
        expect(splitUploadBatches([a, big, c], limits)).toEqual([[a], [big], [c]]);
    });

    it('returns no requests for no files', () => {
        expect(splitUploadBatches([], limits)).toEqual([]);
    });
});

describe('getUploadLimits', () => {
    it('reads the caps from the config, leaving room for the multipart envelope', () => {
        const media = {
            maxFileSizeBytes: 80 * MB,
            maxRequestSizeBytes: 90 * MB,
            maxImageBytes: 20 * MB,
            maxVideoBytes: 70 * MB,
            maxStoryVideoBytes: 40 * MB,
            maxBatchUploadFiles: 7,
        } as AppMediaConfigDto;

        expect(getUploadLimits(media)).toEqual({
            imageBytes: 20 * MB,
            videoBytes: 70 * MB,
            storyVideoBytes: 40 * MB,
            requestFileBytes: 90 * MB - UPLOAD_REQUEST_ENVELOPE_BYTES,
            filesPerRequest: 7,
        });
    });

    it('never lets a per-kind cap exceed the per-file cap', () => {
        const media = {
            maxFileSizeBytes: 50 * MB,
            maxRequestSizeBytes: 90 * MB,
            maxImageBytes: 20 * MB,
            maxVideoBytes: 70 * MB,
        } as AppMediaConfigDto;

        expect(getUploadLimits(media).videoBytes).toBe(50 * MB);
    });

    it('falls back to defaults before the config has loaded', () => {
        const limits = getUploadLimits(undefined);

        expect(limits.filesPerRequest).toBeGreaterThan(0);
        expect(limits.requestFileBytes).toBeGreaterThan(0);
        expect(limits.videoBytes).toBeGreaterThan(0);
    });
});

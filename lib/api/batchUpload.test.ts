import { describe, expect, it, vi } from 'vitest';

import { uploadInBatches } from '@/lib/api/batchUpload';
import { ApiError } from '@/lib/api/client';
import type { MediaBatchUploadResponseDto, MediaResponseDto } from '@/lib/api/types';

const MB = 1024 * 1024;

function makeFile(name: string, size: number): File {
    const file = new File(['x'], name);
    Object.defineProperty(file, 'size', { value: size });
    return file;
}

function stored(files: File[]): MediaBatchUploadResponseDto {
    return { created: files.map((file) => ({ id: `id-${file.name}`, originalFilename: file.name }) as MediaResponseDto), failed: [] };
}

const limits = { filesPerRequest: 10, requestFileBytes: 99 * MB };

describe('uploadInBatches', () => {
    it('sends the files in requests under the byte budget and merges the outcome', async () => {
        const files = [makeFile('a.mp4', 60 * MB), makeFile('b.mp4', 60 * MB), makeFile('c.jpg', 5 * MB)];
        const sendBatch = vi.fn((batch: File[]) => Promise.resolve(stored(batch)));

        const result = await uploadInBatches(files, limits, sendBatch);

        expect(sendBatch.mock.calls.map(([batch]) => batch.map((file) => file.name))).toEqual([['a.mp4'], ['b.mp4', 'c.jpg']]);
        expect(result.created.map((media) => media.originalFilename)).toEqual(['a.mp4', 'b.mp4', 'c.jpg']);
        expect(result.failed).toEqual([]);
    });

    it('keeps per-file refusals from every request', async () => {
        const files = [makeFile('a.mp4', 60 * MB), makeFile('b.mp4', 60 * MB)];
        const sendBatch = vi
            .fn()
            .mockResolvedValueOnce(stored([files[0]]))
            .mockResolvedValueOnce({ created: [], failed: [{ filename: 'b.mp4', errorCode: 'MEDIA_FILE_CORRUPT', message: 'damaged' }] });

        const result = await uploadInBatches(files, limits, sendBatch);

        expect(result.created).toHaveLength(1);
        expect(result.failed).toEqual([{ filename: 'b.mp4', errorCode: 'MEDIA_FILE_CORRUPT', message: 'damaged' }]);
    });

    it('reports the unsent files as failed when a later request is refused, keeping what was stored', async () => {
        const files = [makeFile('a.mp4', 60 * MB), makeFile('b.mp4', 60 * MB), makeFile('c.mp4', 60 * MB)];
        const sendBatch = vi
            .fn()
            .mockResolvedValueOnce(stored([files[0]]))
            .mockRejectedValueOnce(new ApiError(409, { errorCode: 5008, detail: 'Storage limit reached.' }));

        const result = await uploadInBatches(files, limits, sendBatch);

        expect(sendBatch).toHaveBeenCalledTimes(2);
        expect(result.created.map((media) => media.originalFilename)).toEqual(['a.mp4']);
        expect(result.failed).toEqual([
            { filename: 'b.mp4', errorCode: 'EVENT_STORAGE_LIMIT_EXCEEDED', message: 'Storage limit reached.' },
            { filename: 'c.mp4', errorCode: 'EVENT_STORAGE_LIMIT_EXCEEDED', message: 'Storage limit reached.' },
        ]);
    });

    it('throws when the first request is refused, as a single batch would', async () => {
        const refusal = new ApiError(413, { errorCode: 3005 });
        const sendBatch = vi.fn().mockRejectedValue(refusal);

        await expect(uploadInBatches([makeFile('a.jpg', MB)], limits, sendBatch)).rejects.toBe(refusal);
    });
});

import type { AppMediaConfigDto } from '@/lib/api/types';
import { DEFAULT_UPLOAD_LIMITS } from '@/lib/appConfigDefaults';

// Room left in every request for the multipart boundaries and the form fields
// sent beside the files, so a batch filled to the byte budget still fits.
export const UPLOAD_REQUEST_ENVELOPE_BYTES = 1024 * 1024;

export interface UploadLimits {
    imageBytes: number;
    videoBytes: number;
    storyVideoBytes: number;
    // Byte budget for the files of one upload request.
    requestFileBytes: number;
    filesPerRequest: number;
}

export function getUploadLimits(media: AppMediaConfigDto | undefined): UploadLimits {
    const fileCap = media?.maxFileSizeBytes ?? DEFAULT_UPLOAD_LIMITS.maxFileSizeBytes;
    const requestBytes = media?.maxRequestSizeBytes ?? DEFAULT_UPLOAD_LIMITS.maxRequestSizeBytes;
    return {
        imageBytes: Math.min(media?.maxImageBytes ?? DEFAULT_UPLOAD_LIMITS.maxImageBytes, fileCap),
        videoBytes: Math.min(media?.maxVideoBytes ?? DEFAULT_UPLOAD_LIMITS.maxVideoBytes, fileCap),
        storyVideoBytes: Math.min(media?.maxStoryVideoBytes ?? DEFAULT_UPLOAD_LIMITS.maxStoryVideoBytes, fileCap),
        requestFileBytes: Math.max(1, requestBytes - UPLOAD_REQUEST_ENVELOPE_BYTES),
        filesPerRequest: Math.max(1, media?.maxBatchUploadFiles ?? DEFAULT_UPLOAD_LIMITS.maxBatchUploadFiles),
    };
}

// Splits files, in order, into upload requests of at most `filesPerRequest`
// files and `requestFileBytes` bytes. A file over the byte budget on its own
// still gets a request of its own (the server then refuses just that one).
export function splitUploadBatches<T extends { size: number }>(
    files: readonly T[],
    limits: Pick<UploadLimits, 'filesPerRequest' | 'requestFileBytes'>,
): T[][] {
    const batches: T[][] = [];
    let current: T[] = [];
    let currentBytes = 0;
    for (const file of files) {
        const full = current.length >= limits.filesPerRequest || (current.length > 0 && currentBytes + file.size > limits.requestFileBytes);
        if (full) {
            batches.push(current);
            current = [];
            currentBytes = 0;
        }
        current.push(file);
        currentBytes += file.size;
    }
    if (current.length > 0) batches.push(current);
    return batches;
}

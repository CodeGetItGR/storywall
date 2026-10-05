import { getErrorCodeName, getErrorMessage } from '@/lib/api/errors';
import type { MediaBatchUploadResponseDto } from '@/lib/api/types';
import { sendUploadWithBusyRetry, type UploadRetryOptions } from '@/lib/api/uploadRetry';
import { splitUploadBatches, type UploadLimits } from '@/lib/uploadLimits';

// Sends a multi-file upload as as many batch requests as the size and count
// limits need, one after another, and answers like a single batch: every
// created file in `created`, every refused one in `failed`. A request that
// fails outright after earlier ones went through doesn't throw away what was
// stored: its files and the unsent rest are reported in `failed` under that
// error's code, so a retry resends only them. A failure of the first request
// (nothing stored yet), or an abort, is thrown as before.
export async function uploadInBatches(
    files: File[],
    limits: Pick<UploadLimits, 'filesPerRequest' | 'requestFileBytes'>,
    sendBatch: (files: File[]) => Promise<MediaBatchUploadResponseDto>,
    options: UploadRetryOptions = {},
): Promise<MediaBatchUploadResponseDto> {
    const batches = splitUploadBatches(files, limits);
    const merged: MediaBatchUploadResponseDto = { created: [], failed: [] };

    for (let index = 0; index < batches.length; index += 1) {
        try {
            const result = await sendUploadWithBusyRetry(() => sendBatch(batches[index]), options);
            merged.created.push(...result.created);
            merged.failed.push(...result.failed);
        } catch (error) {
            if (index === 0 || options.signal?.aborted) throw error;
            const errorCode = getErrorCodeName(error) ?? 'INTERNAL_ERROR';
            const message = getErrorMessage(error, '');
            batches.slice(index).forEach((batch) => batch.forEach((file) => merged.failed.push({ filename: file.name, errorCode, message })));
            break;
        }
    }

    return merged;
}

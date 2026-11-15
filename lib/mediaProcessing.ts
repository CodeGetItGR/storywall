import type { MediaResponseDto } from '@/lib/api/types';

// How often a list showing a processing video checks for it. The server
// usually finishes a phone video in under a minute.
export const PROCESSING_REFRESH_MS = 5_000;

// After this, a video still processing is stuck or waiting for the retry job,
// which runs every five minutes; the list goes back to its normal refresh
// instead of polling for as long as the page stays open.
export const PROCESSING_POLL_WINDOW_MS = 15 * 60_000;

function isRecentlyProcessing(item: MediaResponseDto, now: number): boolean {
    return (
        item.mediaType === 'VIDEO' &&
        item.status === 'PROCESSING' &&
        now - Date.parse(item.createdAt) < PROCESSING_POLL_WINDOW_MS
    );
}

// The refetch interval for a list of media: its signing-window refresh, or a
// short one while a video uploaded in the last few minutes is still processing.
// Without it a video uploaded to the gallery showed as processing until the
// next signing-window refresh, up to 20 minutes after it was ready.
export function processingAwareRefreshMs(items: readonly MediaResponseDto[], baseMs: number, now: number): number {
    if (!items.some((item) => isRecentlyProcessing(item, now))) return baseMs;
    return Math.min(baseMs, PROCESSING_REFRESH_MS);
}

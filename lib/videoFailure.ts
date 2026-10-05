import type { MediaMetadata } from '@/lib/api/types';

/**
 * Terminal reasons the backend writes to `metadata.processingError` on a FAILED video. Anything else
 * (a transient reason, or one added later) gets the generic "couldn't be processed" copy.
 */
export const VIDEO_FAILURE_REASONS = [
    'VIDEO_DURATION_EXCEEDED',
    'STORY_DURATION_EXCEEDED',
    'VIDEO_RESOLUTION_EXCEEDED',
    'TRANSCODE_TIMEOUT',
] as const;

export type VideoFailureReason = (typeof VIDEO_FAILURE_REASONS)[number];

export function videoFailureReason(metadata: MediaMetadata | null | undefined): VideoFailureReason | null {
    const reason = metadata?.processingError;
    return VIDEO_FAILURE_REASONS.includes(reason as VideoFailureReason) ? (reason as VideoFailureReason) : null;
}

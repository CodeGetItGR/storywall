import { describe, expect, it } from 'vitest';

import { videoFailureReason } from './videoFailure';

describe('videoFailureReason', () => {
    it('returns a known terminal reason', () => {
        expect(videoFailureReason({ processingError: 'VIDEO_RESOLUTION_EXCEEDED' })).toBe('VIDEO_RESOLUTION_EXCEEDED');
        expect(videoFailureReason({ processingError: 'VIDEO_DURATION_EXCEEDED' })).toBe('VIDEO_DURATION_EXCEEDED');
    });

    it('returns null for an unknown, transient or missing reason', () => {
        expect(videoFailureReason({ processingError: 'TRANSCODE_FAILED' })).toBeNull();
        expect(videoFailureReason({})).toBeNull();
        expect(videoFailureReason(undefined)).toBeNull();
    });
});

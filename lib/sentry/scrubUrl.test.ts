import { describe, expect, it } from 'vitest';

import { scrubUrl } from '@/lib/sentry/scrubUrl';

describe('scrubUrl', () => {
    it('drops the query and fragment', () => {
        expect(scrubUrl('https://www.storywall.gr/reset-password?token=abc#x')).toBe('https://www.storywall.gr/reset-password');
    });

    it('replaces page tokens', () => {
        expect(scrubUrl('https://www.storywall.gr/invite/abc123')).toBe('https://www.storywall.gr/invite/:token');
        expect(scrubUrl('/q/abc123?ref=1')).toBe('/q/:token');
        expect(scrubUrl('/gift/abc123')).toBe('/gift/:token');
        expect(scrubUrl('/partners/abc123/stats')).toBe('/partners/:token/stats');
    });

    it('replaces API tokens', () => {
        expect(scrubUrl('https://api.storywall.gr/api/event-invitations/abc/accept')).toBe(
            'https://api.storywall.gr/api/event-invitations/:inviteToken/accept',
        );
        expect(scrubUrl('/api/qr/abc')).toBe('/api/qr/:token');
    });

    it('drops presigned signatures from media URLs', () => {
        expect(scrubUrl('https://bucket.r2.cloudflarestorage.com/media/1.jpg?X-Amz-Signature=s')).toBe(
            'https://bucket.r2.cloudflarestorage.com/media/1.jpg',
        );
    });

    it('keeps other paths as they are', () => {
        expect(scrubUrl('https://www.storywall.gr')).toBe('https://www.storywall.gr/');
        expect(scrubUrl('/events/42/manage')).toBe('/events/42/manage');
    });
});

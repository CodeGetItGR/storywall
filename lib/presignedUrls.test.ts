import { describe, expect, it } from 'vitest';

import { presignedUrlRefreshMs, samePresignedObject } from '@/lib/presignedUrls';

const MINUTE = 60_000;

describe('presignedUrlRefreshMs', () => {
    it('refreshes once per signing window, a third of the TTL', () => {
        expect(presignedUrlRefreshMs(60)).toBe(20 * MINUTE);
        expect(presignedUrlRefreshMs(15)).toBe(5 * MINUTE);
    });

    it('falls back to five minutes while the TTL is unknown', () => {
        expect(presignedUrlRefreshMs(undefined)).toBe(5 * MINUTE);
        expect(presignedUrlRefreshMs(0)).toBe(5 * MINUTE);
    });
});

describe('samePresignedObject', () => {
    const base = 'https://bucket.acct.r2.cloudflarestorage.com/events/e1/media/a.jpg';

    it('treats two signatures of one file as the same object', () => {
        expect(samePresignedObject(`${base}?X-Amz-Date=20260927T100000Z&X-Amz-Signature=aa`, `${base}?X-Amz-Date=20260927T102000Z&X-Amz-Signature=bb`)).toBe(true);
    });

    it('tells two files apart', () => {
        expect(samePresignedObject(`${base}?X-Amz-Signature=aa`, `${base.replace('a.jpg', 'b.jpg')}?X-Amz-Signature=aa`)).toBe(false);
    });
});

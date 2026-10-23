import { describe, expect, it } from 'vitest';

import { isDemoPath } from '@/lib/demo/demoRouting';

describe('isDemoPath', () => {
    it.each(['/demo', '/demo/', '/demo/wedding', '/demo/wedding/manage/qr'])('is true for %s', (pathname) => {
        expect(isDemoPath(pathname)).toBe(true);
    });

    it.each(['/', '/home', '/events/demo-1/feed', '/demonstration', null])('is false for %s', (pathname) => {
        expect(isDemoPath(pathname)).toBe(false);
    });
});

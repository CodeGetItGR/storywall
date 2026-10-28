import { describe, expect, it } from 'vitest';

import { demoGuestPagePath, demoGuestPagePathForEvent, isDemoPath, registerDemoEventRoute } from '@/lib/demo/demoRouting';

describe('isDemoPath', () => {
    it.each(['/demo', '/demo/', '/demo/wedding', '/demo/wedding/manage/qr'])('is true for %s', (pathname) => {
        expect(isDemoPath(pathname)).toBe(true);
    });

    it.each(['/', '/home', '/events/demo-1/feed', '/demonstration', null])('is false for %s', (pathname) => {
        expect(isDemoPath(pathname)).toBe(false);
    });
});

describe('demo guest pages', () => {
    it('lives under the event type', () => {
        expect(demoGuestPagePath('baby-shower', 'upload')).toBe('/demo/baby-shower/upload');
    });

    it('is only there for a demo event', () => {
        registerDemoEventRoute('evt-guest-demo', 'wedding');
        expect(demoGuestPagePathForEvent('evt-guest-demo', 'invite')).toBe('/demo/wedding/invite');
        expect(demoGuestPagePathForEvent('evt-real', 'invite')).toBeNull();
    });
});

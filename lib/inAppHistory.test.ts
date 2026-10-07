import { describe, expect, it } from 'vitest';

import { hasInAppPrevious, installInAppHistoryTracking } from '@/lib/inAppHistory';

describe('inAppHistory', () => {
    it('marks pushed entries and keeps the mark through replaceState', () => {
        installInAppHistoryTracking();
        expect(hasInAppPrevious()).toBe(false);

        window.history.replaceState({ kept: 1 }, '', '/home');
        expect(hasInAppPrevious()).toBe(false);

        window.history.pushState({ next: 1 }, '', '/profile');
        expect(hasInAppPrevious()).toBe(true);
        expect(window.history.state).toMatchObject({ next: 1 });

        window.history.replaceState({ other: 1 }, '', '/profile?x=1');
        expect(hasInAppPrevious()).toBe(true);
        expect(window.history.state).toMatchObject({ other: 1 });
    });
});

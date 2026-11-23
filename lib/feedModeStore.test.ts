import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveFeedModePick, storedFeedModePick, subscribeFeedModePicks } from '@/lib/feedModeStore';

afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
});

describe('feedModeStore', () => {
    it('keeps a pick per event and tells listeners when it changes', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeFeedModePicks(listener);
        saveFeedModePick('e-1', { mode: 'feed', savedDay: '2026-12-01' });
        expect(storedFeedModePick('e-1')).toBe('{"mode":"feed","savedDay":"2026-12-01"}');
        expect(storedFeedModePick('e-2')).toBeNull();
        expect(listener).toHaveBeenCalledTimes(1);
        saveFeedModePick('e-1', { mode: 'feed', savedDay: '2026-12-01' });
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });

    it('still remembers the pick for this visit when the browser store fails', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        saveFeedModePick('e-3', { mode: 'invitation', savedDay: '2026-12-01' });
        expect(storedFeedModePick('e-3')).toBe('{"mode":"invitation","savedDay":"2026-12-01"}');
    });
});

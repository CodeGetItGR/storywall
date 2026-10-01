import { describe, expect, it } from 'vitest';

import { formatDemoEventsHash, isDemoEventsHash, parseDemoEventsHash } from '@/lib/adminDemoEventsRouting';

describe('demo events hash routing', () => {
    it('round-trips an event type key', () => {
        expect(parseDemoEventsHash(formatDemoEventsHash('BABY_SHOWER'))).toBe('BABY_SHOWER');
    });

    it('treats the bare root as the list', () => {
        expect(formatDemoEventsHash(null)).toBe('#demo-events');
        expect(parseDemoEventsHash('#demo-events')).toBeNull();
    });

    it('ignores other sections', () => {
        expect(isDemoEventsHash('#demo-eventsX')).toBe(false);
        expect(parseDemoEventsHash('#plans/WEDDING')).toBeNull();
    });
});

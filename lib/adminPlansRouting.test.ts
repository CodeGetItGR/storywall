import { describe, expect, it } from 'vitest';

import { formatPlansHash, isPlansHash, parsePlansHash } from '@/lib/adminPlansRouting';

describe('parsePlansHash', () => {
    it('defaults to no event type when only #plans is given', () => {
        expect(parsePlansHash('#plans')).toEqual({ view: 'eventType', key: null });
    });

    it('reads an event type key', () => {
        expect(parsePlansHash('#plans/WEDDING')).toEqual({ view: 'eventType', key: 'WEDDING' });
    });

    it('reads the settings views', () => {
        expect(parsePlansHash('#plans/settings/modules')).toEqual({ view: 'settingsModules', key: null });
        expect(parsePlansHash('#plans/settings/event-types')).toEqual({ view: 'settingsEventTypes', key: null });
    });

    it('maps legacy hashes', () => {
        expect(parsePlansHash('#event-plans')).toEqual({ view: 'eventType', key: null });
        expect(parsePlansHash('#modules')).toEqual({ view: 'settingsModules', key: null });
        expect(parsePlansHash('#event-types')).toEqual({ view: 'settingsEventTypes', key: null });
    });

    it('falls back for junk', () => {
        expect(parsePlansHash('#plans/settings/whatever')).toEqual({ view: 'eventType', key: null });
    });
});

describe('formatPlansHash', () => {
    it('round-trips every view', () => {
        expect(formatPlansHash({ view: 'eventType', key: null })).toBe('#plans');
        expect(formatPlansHash({ view: 'eventType', key: 'BAPTISM' })).toBe('#plans/BAPTISM');
        expect(formatPlansHash({ view: 'settingsModules', key: null })).toBe('#plans/settings/modules');
        expect(formatPlansHash({ view: 'settingsEventTypes', key: null })).toBe('#plans/settings/event-types');
    });
});

describe('isPlansHash', () => {
    it('recognises new and legacy hashes', () => {
        expect(isPlansHash('#plans')).toBe(true);
        expect(isPlansHash('#plans/WEDDING')).toBe(true);
        expect(isPlansHash('#modules')).toBe(true);
        expect(isPlansHash('#event-types')).toBe(true);
        expect(isPlansHash('#event-plans')).toBe(true);
        expect(isPlansHash('#metrics')).toBe(false);
        expect(isPlansHash('#plansx')).toBe(false);
    });
});

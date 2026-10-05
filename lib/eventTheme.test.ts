import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { canPickTheme, eventThemeStyle, isHexColor } from '@/lib/eventTheme';

describe('isHexColor', () => {
    it('accepts #RRGGBB in either case', () => {
        expect(isHexColor('#BFE6E2')).toBe(true);
        expect(isHexColor('#bfe6e2')).toBe(true);
    });

    it('rejects everything else', () => {
        expect(isHexColor('#FFF')).toBe(false);
        expect(isHexColor('BFE6E2')).toBe(false);
        expect(isHexColor('red')).toBe(false);
        expect(isHexColor('#BFE6E2;color:red')).toBe(false);
        expect(isHexColor('')).toBe(false);
    });
});

describe('eventThemeStyle', () => {
    it('sets --event-bg for a #RRGGBB colour', () => {
        expect(eventThemeStyle('#BFE6E2')).toEqual({ '--event-bg': '#BFE6E2' });
    });

    it('is undefined without a colour, so the default background shows', () => {
        expect(eventThemeStyle(null)).toBeUndefined();
        expect(eventThemeStyle(undefined)).toBeUndefined();
        expect(eventThemeStyle('')).toBeUndefined();
    });

    it('ignores a value that is not #RRGGBB', () => {
        expect(eventThemeStyle('url(https://example.com/x.png)')).toBeUndefined();
    });
});

describe('canPickTheme', () => {
    const NOW = Date.parse('2026-10-05T12:00:00Z');
    function event(overrides: Record<string, unknown> = {}) {
        return {
            // isAvailable is false for every non-ACTIVE event, so it must not matter.
            modules: [{ moduleKey: 'theme', isAvailable: false, isEnabled: true }],
            deletedAt: null,
            suspended: false,
            schedule: { endAt: null },
            ...overrides,
        } as unknown as Pick<EventDetailResponseDto, 'modules' | 'deletedAt' | 'suspended' | 'schedule'>;
    }

    it('is true for an enabled theme row even when isAvailable is false (a draft)', () => {
        expect(canPickTheme(event(), NOW)).toBe(true);
    });

    it('is false when the row is missing or not enabled', () => {
        expect(canPickTheme(event({ modules: [] }), NOW)).toBe(false);
        expect(canPickTheme(event({ modules: [{ moduleKey: 'theme', isAvailable: true, isEnabled: false }] }), NOW)).toBe(false);
        expect(canPickTheme(event({ modules: [{ moduleKey: 'rsvp', isAvailable: true, isEnabled: true }] }), NOW)).toBe(false);
    });

    it('is false for a deleted, suspended or ended event', () => {
        expect(canPickTheme(event({ deletedAt: '2026-10-01T00:00:00Z' }), NOW)).toBe(false);
        expect(canPickTheme(event({ suspended: true }), NOW)).toBe(false);
        expect(canPickTheme(event({ schedule: { endAt: '2026-10-01T00:00:00Z' } }), NOW)).toBe(false);
        expect(canPickTheme(event({ schedule: { endAt: '2026-12-01T00:00:00Z' } }), NOW)).toBe(true);
    });
});

import { describe, expect, it } from 'vitest';

import type { ThemePresetDto } from '@/lib/api/types';
import {
    adjacentCreateEventStep,
    createEventDetailsRequest,
    effectiveThemePresetId,
    isThemeStepAvailable,
    parseCreateEventStep,
    resolveCreateEventStep,
    resolveCreateEventType,
    visibleCreateEventSteps,
} from '@/lib/createEventSteps';
import { eventTypeSlug } from '@/lib/eventTypeSlug';

const SWAN = {
    id: 'p1',
    key: 'swan',
    name: { en: 'Swan', el: 'Κύκνος' },
    backgroundColor: '#FFCCEF',
    illustrationUrl: 'u',
    titleColor: null,
    headingFont: null,
} as ThemePresetDto;

describe('createEventSteps', () => {
    it('parses the theme step and falls back to the type step', () => {
        expect(parseCreateEventStep('theme')).toBe('theme');
        expect(parseCreateEventStep('nope')).toBe('type');
    });

    it('opens on the plan step when the link names an enabled type and no step', () => {
        const enabled = ['WEDDING', 'BAPTISM'] as const;
        expect(resolveCreateEventStep(null, enabled, eventTypeSlug('BAPTISM'))).toBe('plan');
        expect(resolveCreateEventStep('type', enabled, eventTypeSlug('BAPTISM'))).toBe('type');
        expect(resolveCreateEventStep(null, enabled, 'nope')).toBe('type');
        expect(resolveCreateEventStep(null, [], eventTypeSlug('BAPTISM'))).toBe('type');
        expect(resolveCreateEventStep(null, enabled, null)).toBe('type');
    });

    it('shows the theme step between details and overview only when available', () => {
        expect(visibleCreateEventSteps(true, true)).toEqual(['type', 'plan', 'details', 'theme', 'overview']);
        expect(visibleCreateEventSteps(false, true)).toEqual(['type', 'plan', 'details', 'overview']);
    });

    it('drops the details step for a plan that does not ask for them', () => {
        expect(visibleCreateEventSteps(false, false)).toEqual(['type', 'plan', 'overview']);
        expect(visibleCreateEventSteps(true, false)).toEqual(['type', 'plan', 'theme', 'overview']);
    });

    it('moves between the steps shown, staying put at either end', () => {
        const lite = visibleCreateEventSteps(false, false);
        expect(adjacentCreateEventStep(lite, 'plan', 1)).toBe('overview');
        expect(adjacentCreateEventStep(lite, 'overview', -1)).toBe('plan');
        expect(adjacentCreateEventStep(visibleCreateEventSteps(false, true), 'plan', 1)).toBe('details');
        expect(adjacentCreateEventStep(lite, 'type', -1)).toBe('type');
        expect(adjacentCreateEventStep(lite, 'overview', 1)).toBe('overview');
    });

    describe('createEventDetailsRequest', () => {
        const details = {
            startAt: '2027-06-12T18:00',
            timezone: 'Europe/Athens',
            locationName: ' Church ',
            locationAddress: ' Main St 1 ',
            mapsUrl: ' ',
            initialSessionTitle: 'Ceremony',
        };

        it('sends the date, place and first session for a plan that asks for them', () => {
            expect(createEventDetailsRequest(true, details)).toEqual({
                startAt: new Date('2027-06-12T18:00').toISOString(),
                timezone: 'Europe/Athens',
                locationName: 'Church',
                locationAddress: 'Main St 1',
                mapsUrl: undefined,
                initialSessionTitle: 'Ceremony',
            });
        });

        it('sends none of them for a plan that does not, even when they were typed', () => {
            expect(createEventDetailsRequest(false, details)).toEqual({});
        });
    });

    it('offers the theme step when the plan has the module and the type has presets', () => {
        expect(isThemeStepAvailable({ planHasTheme: true, isLoading: false, presets: [SWAN] })).toBe(true);
        expect(isThemeStepAvailable({ planHasTheme: true, isLoading: true, presets: undefined })).toBe(true);
        expect(isThemeStepAvailable({ planHasTheme: true, isLoading: false, presets: [] })).toBe(false);
        expect(isThemeStepAvailable({ planHasTheme: true, isLoading: false, presets: undefined })).toBe(false);
        expect(isThemeStepAvailable({ planHasTheme: false, isLoading: false, presets: [SWAN] })).toBe(false);
    });

    it('sends a pick only while it is still offered', () => {
        expect(effectiveThemePresetId('p1', [SWAN])).toBe('p1');
        expect(effectiveThemePresetId('gone', [SWAN])).toBeNull();
        expect(effectiveThemePresetId('p1', undefined)).toBeNull();
        expect(effectiveThemePresetId(null, [SWAN])).toBeNull();
    });

    it('resolves the event type: picked, then linked, then WEDDING, then the first enabled', () => {
        expect(resolveCreateEventType(['WEDDING', 'BABY_SHOWER', 'REUNION'], 'REUNION', 'baby-shower')).toBe('REUNION');
        expect(resolveCreateEventType(['WEDDING', 'BABY_SHOWER'], null, 'baby-shower')).toBe('BABY_SHOWER');
        expect(resolveCreateEventType(['BABY_SHOWER', 'WEDDING'], null, 'graduation')).toBe('WEDDING');
        expect(resolveCreateEventType(['BABY_SHOWER', 'WEDDING'], 'REUNION', null)).toBe('WEDDING');
        expect(resolveCreateEventType(['BABY_SHOWER', 'REUNION'], null, null)).toBe('BABY_SHOWER');
        expect(resolveCreateEventType([], null, 'reunion')).toBe('WEDDING');
    });
});

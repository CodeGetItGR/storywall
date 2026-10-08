import { describe, expect, it } from 'vitest';

import type { ThemePresetDto } from '@/lib/api/types';
import {
    effectiveThemePresetId,
    isThemeStepAvailable,
    parseCreateEventStep,
    resolveCreateEventType,
    visibleCreateEventSteps,
} from '@/lib/createEventSteps';

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

    it('shows the theme step between details and overview only when available', () => {
        expect(visibleCreateEventSteps(true)).toEqual(['type', 'plan', 'details', 'theme', 'overview']);
        expect(visibleCreateEventSteps(false)).toEqual(['type', 'plan', 'details', 'overview']);
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

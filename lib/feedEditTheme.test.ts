import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import type { ThemePresetDto } from '@/lib/api/types';
import { presetAsEventTheme, replaceFeedDocument, setFeedBackground } from '@/lib/feedEditTheme';
import { defaultFeedLayout } from '@/lib/feedLayout';

const preset: ThemePresetDto = {
    id: 'p-1',
    key: 'dino-mint',
    name: { el: 'Δεινόσαυροι', en: 'Dinosaurs' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
    titleColor: '#7A1F3D',
    headingFont: null,
};

describe('feedEditTheme', () => {
    it('reads a preset as the event theme it would apply', () => {
        expect(presetAsEventTheme(preset)).toEqual({
            presetKey: 'dino-mint',
            backgroundColor: '#BFE6E2',
            illustrationUrl: 'https://media.example/dino.webp',
            titleColor: '#7A1F3D',
            headingFont: null,
        });
    });

    it('sets and clears the background colour', () => {
        const set = produce(defaultFeedLayout(), setFeedBackground('#F5E6D3'));
        expect(set.overrides.backgroundColor).toBe('#F5E6D3');
        expect('backgroundColor' in produce(set, setFeedBackground(undefined)).overrides).toBe(false);
    });

    it('replaces the theme id, overrides and sections', () => {
        const next = { ...defaultFeedLayout(), themeId: 'rose', overrides: {}, sections: defaultFeedLayout().sections.slice(0, 1) };
        const current = { ...defaultFeedLayout(), overrides: { backgroundColor: '#F5E6D3' } };
        const replaced = produce(current, replaceFeedDocument(next));
        expect(replaced.themeId).toBe('rose');
        expect(replaced.overrides).toEqual({});
        expect(replaced.sections).toHaveLength(1);
    });
});

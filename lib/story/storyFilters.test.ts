import { describe, expect, it } from 'vitest';

import { STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';

describe('STORY_FILTER_PRESETS', () => {
    it('starts with the original (no-op) preset', () => {
        expect(STORY_FILTER_PRESETS[0]).toEqual({ id: 'original', cssFilter: '' });
    });

    it('has exactly 9 presets with unique ids', () => {
        expect(STORY_FILTER_PRESETS).toHaveLength(9);
        const ids = STORY_FILTER_PRESETS.map((preset) => preset.id);
        expect(new Set(ids).size).toBe(9);
    });

    it('gives every non-original preset a non-empty cssFilter', () => {
        for (const preset of STORY_FILTER_PRESETS.slice(1)) {
            expect(preset.cssFilter.length).toBeGreaterThan(0);
        }
    });

    it('gives vintage both a grain and a vignette overlay', () => {
        const vintage = STORY_FILTER_PRESETS.find((preset) => preset.id === 'vintage');
        expect(vintage?.overlays).toEqual([
            { type: 'grain', opacity: 0.12 },
            { type: 'vignette', opacity: 0.15 },
        ]);
    });

    it('gives noir a vignette overlay and fade a wash overlay', () => {
        const noir = STORY_FILTER_PRESETS.find((preset) => preset.id === 'noir');
        const fade = STORY_FILTER_PRESETS.find((preset) => preset.id === 'fade');
        expect(noir?.overlays).toEqual([{ type: 'vignette', opacity: 0.15 }]);
        expect(fade?.overlays).toEqual([{ type: 'wash', opacity: 0.08 }]);
    });
});

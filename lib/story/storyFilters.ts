export interface StoryFilterOverlay {
    type: 'grain' | 'vignette' | 'wash';
    opacity: number;
}

export interface StoryFilterPreset {
    id: string;
    cssFilter: string;
    overlays?: StoryFilterOverlay[];
}

export const STORY_FILTER_PRESETS: StoryFilterPreset[] = [
    { id: 'original', cssFilter: '' },
    { id: 'warm', cssFilter: 'brightness(1.05) saturate(1.15) sepia(0.08) contrast(1.05)' },
    { id: 'goldenHour', cssFilter: 'sepia(0.25) saturate(1.2) brightness(1.05)' },
    { id: 'cool', cssFilter: 'saturate(1.1) brightness(0.98) contrast(1.05) hue-rotate(180deg) saturate(1.05)' },
    { id: 'vivid', cssFilter: 'saturate(1.4) contrast(1.15)' },
    { id: 'fade', cssFilter: 'contrast(0.85) brightness(1.1) saturate(0.9)', overlays: [{ type: 'wash', opacity: 0.08 }] },
    { id: 'mono', cssFilter: 'grayscale(1) contrast(1.1)' },
    { id: 'noir', cssFilter: 'grayscale(1) contrast(1.3) brightness(0.9)', overlays: [{ type: 'vignette', opacity: 0.15 }] },
    {
        id: 'vintage',
        cssFilter: 'sepia(0.15) contrast(0.95) saturate(0.85)',
        overlays: [
            { type: 'grain', opacity: 0.12 },
            { type: 'vignette', opacity: 0.15 },
        ],
    },
];

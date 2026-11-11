import { describe, expect, it } from 'vitest';

import {
    EDITOR_TOUR_SEEN_KEY,
    EDITOR_TOUR_STEPS,
    hasSeenEditorTour,
    markEditorTourSeen,
    spotlightRect,
    tourCardPlacement,
} from '@/lib/invitation/editorTour';

const viewport = { width: 1280, height: 800 };
const card = { width: 350, height: 180 };

function memoryStorage() {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value) };
}

describe('editor tour steps', () => {
    it('covers only the tools the editor has, in the old order', () => {
        expect(EDITOR_TOUR_STEPS.map((step) => step.id)).toEqual(['welcome', 'text', 'add', 'preview', 'sectionTools', 'publish']);
    });

    it('keeps the welcome and the section tools in the middle', () => {
        expect(EDITOR_TOUR_STEPS.filter((step) => step.target === null).map((step) => step.id)).toEqual(['welcome', 'sectionTools']);
    });
});

describe('seen state', () => {
    it('remembers the tour once marked', () => {
        const storage = memoryStorage();
        expect(hasSeenEditorTour(storage)).toBe(false);
        markEditorTourSeen(storage);
        expect(hasSeenEditorTour(storage)).toBe(true);
        expect(storage.getItem(EDITOR_TOUR_SEEN_KEY)).toBe('1');
    });

    it('copes with storage that is missing or throws', () => {
        const broken = {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            },
        };
        expect(hasSeenEditorTour(broken)).toBe(false);
        expect(() => markEditorTourSeen(broken)).not.toThrow();
        expect(hasSeenEditorTour(null)).toBe(false);
    });
});

describe('spotlightRect', () => {
    it('adds room around the part', () => {
        expect(spotlightRect({ left: 100, top: 100, width: 40, height: 40 }, viewport)).toEqual({ left: 92, top: 92, width: 56, height: 56 });
    });

    it('stays inside the screen', () => {
        const spot = spotlightRect({ left: 0, top: 0, width: 1280, height: 40 }, viewport);
        expect(spot.left).toBe(4);
        expect(spot.top).toBe(4);
        expect(spot.left + spot.width).toBe(1276);
    });
});

describe('tourCardPlacement', () => {
    it('centres the card with nothing lit', () => {
        expect(tourCardPlacement(null, viewport, card)).toEqual({ kind: 'center' });
    });

    it('puts the card along the bottom on narrow screens', () => {
        expect(tourCardPlacement({ left: 10, top: 10, width: 40, height: 40 }, { width: 390, height: 800 }, card)).toEqual({ kind: 'bottom' });
    });

    it('puts the card to the right of the part where it fits', () => {
        expect(tourCardPlacement({ left: 100, top: 200, width: 40, height: 40 }, viewport, card)).toEqual({ kind: 'beside', left: 156, top: 200 });
    });

    it('falls back to the left for a part near the right edge', () => {
        expect(tourCardPlacement({ left: 1180, top: 100, width: 60, height: 40 }, viewport, card)).toEqual({ kind: 'beside', left: 814, top: 100 });
    });

    it('keeps the card on screen when nothing fits', () => {
        const placement = tourCardPlacement({ left: 0, top: 0, width: 1280, height: 790 }, viewport, card);
        expect(placement).toEqual({ kind: 'beside', left: 14, top: 606 });
    });
});

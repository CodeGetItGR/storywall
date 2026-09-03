import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bakeStoryFilter, STORY_FILTER_PRESETS } from '@/lib/story/storyFilters';

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

describe('bakeStoryFilter', () => {
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    let getContextSpy: ReturnType<typeof vi.spyOn>;
    let toBlobSpy: ReturnType<typeof vi.spyOn>;
    let fakeCtx: {
        filter: string;
        drawImage: ReturnType<typeof vi.fn>;
        fillRect: ReturnType<typeof vi.fn>;
        createRadialGradient: ReturnType<typeof vi.fn>;
        fillStyle: string;
        globalAlpha: number;
    };

    beforeEach(() => {
        globalThis.createImageBitmap = vi.fn().mockResolvedValue({ width: 100, height: 200, close: vi.fn() });
        fakeCtx = {
            filter: '',
            fillStyle: '',
            globalAlpha: 1,
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        };
        getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D);
        toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
            callback(new Blob(['fake'], { type: 'image/jpeg' }));
        });
    });

    afterEach(() => {
        globalThis.createImageBitmap = originalCreateImageBitmap;
        getContextSpy.mockRestore();
        toBlobSpy.mockRestore();
    });

    it('returns the original file untouched for the "original" preset', async () => {
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const original = STORY_FILTER_PRESETS[0];
        const result = await bakeStoryFilter(file, original);
        expect(result).toBe(file);
        expect(getContextSpy).not.toHaveBeenCalled();
    });

    it('draws the image with the preset cssFilter set on the context', async () => {
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const warm = STORY_FILTER_PRESETS.find((preset) => preset.id === 'warm')!;
        await bakeStoryFilter(file, warm);
        expect(fakeCtx.filter).toBe(warm.cssFilter);
        expect(fakeCtx.drawImage).toHaveBeenCalledTimes(1);
    });

    it('returns a new File with the original name and type', async () => {
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const vivid = STORY_FILTER_PRESETS.find((preset) => preset.id === 'vivid')!;
        const result = await bakeStoryFilter(file, vivid);
        expect(result).not.toBe(file);
        expect(result.name).toBe('photo.jpg');
        expect(result.type).toBe('image/jpeg');
    });

    it('draws an extra fillRect per overlay for a preset with overlays', async () => {
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const noir = STORY_FILTER_PRESETS.find((preset) => preset.id === 'noir')!;
        await bakeStoryFilter(file, noir);
        expect(fakeCtx.fillRect).toHaveBeenCalledTimes(1);
    });

    it('falls back to the original file if getContext returns null', async () => {
        getContextSpy.mockReturnValue(null);
        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
        const vivid = STORY_FILTER_PRESETS.find((preset) => preset.id === 'vivid')!;
        const result = await bakeStoryFilter(file, vivid);
        expect(result).toBe(file);
    });
});

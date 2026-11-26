import { describe, expect, it } from 'vitest';

import { contrastRatio, INK_COLOR, MIN_INK_CONTRAST } from '@/lib/contrast';
import { contrastOn, pageToneOf, pageToneProps, pageToneStyle, readableTextOn } from '@/lib/pageTone';

const DARK = ['#000000', '#1B2A4A', '#7A1F3D', '#2F2B2D'];
const MIDDLE = ['#FF7A59', '#AC9FC7'];
const LIGHT = ['#FFFFFF', '#F5E6D3', '#EFE7EC'];

describe('readableTextOn', () => {
    it('reads on any colour', () => {
        for (let gray = 0; gray < 256; gray++) {
            const color = `#${gray.toString(16).padStart(2, '0').repeat(3)}`;
            expect(contrastRatio(color, readableTextOn(color))).toBeGreaterThanOrEqual(MIN_INK_CONTRAST);
        }
    });

    it('prefers ink, and is black only where neither ink nor white reads', () => {
        for (const color of [...MIDDLE, ...LIGHT]) expect(readableTextOn(color)).toBe(INK_COLOR);
        for (const color of DARK) expect(readableTextOn(color)).toBe('#FFFFFF');
        expect(readableTextOn('#7D7D7D')).toBe('#000000');
    });

    it("is the better of ink and white on a picture that's both dark and light", () => {
        expect(readableTextOn({ mean: 0.1, dark: 0, light: 0.4 })).toBe('#FFFFFF');
        expect(readableTextOn({ mean: 0.6, dark: 0.1, light: 1 })).toBe(INK_COLOR);
    });
});

describe('contrastOn', () => {
    it('is the worst of a picture', () => {
        expect(contrastOn({ mean: 0.5, dark: 0, light: 1 }, '#FFFFFF')).toBe(1);
    });
});

describe('pageToneOf', () => {
    it('leaves light pages, and pages it knows nothing about, alone', () => {
        for (const color of LIGHT) expect(pageToneOf(color)).toBeNull();
        expect(pageToneOf(null)).toBeNull();
        expect(pageToneOf({ mean: 0.8, dark: 0.7, light: 0.9 })).toBeNull();
    });

    it('is light text on a dark page and dark text on a middle colour, labels included', () => {
        for (const [colors, text] of [[DARK, 'light'], [MIDDLE, 'dark']] as const) {
            for (const color of colors) {
                const tone = pageToneOf(color)!;
                expect(tone.text).toBe(text);
                for (const drawn of [tone.ink, tone.muted]) expect(contrastRatio(color, drawn)).toBeGreaterThanOrEqual(MIN_INK_CONTRAST);
            }
        }
    });

    it('is light text on a dark picture, and dark text in the side panel above its curtain', () => {
        const tone = pageToneOf({ mean: 0.03, dark: 0.01, light: 0.08 })!;
        expect(tone.text).toBe('light');
        expect(['#000000', INK_COLOR]).toContain(tone.panelInk);
    });
});

describe('what the page is given', () => {
    it('is nothing without a tone', () => {
        expect(pageToneProps(null)).toEqual({});
        expect(pageToneStyle(null)).toBeUndefined();
    });

    it('is the tone and its colours', () => {
        const tone = pageToneOf('#000000');
        expect(pageToneProps(tone)).toEqual({ 'data-page-tone': 'light' });
        expect(pageToneStyle(tone)).toMatchObject({ '--page-ink': '#FFFFFF' });
    });
});

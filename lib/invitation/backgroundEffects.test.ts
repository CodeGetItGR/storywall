import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
    activeEffect,
    backgroundReveal,
    effectClassName,
    effectIsOnScreen,
    effectParticles,
    revealsBackground,
    type SectionEffect,
} from '@/lib/invitation/backgroundEffects';
import { BACKGROUND_EFFECTS, type SectionStyle } from '@/lib/invitation/sectionStyle';

import legacy from './legacyEffects.fixture.json';

const effect = (type: SectionEffect['type'], speed: SectionEffect['speed'] = 'slow', intensity: SectionEffect['intensity'] = 'subtle'): SectionEffect => ({
    type,
    speed,
    intensity,
});

const box = (top: number, height: number, left = 0, width = 375) => ({ top, bottom: top + height, left, right: left + width, width, height });

describe('activeEffect', () => {
    const style = (saved?: SectionEffect) => ({ effect: saved }) as SectionStyle;

    it('treats a saved none as no effect', () => {
        expect(activeEffect(style())).toBeUndefined();
        expect(activeEffect(style(effect('none')))).toBeUndefined();
        expect(activeEffect(style(effect('slowZoom')))?.type).toBe('slowZoom');
    });
});

describe('effectClassName', () => {
    it('uses the old class names', () => {
        expect(effectClassName(effect('slowZoom', 'normal', 'strong'))).toBe('wedart-bg-slowzoom wedart-bg-speed-normal wedart-bg-intensity-strong');
        expect(effectClassName(effect('kenBurnsLeft'))).toBe('wedart-bg-kenburns-left wedart-bg-speed-slow wedart-bg-intensity-subtle');
        expect(effectClassName(effect('confettiBurst'))).toContain('wedart-bg-confetti ');
        expect(effectClassName(effect('none'))).toBe('');
    });

    it('has a class for every effect', () => {
        for (const type of BACKGROUND_EFFECTS.filter((name) => name !== 'none')) {
            expect(effectClassName(effect(type))).toMatch(/^wedart-bg-[a-z-]+ wedart-bg-speed/);
        }
    });
});

describe('effectParticles', () => {
    it.each(Object.keys(legacy.particles))('makes the same particles as the old engine: %s', (key) => {
        const [type, speed, intensity] = key.split('/') as [SectionEffect['type'], SectionEffect['speed'], SectionEffect['intensity']];
        const expected = legacy.particles[key as keyof typeof legacy.particles];
        const spans = effectParticles({ type, speed, intensity }).map(({ style, glyph }) => ({
            style: Object.entries(style)
                .map(([name, value]) => `${name}:${value}`)
                .join(';'),
            content: glyph,
        }));
        expect(spans).toHaveLength(expected.count);
        expect(spans[0]).toEqual(expected.first);
        expect(createHash('sha256').update(JSON.stringify(spans)).digest('hex')).toBe(expected.sha256);
    });

    it('has none for the other effects', () => {
        expect(effectParticles(effect('slowZoom'))).toEqual([]);
        expect(effectParticles(effect('canvasSnow'))).toEqual([]);
    });
});

describe('backgroundReveal', () => {
    it('keeps the old keyframes and durations', () => {
        expect(backgroundReveal(effect('fade'))).toEqual({ keyframes: { opacity: [0, 1] }, options: { duration: 1.35, ease: [0.25, 0.1, 0.25, 1] } });
        expect(backgroundReveal(effect('fade', 'normal'))?.options.duration).toBe(0.85);
        expect(backgroundReveal(effect('blurReveal'))?.keyframes).toEqual({ opacity: [0.1, 1], filter: ['blur(16px)', 'blur(0px)'] });
    });

    it('applies to fade and blurReveal only', () => {
        expect(backgroundReveal(effect('slowZoom'))).toBeUndefined();
        expect(revealsBackground('fade')).toBe(true);
        expect(revealsBackground('blurReveal')).toBe(true);
        expect(revealsBackground('slowZoom')).toBe(false);
    });
});

describe('effectIsOnScreen', () => {
    it('is on screen once past the bottom 4% of the window', () => {
        expect(effectIsOnScreen(box(0, 100), 375, 800)).toBe(true);
        expect(effectIsOnScreen(box(767, 100), 375, 800)).toBe(true);
        expect(effectIsOnScreen(box(769, 100), 375, 800)).toBe(false);
    });

    it('is off screen above the window, beside it, or with no size', () => {
        expect(effectIsOnScreen(box(-200, 100), 375, 800)).toBe(false);
        expect(effectIsOnScreen(box(0, 100, 400), 375, 800)).toBe(false);
        expect(effectIsOnScreen(box(0, 0), 375, 800)).toBe(false);
    });
});

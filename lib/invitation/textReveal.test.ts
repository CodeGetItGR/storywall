import { describe, expect, it } from 'vitest';

import { propertiesToClear, textAnimationRootClasses, textBlockIsOnScreen, textReveal, textRevealOptions } from '@/lib/invitation/textReveal';
import { TEXT_ANIMATIONS } from '@/lib/invitation/theme';

const box = (top: number, height: number) => ({ top, bottom: top + height, left: 0, right: 375, width: 375, height });

describe('textReveal', () => {
    it('has one for every animation but none', () => {
        expect(textReveal('none')).toBeUndefined();
        for (const animation of TEXT_ANIMATIONS.filter((name) => name !== 'none')) {
            expect(textReveal(animation)).toBeDefined();
        }
    });

    it('keeps the old timing and easing', () => {
        expect(textReveal('fade-up')).toMatchObject({ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] });
        expect(textReveal('blur-in')).toMatchObject({ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] });
        expect(textReveal('soft-rise')).toMatchObject({ duration: 0.72, ease: [0.2, 0.7, 0.2, 1] });
        expect(textReveal('elastic-scale')).toMatchObject({ duration: 0.9, ease: [0.2, 0.7, 0.2, 1], times: [0, 0.6, 0.8, 1] });
        expect(textReveal('bounce-in')).toMatchObject({ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] });
        expect(textReveal('mask-left')).toMatchObject({ duration: 0.78, ease: [0.65, 0, 0.35, 1] });
    });

    it('keeps the old keyframes', () => {
        expect(textReveal('blur-in')?.keyframes).toEqual({ opacity: [0, 1], filter: ['blur(8px)', 'blur(0px)'] });
        expect(textReveal('soft-rise')?.keyframes).toEqual({
            opacity: [0, 1],
            transform: ['translateY(10px)', 'translateY(0px)'],
            filter: ['blur(2px)', 'blur(0px)'],
        });
        expect(textReveal('elastic-scale')?.keyframes.transform).toEqual(['scale(0.4)', 'scale(1.08)', 'scale(0.96)', 'scale(1)']);
    });

    it('gives every property one keyframe per time', () => {
        for (const animation of TEXT_ANIMATIONS.filter((name) => name !== 'none')) {
            const reveal = textReveal(animation);
            for (const frames of Object.values(reveal?.keyframes ?? {})) {
                expect(frames).toHaveLength(reveal?.times?.length ?? 2);
            }
        }
    });
});

describe('textRevealOptions', () => {
    it('uses one easing for two keyframes', () => {
        expect(textRevealOptions(textReveal('blur-in')!)).toEqual({ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] });
    });

    it('eases each gap with more keyframes, as CSS does', () => {
        const smooth = [0.2, 0.7, 0.2, 1];
        expect(textRevealOptions(textReveal('elastic-scale')!)).toEqual({ duration: 0.9, times: [0, 0.6, 0.8, 1], ease: [smooth, smooth, smooth] });
    });
});

describe('propertiesToClear', () => {
    it('clears what ends where the text rests', () => {
        expect(propertiesToClear(textReveal('soft-rise')!)).toEqual(['opacity', 'transform', 'filter']);
    });

    it('leaves the normal letter spacing the old animation ended on', () => {
        expect(propertiesToClear(textReveal('letter-spacing-in')!)).toEqual(['opacity']);
    });
});

describe('textAnimationRootClasses', () => {
    it('marks the root while text waits', () => {
        expect(textAnimationRootClasses('blur-in')).toBe('wedart-text-anim-blur-in wedart-text-anim-waiting');
        expect(textAnimationRootClasses('none')).toBe('');
    });
});

describe('textBlockIsOnScreen', () => {
    it('waits until the text is above the last 8% of the window', () => {
        expect(textBlockIsOnScreen(box(735, 20), 375, 800)).toBe(true);
        expect(textBlockIsOnScreen(box(737, 20), 375, 800)).toBe(false);
    });

    it('is false above the window or with no size', () => {
        expect(textBlockIsOnScreen(box(-50, 20), 375, 800)).toBe(false);
        expect(textBlockIsOnScreen(box(100, 0), 375, 800)).toBe(false);
    });
});

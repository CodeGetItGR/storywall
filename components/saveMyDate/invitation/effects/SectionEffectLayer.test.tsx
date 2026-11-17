import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubIntersectionObserver } from '@/components/saveMyDate/invitation/effects/__fixtures__/fakeIntersectionObserver';
import { SectionEffectLayer } from '@/components/saveMyDate/invitation/effects/SectionEffectLayer';
import type { SectionEffect } from '@/lib/invitation/backgroundEffects';

const mocks = vi.hoisted(() => ({ reduce: false }));

vi.mock('framer-motion', () => ({ useReducedMotion: () => mocks.reduce }));
vi.mock('framer-motion/dom/mini', () => ({ animate: () => ({ cancel: () => undefined }) }));

const effect = (type: SectionEffect['type']): SectionEffect => ({ type, speed: 'slow', intensity: 'subtle' });
const layer = (type: SectionEffect['type'], hasThemeImage = false) =>
    render(<SectionEffectLayer effect={effect(type)} backgroundStyle={{ background: 'rgb(1, 2, 3)' }} hasThemeImage={hasThemeImage} />).container;

let io: ReturnType<typeof stubIntersectionObserver>;

beforeEach(() => {
    mocks.reduce = false;
    io = stubIntersectionObserver();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('SectionEffectLayer', () => {
    it('is decoration, hidden from screen readers', () => {
        const clip = layer('slowZoom').querySelector('.wedart-section-bg-clip');
        expect(clip).toHaveAttribute('aria-hidden', 'true');
    });

    it('paints the section background it was given', () => {
        const background = layer('slowZoom', true).querySelector('.wedart-section-bg');
        expect(background).toHaveStyle({ background: 'rgb(1, 2, 3)' });
        expect(background).toHaveClass('has-theme-bg');
    });

    it('marks itself in view only while on screen', () => {
        const clip = layer('slowZoom').querySelector('.wedart-section-bg-clip') as HTMLElement;
        expect(clip).toHaveClass('wedart-bg-slowzoom', 'wedart-bg-speed-slow', 'wedart-bg-intensity-subtle');
        expect(clip).not.toHaveClass('wedart-bg-inview');
        act(() => io.show(clip));
        expect(clip).toHaveClass('wedart-bg-inview');
        act(() => io.show(clip, false));
        expect(clip).not.toHaveClass('wedart-bg-inview');
    });

    it('stays out of view for someone who prefers less motion', () => {
        mocks.reduce = true;
        const clip = layer('slowZoom').querySelector('.wedart-section-bg-clip') as HTMLElement;
        act(() => io.show(clip));
        expect(clip).not.toHaveClass('wedart-bg-inview');
    });

    it('has a canvas only for a canvas effect', () => {
        expect(layer('canvasSnow').querySelector('canvas.wedart-fx-canvas')).toBeInTheDocument();
        cleanup();
        expect(layer('slowZoom').querySelector('canvas')).toBeNull();
    });

    const onScreen = (type: SectionEffect['type']) => {
        const container = layer(type);
        act(() => io.show(container.querySelector('.wedart-section-bg-clip') as HTMLElement));
        return container;
    };

    it('has particles only for a particle effect', () => {
        expect(onScreen('heartsDrift').querySelectorAll('.wedart-bg-particles span').length).toBeGreaterThan(0);
        cleanup();
        expect(onScreen('slowZoom').querySelector('.wedart-bg-particles')).toBeNull();
    });

    it('draws the glyph and the custom properties on each particle', () => {
        const particle = onScreen('heartsDrift').querySelector<HTMLElement>('.wedart-bg-particles span');
        expect(particle?.textContent).toBe('♥');
        expect(particle?.style.getPropertyValue('--fx-left')).toMatch(/%$/);
    });

    it('has no particles until it is on screen, or in the server render', () => {
        expect(layer('heartsDrift').querySelector('.wedart-bg-particles')).toBeNull();
        const html = renderToString(<SectionEffectLayer effect={effect('heartsDrift')} backgroundStyle={{}} hasThemeImage={false} />);
        expect(html).not.toContain('wedart-bg-particles');
    });

    it('keeps its particles in place when it re-renders', () => {
        const props = { effect: effect('heartsDrift'), hasThemeImage: false };
        const { container, rerender } = render(<SectionEffectLayer {...props} backgroundStyle={{ background: 'red' }} />);
        act(() => io.show(container.querySelector('.wedart-section-bg-clip') as HTMLElement));
        const before = container.querySelector('.wedart-bg-particles')?.innerHTML;
        rerender(<SectionEffectLayer {...props} effect={effect('heartsDrift')} backgroundStyle={{ background: 'blue' }} />);
        expect(container.querySelector('.wedart-bg-particles')?.innerHTML).toBe(before);
    });
});

import { act, cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubIntersectionObserver } from '@/components/saveMyDate/invitation/effects/__fixtures__/fakeIntersectionObserver';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { SectionEffect } from '@/lib/invitation/backgroundEffects';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import type { TextAnimation } from '@/lib/invitation/textReveal';
import en from '@/messages/en.json';

const mocks = vi.hoisted(() => ({ reduce: false, animate: vi.fn(), cancel: vi.fn() }));

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
vi.mock('framer-motion', async (importOriginal) => ({
    ...(await importOriginal<typeof import('framer-motion')>()),
    useReducedMotion: () => mocks.reduce,
}));
vi.mock('framer-motion/dom/mini', () => ({ animate: mocks.animate }));

const section = (id: string, style: Partial<SectionStyle>): InvitationSection =>
    ({ ...SAMPLE_SECTIONS.invitation, id, style: { ...SAMPLE_SECTIONS.invitation.style, effect: undefined, ...style } }) as InvitationSection;

const effect = (type: SectionEffect['type']): SectionEffect => ({ type, speed: 'slow', intensity: 'subtle' });

const media = (id: string) => `/media/${id}`;

function page(sections: InvitationSection[], textAnimation: TextAnimation = 'none') {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            <InvitationRenderer
                document={{ ...SAMPLE_DOCUMENT, sections }}
                theme={{ ...SAMPLE_THEME, textAnimation, transitions: [{ id: 'wave', name: 'Wave', desktop: { mediaId: 'm-wave' }, mobile: { mediaId: 'm-phone' } }] }}
                media={media}
            />
        </NextIntlClientProvider>,
    ).container;
}

let io: ReturnType<typeof stubIntersectionObserver>;
let frames: FrameRequestCallback[];
let draws: number;

beforeEach(() => {
    mocks.reduce = false;
    vi.clearAllMocks();
    mocks.animate.mockImplementation(() => ({ cancel: mocks.cancel, then: () => undefined }));
    io = stubIntersectionObserver();
    frames = [];
    draws = 0;
    vi.stubGlobal('ResizeObserver', class {
        observe() {}
        disconnect() {}
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => {
        frames = [];
    });
    const context = new Proxy({}, {
        get: () => () => {
            draws += 1;
        },
        set: () => true,
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as RenderingContext);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const clipOf = (container: HTMLElement, id: string) => container.querySelector(`[data-section-id="${id}"] .wedart-section-bg-clip`) as HTMLElement;

describe('InvitationRenderer effects', () => {
    it('leaves a section with no effect alone', () => {
        const container = page([section('a', {}), section('b', { effect: effect('none') })]);
        expect(container.querySelector('.wedart-section-bg-clip')).toBeNull();
        expect(container.querySelector('.wedart-bg-effect-active')).toBeNull();
    });

    it('gives each section with an effect its own layer', () => {
        const container = page([section('a', { effect: effect('slowZoom') }), section('b', {}), section('c', { effect: effect('heartsDrift') })]);
        expect(clipOf(container, 'a')).toHaveClass('wedart-bg-slowzoom');
        expect(clipOf(container, 'b')).toBeNull();
        act(() => io.show(clipOf(container, 'c')));
        expect(clipOf(container, 'c').querySelectorAll('.wedart-bg-particles span').length).toBeGreaterThan(0);
        expect(container.querySelectorAll('.wedart-bg-effect-active')).toHaveLength(2);
    });

    it('moves only the section on screen', () => {
        const container = page([section('a', { effect: effect('slowZoom') }), section('b', { effect: effect('slowZoom') })]);
        act(() => io.show(clipOf(container, 'a')));
        expect(clipOf(container, 'a')).toHaveClass('wedart-bg-inview');
        expect(clipOf(container, 'b')).not.toHaveClass('wedart-bg-inview');
    });

    it('draws a canvas effect only while its section is on screen', () => {
        const container = page([section('a', { effect: effect('canvasSnow') })]);
        expect(frames).toHaveLength(0);

        act(() => io.show(clipOf(container, 'a')));
        expect(frames).toHaveLength(1);
        act(() => frames.splice(0).forEach((frame) => frame(1000)));
        expect(draws).toBeGreaterThan(0);
        expect(frames).toHaveLength(1);

        act(() => io.show(clipOf(container, 'a'), false));
        expect(frames).toHaveLength(0);
    });

    it('fades a background in when its section arrives', () => {
        const container = page([section('a', { effect: effect('fade') })]);
        const background = clipOf(container, 'a').querySelector('.wedart-section-bg');
        expect(mocks.animate).not.toHaveBeenCalled();
        act(() => io.show(clipOf(container, 'a')));
        expect(mocks.animate).toHaveBeenCalledWith(background, { opacity: [0, 1] }, { duration: 1.35, ease: [0.25, 0.1, 0.25, 1] });
    });

    it('moves nothing for someone who prefers less motion', () => {
        mocks.reduce = true;
        const container = page([section('a', { effect: effect('canvasSnow') }), section('b', { effect: effect('fade') })], 'blur-in');
        expect(io.count()).toBe(0);
        expect(frames).toHaveLength(0);
        expect(mocks.animate).not.toHaveBeenCalled();
        expect(container.querySelector('.wedart-text-anim-pending')).toBeNull();
        expect(container.querySelector('.wedart-text-anim-waiting')).toBeNull();
    });
});

describe('InvitationRenderer text animations', () => {
    it('reveals text when it arrives, at the old timing', () => {
        const container = page([section('a', {})], 'blur-in');
        const root = container.querySelector('.smd-invitation');
        const block = container.querySelector('.section .text-block') as HTMLElement;
        expect(root).toHaveClass('wedart-text-anim-blur-in');
        expect(root).not.toHaveClass('wedart-text-anim-waiting');
        expect(block).toHaveClass('wedart-text-anim-pending');

        act(() => io.show(block));
        expect(block).not.toHaveClass('wedart-text-anim-pending');
        expect(mocks.animate).toHaveBeenCalledWith(block, { opacity: [0, 1], filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] });
    });

    it('hides nothing for a theme with no text animation', () => {
        const container = page([section('a', {})]);
        expect(container.querySelector('.wedart-text-anim-pending')).toBeNull();
        expect(mocks.animate).not.toHaveBeenCalled();
    });
});

describe('InvitationRenderer transitions', () => {
    it('hangs the art over the seam, with its phone version', () => {
        const container = page([section('a', { transition: { assetId: 'wave', edge: 'bottom' } }), section('b', {}), section('c', {})]);
        const art = container.querySelector('[data-section-id="a"] .wedart-transition-picture');
        expect(art).toHaveClass('has-mobile');
        expect(art?.querySelector('.wedart-transition-desktop.is-bottom')).toHaveAttribute('src', '/media/m-wave');
        expect(art?.querySelector('.wedart-transition-mobile')).toHaveAttribute('src', '/media/m-phone');
        expect(art?.querySelector('img')).toHaveAttribute('alt', 'Wave');

        expect(container.querySelector('[data-section-id="a"]')).toHaveClass('wedart-transition-adjacent');
        expect(container.querySelector('[data-section-id="b"]')).toHaveClass('wedart-transition-adjacent');
        expect(container.querySelector('[data-section-id="c"]')).not.toHaveClass('wedart-transition-adjacent');
    });

    it('draws nothing for art the theme no longer has', () => {
        const container = page([section('a', { transition: { assetId: 'gone', edge: 'top' } })]);
        expect(container.querySelector('.wedart-transition-picture')).toBeNull();
    });
});

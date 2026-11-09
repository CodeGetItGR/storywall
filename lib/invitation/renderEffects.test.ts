import { describe, expect, it } from 'vitest';

import { buildRenderContext, frameAnimationClass, sectionShell, sectionTransitionArt, transitionAdjacentIds } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import type { ThemeDesign } from '@/lib/invitation/theme';

const media = (id: string) => (id === 'm-missing' ? undefined : `https://cdn.test/${id}`);
const theme: ThemeDesign = {
    ...SAMPLE_THEME,
    transitions: [
        { id: 't-wave', name: 'Κύμα', desktop: { mediaId: 'm-wave' }, mobile: { mediaId: 'm-wave-phone' } },
        { id: 't-line', name: 'Γραμμή', desktop: { mediaId: 'm-line' } },
        { id: 't-gone', name: 'Χαμένο', desktop: { mediaId: 'm-missing' } },
    ],
};
const ctx = buildRenderContext(SAMPLE_DOCUMENT, theme, media);

const withStyle = (style: Partial<SectionStyle>, id = 's'): InvitationSection =>
    ({ ...SAMPLE_SECTIONS.blank, id, style: { ...SAMPLE_SECTIONS.blank.style, ...style } }) as InvitationSection;

const slowZoom = { type: 'slowZoom', speed: 'slow', intensity: 'subtle' } as const;

describe('sectionShell effects', () => {
    it('marks the section and keeps its background underneath', () => {
        const shell = sectionShell(withStyle({ effect: slowZoom, background: { kind: 'color', color: '#112233' } }), 1, ctx);
        expect(shell.className).toContain('wedart-bg-effect-active');
        expect(shell.effect).toEqual(slowZoom);
        expect(shell.style.background).toBe('#112233');
        expect(shell.effectBackground.style.background).toBe('#112233');
    });

    it('leaves the surface empty for a reveal, so only the layer shows the background', () => {
        const shell = sectionShell(withStyle({ effect: { ...slowZoom, type: 'fade' }, background: { kind: 'color', color: '#112233' } }), 1, ctx);
        expect(shell.style.background).toBe('transparent');
        expect(shell.className).not.toContain('has-theme-bg');
        expect(shell.effectBackground.style.background).toBe('#112233');
    });

    it('does nothing without an effect, or with a saved none', () => {
        expect(sectionShell(withStyle({}), 1, ctx).effect).toBeUndefined();
        const shell = sectionShell(withStyle({ effect: { ...slowZoom, type: 'none' } }), 1, ctx);
        expect(shell.effect).toBeUndefined();
        expect(shell.className).not.toContain('wedart-bg-effect-active');
    });
});

describe('sectionTransitionArt', () => {
    it('finds the theme art and its phone version', () => {
        expect(sectionTransitionArt(withStyle({ transition: { assetId: 't-wave', edge: 'top' } }), ctx)).toEqual({
            name: 'Κύμα',
            edge: 'top',
            desktop: 'https://cdn.test/m-wave',
            mobile: 'https://cdn.test/m-wave-phone',
        });
        expect(sectionTransitionArt(withStyle({ transition: { assetId: 't-line', edge: 'bottom' } }), ctx)?.mobile).toBeUndefined();
    });

    it('is nothing when the art is unknown or has no image', () => {
        expect(sectionTransitionArt(withStyle({}), ctx)).toBeUndefined();
        expect(sectionTransitionArt(withStyle({ transition: { assetId: 't-nope', edge: 'top' } }), ctx)).toBeUndefined();
        expect(sectionTransitionArt(withStyle({ transition: { assetId: 't-gone', edge: 'top' } }), ctx)).toBeUndefined();
    });
});

describe('transitionAdjacentIds', () => {
    it('marks the section with the art and the neighbour it hangs over', () => {
        const sections = [
            withStyle({}, 'a'),
            withStyle({ transition: { assetId: 't-wave', edge: 'bottom' } }, 'b'),
            withStyle({}, 'c'),
            withStyle({}, 'd'),
            withStyle({ transition: { assetId: 't-wave', edge: 'top' } }, 'e'),
            withStyle({}, 'f'),
        ];
        expect([...transitionAdjacentIds(sections)]).toEqual(['b', 'c', 'd', 'e']);
    });

    it('reaches the shell', () => {
        const sections = [withStyle({ transition: { assetId: 't-wave', edge: 'bottom' } }, 'a'), withStyle({}, 'b'), withStyle({}, 'c')];
        const adjacentCtx = buildRenderContext({ ...SAMPLE_DOCUMENT, sections }, theme, media);
        expect(sectionShell(sections[1], 1, adjacentCtx).className).toContain('wedart-transition-adjacent');
        expect(sectionShell(sections[2], 2, adjacentCtx).className).not.toContain('wedart-transition-adjacent');
    });
});

describe('frameAnimationClass', () => {
    it('uses the old class names', () => {
        expect(frameAnimationClass('float')).toBe('wedart-frame-anim-float');
        expect(frameAnimationClass('none')).toBe('');
    });
});

import { describe, expect, it } from 'vitest';

import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { lacksThemeFrame, themeFrame } from '@/lib/feedThemeFrame';
import { planFeedThemeSwitch, planFeedWallSwitch } from '@/lib/feedThemes';
import { FEED_BLOCK_FALLBACK_STYLE } from '@/lib/feedThemeStyles';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';

const [OVAL] = SAMPLE_THEME.frames;
const PLAIN_THEME: ThemeDesign = { ...SAMPLE_THEME, frames: [] };
const ROUND_THEME: ThemeDesign = { ...SAMPLE_THEME, frames: [{ ...OVAL, id: 'fr-round' }, { ...OVAL, id: 'fr-heart' }] };
const PHOTO = { source: 'media', mediaId: 'mine' } as const;
const NO_IMAGES = new Set<string>();

const EMPTY_FRAME: PhotoFrameElement = {
    id: 'el-1',
    kind: 'photoFrame',
    frameId: '',
    imageX: 50,
    imageY: 50,
    zoom: 1,
    boxScale: 1,
    imageWidth: 0,
    imageHeight: 0,
    animation: 'none',
};

function holding(type: NewSectionType, frame: Partial<PhotoFrameElement>): InvitationSection {
    return { ...createSection(type, 'WEDDING'), elements: [{ ...EMPTY_FRAME, ...frame }] } as InvitationSection;
}

function source(theme: ThemeDesign, sections: InvitationSection[] = []) {
    return { document: { ...defaultFeedLayout(), themeId: 'rose', sections }, theme, imageIds: new Set<string>() };
}

function layout(...sections: InvitationSection[]): InvitationDocument {
    return { ...defaultFeedLayout(), sections: [...sections, ...defaultFeedLayout().sections] };
}

const framedPhotos = (document: InvitationDocument) => document.sections.filter((section) => section.type === 'photoFrame');
const frameOf = (section: InvitationSection) => section.elements[0] as PhotoFrameElement;
const switchTo = (current: InvitationDocument, theme: ThemeDesign, sections?: InvitationSection[]) =>
    planFeedThemeSwitch(current, source(theme, sections), NO_IMAGES);
const toWall = (current: InvitationDocument) => planFeedWallSwitch(current, wallThemeDesign(null), 'WEDDING', NO_IMAGES);

// The host's framed photo: the photo, moved and zoomed.
const filled = () => holding('photoFrame', { frameId: 'fr-oval', photo: PHOTO, imageX: 20, imageY: 70, zoom: 2, imageWidth: 800, imageHeight: 600 });

describe('themeFrame', () => {
    it('prefers the framed photo section, then the top, then the first frame on the page', () => {
        const blank = holding('blank', { frameId: 'fr-heart' });
        const top = holding('top', { frameId: 'fr-round', boxScale: 0.8, animation: 'swing-soft' });
        const section = holding('photoFrame', { frameId: 'fr-heart', boxScale: 1.2 });
        expect(themeFrame(source(ROUND_THEME, [blank, top, section]))).toMatchObject({ frameId: 'fr-heart', boxScale: 1.2, style: section.style });
        expect(themeFrame(source(ROUND_THEME, [blank, top]))).toEqual({
            frameId: 'fr-round',
            boxScale: 0.8,
            animation: 'swing-soft',
            style: FEED_BLOCK_FALLBACK_STYLE,
        });
        expect(themeFrame(source(ROUND_THEME, [blank]))?.frameId).toBe('fr-heart');
    });

    it("skips a frame the theme doesn't have, and falls back to its first", () => {
        expect(themeFrame(source(ROUND_THEME, [holding('top', { frameId: 'gone' })]))?.frameId).toBe('fr-round');
        expect(themeFrame(source(ROUND_THEME, [holding('top', {})]))?.frameId).toBe('fr-round');
    });

    it('is null on a theme without frames', () => {
        expect(themeFrame(source(PLAIN_THEME, [holding('top', {})]))).toBeNull();
    });
});

describe('a switch to a theme with frames', () => {
    it("adds one empty framed photo, first among the host's blocks", () => {
        const next = switchTo(defaultFeedLayout(), ROUND_THEME, [holding('top', { frameId: 'fr-heart', photo: PHOTO })]);
        const [section] = framedPhotos(next);
        expect(framedPhotos(next)).toHaveLength(1);
        expect(section).toMatchObject({ visible: true, locked: false, style: { background: { kind: 'theme', slot: 'auto' } } });
        expect(section.style.minHeight).toBeUndefined();
        expect(section.elements).toHaveLength(1);
        expect(frameOf(section)).toMatchObject({ frameId: 'fr-heart', imageX: 50, imageY: 50, zoom: 1 });
        expect(frameOf(section).photo).toBeUndefined();
        expect(next.sections.map((item) => item.type)).toEqual(['feedCover', 'feedDetails', 'photoFrame', 'feedDescription', 'feedRsvp']);
    });

    it('takes a theme with several framed photos as one', () => {
        const next = switchTo(defaultFeedLayout(), ROUND_THEME, [
            holding('photoFrame', { frameId: 'fr-round' }),
            holding('photoFrame', { frameId: 'fr-heart' }),
        ]);
        expect(framedPhotos(next).map((section) => frameOf(section).frameId)).toEqual(['fr-round']);
    });

    it('changes the frame and keeps the photo, its crop and its place', () => {
        const faq = createSection('faq', 'WEDDING');
        const current = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, faq, filled()] };
        const next = switchTo(current, ROUND_THEME, [holding('top', { frameId: 'fr-round', boxScale: 0.8, animation: 'swing-soft' })]);
        expect(next.sections.at(-1)?.type).toBe('photoFrame');
        expect(frameOf(next.sections.at(-1)!)).toMatchObject({
            frameId: 'fr-round',
            boxScale: 0.8,
            animation: 'swing-soft',
            photo: PHOTO,
            imageX: 20,
            imageY: 70,
            zoom: 2,
            imageWidth: 800,
            imageHeight: 600,
        });
    });

    it("leaves out the old theme's sample photo", () => {
        const next = planFeedThemeSwitch(layout(filled()), source(ROUND_THEME), new Set(['mine']));
        expect(frameOf(framedPhotos(next)[0]).photo).toBeUndefined();
    });

    it('keeps one the host hid hidden', () => {
        const next = switchTo(layout({ ...filled(), visible: false }), ROUND_THEME);
        expect(framedPhotos(next)).toHaveLength(1);
        expect(framedPhotos(next)[0].visible).toBe(false);
    });

    it('adds none to a full layout', () => {
        const blocks = Array.from({ length: MAX_SECTIONS - 4 }, () => createSection('blank', 'WEDDING'));
        const next = switchTo(layout(...blocks), ROUND_THEME);
        expect(next.sections).toHaveLength(MAX_SECTIONS);
        expect(framedPhotos(next)).toEqual([]);
    });
});

describe('a theme without frames', () => {
    it('adds no framed photo', () => {
        expect(framedPhotos(switchTo(defaultFeedLayout(), PLAIN_THEME))).toEqual([]);
        expect(framedPhotos(toWall(defaultFeedLayout()))).toEqual([]);
    });

    it.each([
        ['a Save my date theme', (current: InvitationDocument) => switchTo(current, PLAIN_THEME)],
        ['the wall theme', toWall],
    ])('hides it and keeps its photo, back on the next theme with frames: %s', (_, leave) => {
        const away = leave(layout(filled()));
        expect(framedPhotos(away)[0]).toMatchObject({ visible: false, hiddenByTheme: true });
        expect(frameOf(framedPhotos(away)[0])).toMatchObject({ photo: PHOTO, imageX: 20, zoom: 2 });

        const back = switchTo(away, ROUND_THEME);
        expect(framedPhotos(back)).toHaveLength(1);
        expect(framedPhotos(back)[0].visible).toBe(true);
        expect(framedPhotos(back)[0].hiddenByTheme).toBeUndefined();
        expect(frameOf(framedPhotos(back)[0])).toMatchObject({ frameId: 'fr-round', photo: PHOTO, imageX: 20, zoom: 2 });
    });

    it('brings it back at the same place', () => {
        const order = (document: InvitationDocument) => document.sections.map((section) => section.id);
        const current = layout(filled(), createSection('faq', 'WEDDING'));
        expect(order(switchTo(toWall(current), ROUND_THEME))).toEqual(order(current));
    });
});

describe('lacksThemeFrame', () => {
    const ctx = (theme: ThemeDesign, media = (id: string): string | undefined => `/${id}`) => buildRenderContext(defaultFeedLayout(), theme, media);

    it("is true without the frame's art, false with it or for another section", () => {
        expect(lacksThemeFrame(filled(), ctx(SAMPLE_THEME))).toBe(false);
        expect(lacksThemeFrame(filled(), ctx(PLAIN_THEME))).toBe(true);
        expect(lacksThemeFrame(filled(), ctx(SAMPLE_THEME, () => undefined))).toBe(true);
        expect(lacksThemeFrame(createSection('faq', 'WEDDING'), ctx(PLAIN_THEME))).toBe(false);
    });
});

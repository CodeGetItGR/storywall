import { describe, expect, it } from 'vitest';

import { INK_COLOR, readableOnInk } from '@/lib/contrast';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import type { InvitationElement } from '@/lib/invitation/elements';
import {
    buildRenderContext,
    customSectionLayout,
    isDarkColor,
    resolveFont,
    sectionBackground,
    sectionBackgroundPhotos,
    sectionShell,
    sectionTextContrast,
    textStyleCss,
    themeAssetName,
} from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';

const media = (id: string) => `https://cdn.test/${id}`;
const ctx = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, media);
const blank = SAMPLE_SECTIONS.blank;

function withTheme(theme: Partial<ThemeDesign>) {
    return buildRenderContext(SAMPLE_DOCUMENT, { ...SAMPLE_THEME, ...theme }, media);
}

describe('buildRenderContext', () => {
    it('uses the theme fonts and text colour', () => {
        expect(ctx.titleFont).toBe('Georgia,serif');
        expect(ctx.textColor).toBe('#2f2b2d');
        expect(ctx.forcePreset).toBe(false);
    });

    it('takes the event date from the first date section, even when hidden', () => {
        expect(ctx.eventIso).toBe('2026-07-12T18:00');
        const hidden = { ...SAMPLE_SECTIONS.date, visible: false };
        expect(buildRenderContext({ ...SAMPLE_DOCUMENT, sections: [hidden] }, SAMPLE_THEME, media).eventIso).toBe('2026-07-12T18:00');
        expect(buildRenderContext({ ...SAMPLE_DOCUMENT, sections: [blank] }, SAMPLE_THEME, media).eventIso).toBeUndefined();
    });

    it('takes its fixed labels from the date section language', () => {
        expect(ctx.labels.countdownDays).toBe('ΜΕΡΕΣ');
        const english = { ...SAMPLE_SECTIONS.date, data: { ...SAMPLE_SECTIONS.date.data, displayLanguage: 'en' as const } };
        expect(buildRenderContext({ ...SAMPLE_DOCUMENT, sections: [english] }, SAMPLE_THEME, media).labels.countdownDays).toBe('DAYS');
    });

    it('lets a host preset replace every font', () => {
        const document = { ...SAMPLE_DOCUMENT, overrides: { typographyPresetId: 'p1', textColor: '#111111' } };
        const forced = buildRenderContext(document, SAMPLE_THEME, media, { titleFont: 'Cinzel', bodyFont: 'Lora' });
        expect(forced).toMatchObject({ titleFont: 'Cinzel', bodyFont: 'Lora', textColor: '#111111', forcePreset: true });
        expect(resolveFont('Arial', 'body', forced)).toBe('var(--body-font)');
    });
});

describe('sectionBackground', () => {
    it('uses the top background for the top section', () => {
        const { style, hasThemeImage } = sectionBackground(SAMPLE_SECTIONS.top, 3, ctx);
        expect(hasThemeImage).toBe(true);
        expect(style).toMatchObject({
            '--smd-bg-desktop': 'url("https://cdn.test/m-top")',
            '--smd-bg-mobile': 'url("https://cdn.test/m-top-mobile")',
            backgroundSize: 'cover',
        });
    });

    it('alternates top and content by position, repeating a stable content background', () => {
        expect(sectionBackground(blank, 2, ctx).style).toMatchObject({ '--smd-bg-desktop': 'url("https://cdn.test/m-top")' });
        expect(sectionBackground(blank, 1, ctx).style).toMatchObject({
            '--smd-bg-desktop': 'url("https://cdn.test/m-content")',
            backgroundSize: '100% auto',
            backgroundRepeat: 'repeat-y',
        });
    });

    it('falls back to white and the secondary colour without theme images', () => {
        const plain = withTheme({
            backgrounds: {
                top: { mode: 'cover', stableRepeat: false },
                content: { mode: 'cover', stableRepeat: false },
                extra: { mode: 'cover', stableRepeat: false },
            },
        });
        expect(sectionBackground(blank, 0, plain)).toEqual({ style: { background: '#ffffff' }, hasThemeImage: false });
        expect(sectionBackground(blank, 1, plain).style).toEqual({ background: '#efe7ec' });
    });

    it('uses a solid colour the section picked', () => {
        const section = { ...blank, style: { ...blank.style, background: { kind: 'color' as const, color: '#123456' } } };
        expect(sectionBackground(section, 0, ctx).style).toEqual({ background: '#123456' });
    });
});

describe('text contrast', () => {
    const dark = { ...blank, style: { ...blank.style, background: { kind: 'color' as const, color: '#2f2b2d' } } };

    it('detects dark colours', () => {
        expect(isDarkColor('#2f2b2d')).toBe(true);
        expect(isDarkColor('#efe7ec')).toBe(false);
        expect(isDarkColor('transparent')).toBe(false);
    });

    it('switches to light text on a dark solid background only when the theme allows it', () => {
        expect(sectionTextContrast(dark, 0, ctx)).toBe('normal');
        expect(sectionTextContrast(dark, 0, withTheme({ autoTextContrast: true }))).toBe('light');
    });

    it('keeps the host choice over the automatic one', () => {
        const base = { ...dark, style: { ...dark.style, textContrast: 'base' as const } };
        expect(sectionTextContrast(base, 0, withTheme({ autoTextContrast: true }))).toBe('base');
    });

    it('marks light sections and sets their text colour', () => {
        const shell = sectionShell(dark, 0, withTheme({ autoTextContrast: true }));
        expect(shell.className).toBe('section wedart-text-contrast-light');
        expect(shell.style).toMatchObject({ color: '#ffffff', '--site-text': '#ffffff' });
    });
});

describe('sectionShell', () => {
    it('keeps the saved height and padding only where they are part of the composition', () => {
        const saved = { minHeight: 300, paddingY: 20 };
        const footer = { ...SAMPLE_SECTIONS.footer, style: { ...SAMPLE_SECTIONS.footer.style, ...saved } };
        expect(sectionShell(footer, 0, ctx).style).toMatchObject({ minHeight: '300px', paddingTop: '20px', paddingBottom: '20px' });

        const style = sectionShell({ ...blank, style: { ...blank.style, ...saved } }, 0, ctx).style;
        expect(style.minHeight).toBeUndefined();
        expect(style.paddingTop).toBeUndefined();
    });

    it('names footers and theme backgrounds', () => {
        // The sample section above the footer has art on its bottom edge.
        expect(sectionShell(SAMPLE_SECTIONS.footer, 0, ctx).className).toBe('section footer wedart-transition-adjacent');
        // The sample top section has falling petals.
        expect(sectionShell(SAMPLE_SECTIONS.top, 0, ctx).className).toBe('section has-theme-bg wedart-bg-effect-active');
    });
});

describe('textStyleCss', () => {
    it('gives added text 18px above and nothing below', () => {
        const css = textStyleCss({ size: 20 }, { role: 'body', contrast: 'normal', defaultMarginTop: 18 }, ctx);
        expect(css).toMatchObject({ fontFamily: 'inherit', fontSize: '20px', marginTop: '18px', marginBottom: 0, textAlign: 'center' });
    });

    it('lets a host turn italic off where the field is italic by default', () => {
        const role = { role: 'body', contrast: 'normal' } as const;
        expect(textStyleCss({ italic: false }, role, ctx).fontStyle).toBe('normal');
        expect(textStyleCss({ italic: true }, role, ctx).fontStyle).toBe('italic');
        expect(textStyleCss({}, role, ctx).fontStyle).toBeUndefined();
    });

    it('leaves section fields without margins unless set', () => {
        const css = textStyleCss({ align: 'left' }, { role: 'title', contrast: 'normal' }, ctx);
        expect(css).toMatchObject({ textAlign: 'left', marginLeft: 0, marginRight: 'auto' });
        expect(css.marginTop).toBeUndefined();
    });

    it('uses the preset font when the theme has a preset', () => {
        const preset = withTheme({ typographyPresetId: 'p1' });
        expect(resolveFont(undefined, 'title', preset)).toBe('var(--title-font)');
        expect(resolveFont('Cinzel', 'title', preset)).toBe('Cinzel');
    });
});

describe('customSectionLayout', () => {
    const text = (id: string, fullWidth = false): InvitationElement => ({ id, kind: 'text', role: 'paragraph', text: id, style: {}, fullWidth });

    it('stacks everything without a column break', () => {
        expect(customSectionLayout([text('a'), text('b')])).toEqual({ columns: false, items: [text('a'), text('b')] });
    });

    it('splits around the break and lifts full-width text above', () => {
        const layout = customSectionLayout([text('head', true), text('a'), { id: 'br', kind: 'columnBreak' }, text('b')]);
        expect(layout).toEqual({ columns: true, fullWidth: [text('head', true)], left: [text('a')], right: [text('b')] });
    });
});

describe('themeAssetName', () => {
    it('names theme elements and nothing else', () => {
        expect(themeAssetName({ source: 'theme', assetId: 'el-leaf' }, ctx)).toBe('Φύλλο');
        expect(themeAssetName({ source: 'media', mediaId: 'm-1' }, ctx)).toBeUndefined();
    });
});

describe('the feed background colour', () => {
    const base = defaultFeedLayout();
    const photo = {
        ...(SAMPLE_SECTIONS.dressCode as InvitationSection),
        style: { ...SAMPLE_SECTIONS.dressCode.style, background: { kind: 'image', image: { source: 'media', mediaId: 'm-1' } } },
    } as InvitationSection;
    const document = (backgroundColor?: string) => ({
        ...base,
        overrides: backgroundColor ? { backgroundColor } : {},
        sections: [...base.sections, photo],
    });
    const photoUrl = () => 'https://media.example/photo.webp';

    it('is every section background, photos included', () => {
        const feed = buildRenderContext(document('#F5E6D3'), wallThemeDesign(null), photoUrl);
        expect(sectionBackground(base.sections[0], 0, feed).style.background).toBe('#F5E6D3');
        expect(sectionBackground(photo, 4, feed).style.background).toBe('#F5E6D3');
        expect(sectionBackgroundPhotos(photo, 4, feed)).toBeUndefined();
    });

    it('is drawn lightened when ink text cannot be read on it', () => {
        const feed = buildRenderContext(document('#000000'), wallThemeDesign(null), photoUrl);
        expect(feed.backgroundColor).toBe(readableOnInk('#000000'));
    });

    it('falls back to ink for a theme text colour that cannot be read on it', () => {
        const light = { ...wallThemeDesign(null), colors: { ...wallThemeDesign(null).colors, text: '#FFFFFF' } };
        expect(buildRenderContext(document('#F5E6D3'), light, photoUrl).textColor).toBe(INK_COLOR);
        expect(buildRenderContext(document(), light, photoUrl).textColor).toBe('#FFFFFF');
    });

    it('decides the automatic text contrast, not the section colour', () => {
        const dark = {
            ...base.sections[0],
            style: { ...base.sections[0].style, textContrast: 'auto', background: { kind: 'color', color: '#000000' } },
        } as InvitationSection;
        const feed = buildRenderContext(document('#F5E6D3'), wallThemeDesign(null), photoUrl);
        expect(sectionTextContrast(dark, 0, feed)).toBe('normal');
        expect(sectionTextContrast(dark, 0, buildRenderContext(document(), wallThemeDesign(null), photoUrl))).toBe('light');
    });

    it('changes nothing without one', () => {
        const feed = buildRenderContext(document(), wallThemeDesign(null), photoUrl);
        expect(feed.backgroundColor).toBeUndefined();
        expect(sectionBackgroundPhotos(photo, 4, feed)).toEqual({
            desktop: 'https://media.example/photo.webp',
            mobile: 'https://media.example/photo.webp',
        });
    });
});

describe('a feed page that draws the theme background itself', () => {
    const auto = {
        ...(SAMPLE_SECTIONS.dressCode as InvitationSection),
        style: { ...SAMPLE_SECTIONS.dressCode.style, background: { kind: 'theme', slot: 'auto' } },
    } as InvitationSection;
    const pickedTop = { ...auto, style: { ...auto.style, background: { kind: 'theme', slot: 'top' } } } as InvitationSection;
    const coloured = { ...auto, style: { ...auto.style, background: { kind: 'color', color: '#112233' } } } as InvitationSection;
    const page = { ...ctx, pageBackdrop: true };

    it('draws a section left on auto transparent, at every position', () => {
        const transparent = { style: { background: 'transparent' }, hasThemeImage: false };
        expect(sectionBackground(auto, 1, page)).toEqual(transparent);
        expect(sectionBackground(auto, 2, page)).toEqual(transparent);
    });

    it('keeps a picked theme slot and a picked colour', () => {
        expect(sectionBackground(pickedTop, 1, page).hasThemeImage).toBe(true);
        expect(sectionBackground(coloured, 1, page).style.background).toBe('#112233');
    });

    it("reads the photo tint off the page's content background", () => {
        expect(sectionBackgroundPhotos(auto, 2, page)).toEqual({ desktop: media('m-content'), mobile: media('m-content') });
    });

    it('reads the automatic text contrast off the page colour when the content slot has no image', () => {
        const plain = {
            ...SAMPLE_THEME,
            autoTextContrast: true,
            backgrounds: { ...SAMPLE_THEME.backgrounds, content: { mode: 'cover', stableRepeat: false } },
        } as ThemeDesign;
        const darkPage = { ...buildRenderContext(SAMPLE_DOCUMENT, { ...plain, colors: { ...plain.colors, secondary: '#111111' } }, media), pageBackdrop: true };
        expect(sectionTextContrast(auto, 2, darkPage)).toBe('light');
    });

    it('changes nothing without it', () => {
        expect(sectionBackground(auto, 2, ctx).hasThemeImage).toBe(true);
    });
});

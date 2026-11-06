import { describe, expect, it } from 'vitest';

import type { InvitationElement } from '@/lib/invitation/elements';
import {
    buildRenderContext,
    customSectionLayout,
    isDarkColor,
    resolveFont,
    sectionBackground,
    sectionShell,
    sectionTextContrast,
    textStyleCss,
    themeAssetName,
} from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
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
        const plain = withTheme({ backgrounds: { top: { mode: 'cover', stableRepeat: false }, content: { mode: 'cover', stableRepeat: false }, extra: { mode: 'cover', stableRepeat: false } } });
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
        expect(sectionShell(SAMPLE_SECTIONS.footer, 0, ctx).className).toBe('section footer');
        expect(sectionShell(SAMPLE_SECTIONS.top, 0, ctx).className).toBe('section has-theme-bg');
    });
});

describe('textStyleCss', () => {
    it('gives added text 18px above and nothing below', () => {
        const css = textStyleCss({ size: 20 }, { role: 'body', contrast: 'normal', defaultMarginTop: 18 }, ctx);
        expect(css).toMatchObject({ fontFamily: 'inherit', fontSize: '20px', marginTop: '18px', marginBottom: 0, textAlign: 'center' });
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

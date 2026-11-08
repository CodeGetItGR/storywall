import type { CSSProperties } from 'react';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import { INVITATION_LABELS, type InvitationLabels, invitationLanguage } from '@/lib/invitation/labels';
import type { ImageRef, TextStyle } from '@/lib/invitation/primitives';
import type { RsvpSender } from '@/lib/invitation/rsvp';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { PHOTO_SHAPES } from '@/lib/invitation/theme';

// Pure rules the invitation renderer follows. Each one is ported from the old
// renderer (save-my-date public/legacy) and keeps its behaviour exactly, so
// converted invitations look the same.

export type MediaResolver = (mediaId: string) => string | undefined;

export type TypographyPreset = { titleFont: string; bodyFont: string; buttonFont?: string };

export type RenderContext = {
    theme: ThemeDesign;
    media: MediaResolver;
    titleFont: string;
    bodyFont: string;
    buttonFont?: string;
    textColor: string;
    // A preset decides the font of text that has none of its own.
    presetMode: boolean;
    // A preset the host picked replaces every font on the page.
    forcePreset: boolean;
    // The date the countdown counts to: the first date section's, hidden or not.
    eventIso?: string;
    // Fixed labels in the invitation's own language.
    labels: InvitationLabels;
    // Sends an RSVP reply. Without one (the preview) the form shows its
    // success state and nothing is saved.
    sendRsvp?: RsvpSender;
};

const DEFAULT_TEXT_COLOR = '#2f2b2d';
const DEFAULT_SECONDARY = '#efe7ec';

export function buildRenderContext(
    document: InvitationDocument,
    theme: ThemeDesign,
    media: MediaResolver,
    hostPreset?: TypographyPreset,
    sendRsvp?: RsvpSender,
): RenderContext {
    const forcePreset = Boolean(document.overrides.typographyPresetId && hostPreset);
    const dateSection = document.sections.find((section) => section.type === 'date');
    return {
        theme,
        media,
        titleFont: forcePreset && hostPreset ? hostPreset.titleFont : theme.fonts.title,
        bodyFont: forcePreset && hostPreset ? hostPreset.bodyFont : theme.fonts.body,
        buttonFont: forcePreset && hostPreset ? hostPreset.buttonFont : theme.fonts.button,
        textColor: document.overrides.textColor ?? theme.colors.text ?? DEFAULT_TEXT_COLOR,
        presetMode: forcePreset || Boolean(theme.typographyPresetId),
        forcePreset,
        eventIso: dateSection?.type === 'date' ? dateSection.data.iso : undefined,
        labels: INVITATION_LABELS[invitationLanguage(document)],
        sendRsvp,
    };
}

const PHOTO_SHAPE_CSS: Record<(typeof PHOTO_SHAPES)[number], { ratio: string; radius: string; clip?: string }> = {
    square: { ratio: '1/1', radius: '4px' },
    portrait: { ratio: '3/4', radius: '4px' },
    landscape: { ratio: '4/3', radius: '4px' },
    circle: { ratio: '1/1', radius: '50%' },
    rounded: { ratio: '370/300', radius: '18px' },
    oval: { ratio: '4/3', radius: '50%' },
    arch: { ratio: '3/4', radius: '999px 999px 0 0' },
    extraRounded: { ratio: '370/300', radius: '40px' },
    hexagon: { ratio: '1/1', radius: '0', clip: 'polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)' },
    diamond: { ratio: '1/1', radius: '0', clip: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' },
    octagon: { ratio: '1/1', radius: '0', clip: 'polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%)' },
    teardrop: { ratio: '1/1', radius: '50% 50% 50% 0' },
    blob: { ratio: '1/1', radius: '62% 38% 35% 65% / 58% 42% 58% 42%' },
};

// The CSS variables the whole invitation reads (old setThemeVars).
export function themeCssVars(ctx: RenderContext): CSSProperties {
    const { colors, photoShape } = ctx.theme;
    const shape = PHOTO_SHAPE_CSS[photoShape];
    const vars: Record<string, string> = {
        '--primary': colors.primary,
        '--secondary': colors.secondary,
        '--title-font': ctx.titleFont,
        '--body-font': ctx.bodyFont,
        '--site-text': ctx.textColor,
        '--site-muted': ctx.textColor,
        '--family-photo-ratio': shape.ratio,
        '--family-photo-radius': shape.radius,
        '--family-photo-clip': shape.clip ?? 'none',
    };
    if (colors.buttonBg) vars['--btn-bg'] = colors.buttonBg;
    if (colors.buttonText) vars['--btn-text'] = colors.buttonText;
    if (ctx.buttonFont) vars['--btn-font'] = ctx.buttonFont;
    return vars as CSSProperties;
}

export function resolveImage(ref: ImageRef | undefined, ctx: RenderContext): string | undefined {
    if (!ref) return undefined;
    if (ref.source === 'media') return ctx.media(ref.mediaId);
    const asset = ctx.theme.elements.find((element) => element.id === ref.assetId);
    return asset ? ctx.media(asset.image.mediaId) : undefined;
}

// The admin's name for a theme asset, used as its alt text.
export function themeAssetName(ref: ImageRef, ctx: RenderContext): string | undefined {
    if (ref.source !== 'theme') return undefined;
    return ctx.theme.elements.find((element) => element.id === ref.assetId)?.name || undefined;
}

type ThemeSlot = 'top' | 'content' | 'extra';

// The theme background a section uses: its own pick, or top/content
// alternating by position. `index` counts hidden sections too.
function themeSlot(section: InvitationSection, index: number): ThemeSlot {
    const { background } = section.style;
    if (background.kind === 'theme' && background.slot !== 'auto') return background.slot;
    if (section.type === 'top') return 'top';
    return index % 2 ? 'content' : 'top';
}

function alternatingColor(index: number, ctx: RenderContext): string {
    return index % 2 ? ctx.theme.colors.secondary || DEFAULT_SECONDARY : '#ffffff';
}

export type SectionBackground = { style: CSSProperties; hasThemeImage: boolean };

export function sectionBackground(section: InvitationSection, index: number, ctx: RenderContext): SectionBackground {
    const { background } = section.style;
    if (background.kind === 'color') {
        return { style: { background: background.color || ctx.theme.colors.secondary }, hasThemeImage: false };
    }
    if (background.kind === 'image') {
        const url = resolveImage(background.image, ctx);
        if (url) {
            return {
                style: { backgroundImage: cssUrl(url), backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' },
                hasThemeImage: false,
            };
        }
    }
    const slot = ctx.theme.backgrounds[themeSlot(section, index)];
    const desktop = slot.desktop ? ctx.media(slot.desktop.mediaId) : undefined;
    const mobile = slot.mobile ? ctx.media(slot.mobile.mediaId) : undefined;
    const desktopSrc = desktop ?? mobile;
    if (!desktopSrc) return { style: { background: alternatingColor(index, ctx) }, hasThemeImage: false };

    const vars = { '--smd-bg-desktop': cssUrl(desktopSrc), '--smd-bg-mobile': cssUrl(mobile ?? desktopSrc) };
    return { style: { ...vars, ...themeBackgroundPresentation(slot) } as CSSProperties, hasThemeImage: true };
}

function themeBackgroundPresentation(slot: ThemeDesign['backgrounds']['top']): CSSProperties {
    if (slot.stableRepeat) return { backgroundSize: '100% auto', backgroundRepeat: 'repeat-y', backgroundPosition: 'center top' };
    if (slot.mode === 'repeat' || slot.mode === 'texture') {
        return { backgroundSize: 'var(--smd-bg-tile-size) auto', backgroundRepeat: 'repeat', backgroundPosition: 'center top' };
    }
    return { backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
}

function cssUrl(url: string): string {
    return `url("${url.replace(/["\\\n\r]/g, (char) => encodeURIComponent(char))}")`;
}

// The photo a section shows behind its text on a wide and on a narrow
// invitation: the host's photo, or the theme background's desktop and mobile
// images, picked the same way sectionBackground picks them.
export type SectionPhotos = { desktop: string; mobile: string };

export function sectionBackgroundPhotos(section: InvitationSection, index: number, ctx: RenderContext): SectionPhotos | undefined {
    const { background } = section.style;
    if (background.kind === 'color') return undefined;
    if (background.kind === 'image') {
        const url = resolveImage(background.image, ctx);
        if (url) return { desktop: url, mobile: url };
    }
    const slot = ctx.theme.backgrounds[themeSlot(section, index)];
    const desktop = slot.desktop ? ctx.media(slot.desktop.mediaId) : undefined;
    const mobile = slot.mobile ? ctx.media(slot.mobile.mediaId) : undefined;
    const wide = desktop ?? mobile;
    return wide ? { desktop: wide, mobile: mobile ?? wide } : undefined;
}

export type SectionPhotoTint = { photos: SectionPhotos; textColor: string };

// What the browser needs to keep text on a photo readable: the photos and the
// colour of text that has none of its own. A host who picked the text
// contrast by hand gets no tint, and a photo section's photo is its content,
// not a background.
export function sectionPhotoTint(section: InvitationSection, index: number, ctx: RenderContext): SectionPhotoTint | undefined {
    if (section.style.textContrast !== 'auto' || section.type === 'photo') return undefined;
    const photos = sectionBackgroundPhotos(section, index, ctx);
    return photos ? { photos, textColor: ctx.textColor } : undefined;
}

// A solid colour behind the section, or '' when it shows an image.
function solidBackgroundColor(section: InvitationSection, index: number, ctx: RenderContext): string {
    const { background } = section.style;
    if (background.kind === 'color') return background.color || ctx.theme.colors.secondary || DEFAULT_SECONDARY;
    if (background.kind === 'image') return '';
    const slot = ctx.theme.backgrounds[themeSlot(section, index)];
    if (slot.desktop || slot.mobile) return '';
    return alternatingColor(index, ctx);
}

export function isDarkColor(hex: string): boolean {
    const raw = hex.trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return false;
    const [r, g, b] = [0, 2, 4].map((at) => {
        const channel = parseInt(raw.slice(at, at + 2), 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.24;
}

export type TextContrast = 'normal' | 'light' | 'base';

// Automatic contrast only steps in on a reliably dark, solid background.
export function sectionTextContrast(section: InvitationSection, index: number, ctx: RenderContext): TextContrast {
    const manual = section.style.textContrast;
    if (manual === 'light' || manual === 'base') return manual;
    if (!ctx.theme.autoTextContrast) return 'normal';
    const color = solidBackgroundColor(section, index, ctx);
    return color && isDarkColor(color) ? 'light' : 'normal';
}

export function resolveTextColor(contrast: TextContrast, explicit: string | undefined, ctx: RenderContext): string | undefined {
    if (contrast === 'light') return '#ffffff';
    if (contrast === 'base') return ctx.textColor;
    return explicit || undefined;
}

export type SectionShell = { className: string; style: CSSProperties; contrast: TextContrast };

const KEEPS_SAVED_HEIGHT: ReadonlySet<InvitationSection['type']> = new Set(['photo', 'photoFrame', 'footer']);

// The <section> around every section type (old sectionHtml).
export function sectionShell(section: InvitationSection, index: number, ctx: RenderContext): SectionShell {
    const contrast = sectionTextContrast(section, index, ctx);
    const background = sectionBackground(section, index, ctx);
    const baseText = resolveTextColor(contrast, ctx.textColor, ctx) || ctx.textColor;
    const { minHeight, paddingY } = section.style;
    const style: Record<string, unknown> = {
        ...background.style,
        color: baseText,
        '--site-text': baseText,
        '--site-muted': baseText,
    };
    // The countdown's numbers need almost the full width on phones.
    if (section.type === 'countdown') style['--section-side-pad-mobile'] = '4px';
    // The saved height and padding are editor aids: guests only see them where
    // they are part of the composition (old wedartStripEditingUI).
    if (KEEPS_SAVED_HEIGHT.has(section.type)) {
        if (minHeight) style.minHeight = `${minHeight}px`;
        if (paddingY !== undefined) {
            style.paddingTop = `${paddingY}px`;
            style.paddingBottom = `${paddingY}px`;
        }
    }
    const className = [
        'section',
        section.type === 'footer' && 'footer',
        section.type === 'photo' && 'photo-section',
        section.type === 'photoFrame' && 'photo-frame',
        background.hasThemeImage && 'has-theme-bg',
        contrast === 'light' && 'wedart-text-contrast-light',
    ]
        .filter(Boolean)
        .join(' ');
    return { className, style: style as CSSProperties, contrast };
}

// Theme art (main art, location icons) never outgrows its container.
export function artImageStyle(base: number, scale: number, isIcon = false): CSSProperties {
    const size = Math.round(base * scale);
    return { width: `min(${size}px, ${isIcon ? 60 : 94}%)`, maxWidth: 'none', height: 'auto', maxHeight: 'none' };
}

export function artAnimationClass(animation: string): string {
    return animation === 'none' ? '' : `wedart-anim-${animation}`;
}

export type TextRole = 'title' | 'body';

export function elementTextRole(role: 'title' | 'subtitle' | 'paragraph'): TextRole {
    return role === 'paragraph' ? 'body' : 'title';
}

export function resolveFont(font: string | undefined, role: TextRole, ctx: RenderContext): string {
    const presetFont = role === 'title' ? 'var(--title-font)' : 'var(--body-font)';
    if (ctx.forcePreset) return presetFont;
    if (font && font !== 'inherit') return font;
    return ctx.presetMode ? presetFont : 'inherit';
}

type TextCssOptions = {
    role: TextRole;
    contrast: TextContrast;
    // Added text elements default to 18px above; section fields to nothing.
    defaultMarginTop?: number;
};

export function textStyleCss(style: TextStyle, options: TextCssOptions, ctx: RenderContext): CSSProperties {
    const align = style.align ?? 'center';
    const marginTop = style.marginTop ?? options.defaultMarginTop;
    const css: CSSProperties = {
        fontFamily: resolveFont(style.font, options.role, ctx),
        color: resolveTextColor(options.contrast, style.color, ctx),
        maxWidth: '100%',
        textAlign: align,
        marginLeft: align === 'left' ? 0 : 'auto',
        marginRight: align === 'right' ? 0 : 'auto',
    };
    if (style.size) css.fontSize = `${style.size}px`;
    if (marginTop !== undefined) css.marginTop = `${marginTop}px`;
    if (style.marginBottom !== undefined) css.marginBottom = `${style.marginBottom}px`;
    else if (options.defaultMarginTop !== undefined) css.marginBottom = 0;
    if (style.lineHeight) css.lineHeight = style.lineHeight;
    if (style.bold) css.fontWeight = 700;
    // Some fields are italic by default, so a host who turns italic off needs `normal`, not nothing.
    if (style.italic !== undefined) css.fontStyle = style.italic ? 'italic' : 'normal';
    return css;
}

// Custom sections split their elements into a full-width header and two
// columns around the column break; without a break everything stacks.
export type CustomLayout =
    | { columns: false; items: InvitationElement[] }
    | { columns: true; fullWidth: InvitationElement[]; left: InvitationElement[]; right: InvitationElement[] };

export function customSectionLayout(elements: InvitationElement[]): CustomLayout {
    const breakAt = elements.findIndex((element) => element.kind === 'columnBreak');
    if (breakAt < 0) return { columns: false, items: elements };
    const isFullWidth = (element: InvitationElement) => element.kind === 'text' && element.fullWidth === true;
    const inColumn = (element: InvitationElement) => element.kind !== 'columnBreak' && !isFullWidth(element);
    return {
        columns: true,
        fullWidth: elements.filter(isFullWidth),
        left: elements.slice(0, breakAt).filter(inColumn),
        right: elements.slice(breakAt + 1).filter(inColumn),
    };
}

import type { MediaCollector } from '@/lib/invitation/convert/media';
import type { Reader } from '@/lib/invitation/convert/reader';
import { documentLink } from '@/lib/invitation/documentLink';
import { colorSchema, fontSchema, type ImageRef, type TextStyle } from '@/lib/invitation/primitives';

// What every part of a conversion shares.
export type ConvertContext = {
    media: MediaCollector;
    // Old theme element URL → theme asset id.
    themeElementIds: Map<string, string>;
    warnings: string[];
};

export function warn(ctx: ConvertContext, path: string, message: string) {
    ctx.warnings.push(`${path}: ${message}`);
}

export function cleanColor(value: string): string | undefined {
    const color = value.trim();
    return color && colorSchema.safeParse(color).success ? color : undefined;
}

export function cleanFont(value: string): string | undefined {
    const font = value.trim();
    if (!font || font === 'inherit') return undefined;
    return fontSchema.safeParse(font).success ? font : undefined;
}

export function clamp(value: number | undefined, min: number, max: number): number | undefined {
    if (value === undefined) return undefined;
    return Math.min(max, Math.max(min, value));
}

// Old links were free text. Bare domains get https://; anything else that is
// not a supported link is cleared and reported.
export function cleanLink(value: string, ctx: ConvertContext, path: string): string {
    const link = documentLink(value);
    if (link !== null) return link;
    warn(ctx, path, `cleared a link that is not a web address (${value.trim().slice(0, 60)})`);
    return '';
}

// An old image URL as an image reference. Theme elements stay theme assets.
export function imageRef(value: string, ctx: ConvertContext): ImageRef | undefined {
    const url = value.trim();
    if (!url) return undefined;
    const assetId = ctx.themeElementIds.get(url);
    if (assetId) return { source: 'theme', assetId };
    const mediaId = ctx.media.add(url);
    return mediaId ? { source: 'media', mediaId } : undefined;
}

export function mediaRef(value: string, ctx: ConvertContext): { mediaId: string } | undefined {
    const mediaId = ctx.media.add(value);
    return mediaId ? { mediaId } : undefined;
}

// One old text style (a `_style` entry or an added text's own fields).
// `marginY` was the fallback for both margins.
export function readTextStyle(style: Reader): TextStyle {
    const marginY = style.num('marginY');
    const out: TextStyle = {
        font: cleanFont(style.str('font')),
        size: clamp(style.num('size'), 6, 400),
        color: cleanColor(style.str('color')),
        align: readAlign(style.str('align')),
        bold: style.bool('bold') || undefined,
        italic: style.bool('italic') || undefined,
        lineHeight: clamp(style.num('lineHeight'), 0.5, 4),
        marginTop: clamp(style.num('marginTop') ?? marginY, -500, 1000),
        marginBottom: clamp(style.num('marginBottom') ?? marginY, -500, 1000),
    };
    return Object.fromEntries(Object.entries(out).filter(([, value]) => value !== undefined)) as TextStyle;
}

function readAlign(value: string): TextStyle['align'] {
    return value === 'left' || value === 'right' || value === 'center' ? value : undefined;
}

export function definedOnly<T extends Record<string, unknown>>(value: T): T | undefined {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== '');
    return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

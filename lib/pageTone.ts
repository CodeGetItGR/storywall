import type { CSSProperties } from 'react';

import { contrastRatio, INK_COLOR, luminanceContrast, MIN_INK_CONTRAST, mixColors, relativeLuminance, tooDarkForInk } from '@/lib/contrast';
import type { PhotoTone } from '@/lib/invitation/photoContrast';

// What the page looks like behind the text: one colour, or how light a theme's picture is.
type PageSurface = string | PhotoTone;

// The colours of everything drawn straight on a page ink doesn't read on (KAN-278). Cards and pills keep theirs.
export type PageTone = {
    // Light text on a dark page, or dark text on a middle colour.
    text: 'light' | 'dark';
    ink: string;
    muted: string;
    // Text on the side panel's white curtain over a theme.
    panelInk: string;
};

const WHITE = '#FFFFFF';
const BLACK = '#000000';
// How far the labels are from the text's colour, toward the page's.
const MUTED_MIX = 0.2;
// The side panel's curtain (RightContextPanel: bg-white/50).
const CURTAIN = 0.5;

function grayOf(luminance: number): string {
    const channel = luminance <= 0.0031308 ? luminance * 12.92 : 1.055 * luminance ** (1 / 2.4) - 0.055;
    const hex = Math.round(Math.min(1, Math.max(0, channel)) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    return `#${hex}${hex}${hex}`;
}

// The text's contrast where it reads worst.
export function contrastOn(surface: PageSurface, color: string): number {
    if (typeof surface === 'string') return contrastRatio(color, surface);
    const text = relativeLuminance(color);
    return Math.min(luminanceContrast(text, surface.dark), luminanceContrast(text, surface.light));
}

function reads(surface: PageSurface, color: string): boolean {
    return contrastOn(surface, color) >= MIN_INK_CONTRAST;
}

// Ink, else white, else black: one of them reads on any colour. On a picture too varied for all three, the better of
// ink and white.
export function readableTextOn(surface: PageSurface): string {
    const readable = [INK_COLOR, WHITE, BLACK].find((color) => reads(surface, color));
    if (readable) return readable;
    return contrastOn(surface, WHITE) > contrastOn(surface, INK_COLOR) ? WHITE : INK_COLOR;
}

// null: the page keeps the app's own text colours.
export function pageToneOf(surface: PageSurface | null | undefined): PageTone | null {
    if (!surface) return null;
    const ink = readableTextOn(surface);
    if (typeof surface === 'string' ? !tooDarkForInk(surface) : ink === INK_COLOR) return null;
    const behind = typeof surface === 'string' ? surface : grayOf(surface.mean);
    const soft = mixColors(ink, behind, MUTED_MIX);
    const darkest = typeof surface === 'string' ? surface : grayOf(surface.dark);
    const curtain = mixColors(darkest, WHITE, CURTAIN);
    return {
        text: ink === WHITE ? 'light' : 'dark',
        ink,
        muted: reads(surface, soft) ? soft : ink,
        panelInk: reads(curtain, INK_COLOR) ? INK_COLOR : BLACK,
    };
}

// On the page's scope: `.on-page` elements inside it (app/globals.css) take these colours.
export function pageToneProps(tone: PageTone | null | undefined): { 'data-page-tone'?: PageTone['text'] } {
    return tone ? { 'data-page-tone': tone.text } : {};
}

export function pageToneStyle(tone: PageTone | null | undefined): CSSProperties | undefined {
    if (!tone) return undefined;
    return { '--page-ink': tone.ink, '--page-ink-muted': tone.muted, '--page-panel-ink': tone.panelInk } as CSSProperties;
}

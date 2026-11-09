import type { InvitationSection } from '@/lib/invitation/sections';

// Readable text on photo backgrounds. A photo is measured once in the browser
// (see photoToneStore.ts); these pure rules turn that measurement into a soft
// tint behind the text, and tell the editor when the host's own choice is
// still hard to read.

// How light a photo is behind the text, as relative luminance (0 black, 1 white).
// `dark` is its darkest tenth, `light` its lightest tenth: busy photos have both.
export type PhotoTone = { mean: number; dark: number; light: number };

// A soft layer between the photo and the text. `text: 'light'` turns the
// section's text white, except text the host gave a colour of its own.
export type PhotoTint = { color: 'dark' | 'light'; alpha: number; text: 'keep' | 'light' };

// WCAG AA for normal-size text.
export const READABLE_CONTRAST = 4.5;
// A tint stays soft: the photo has to show through.
export const MAX_TINT_ALPHA = 0.6;
const KEEP_COLOR_MARGIN = 0.1;

export function srgbToLinear(channel: number): number {
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function linearToSrgb(luminance: number): number {
    return luminance <= 0.0031308 ? luminance * 12.92 : 1.055 * Math.pow(luminance, 1 / 2.4) - 0.055;
}

// Relative luminance of a #rrggbb or #rgb colour, or undefined for anything else.
export function colorLuminance(color: string): number | undefined {
    let raw = color.trim().replace('#', '');
    if (/^[0-9a-fA-F]{3}$/.test(raw)) raw = [...raw].map((char) => char + char).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return undefined;
    const [r, g, b] = [0, 2, 4].map((at) => srgbToLinear(parseInt(raw.slice(at, at + 2), 16) / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: number, b: number): number {
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// The tone of RGBA pixels (a canvas's getImageData). Transparent pixels show
// the section behind them, not the photo, so they are left out.
export function photoToneFromPixels(data: ArrayLike<number>): PhotoTone | undefined {
    const values: number[] = [];
    for (let at = 0; at + 3 < data.length; at += 4) {
        if (data[at + 3] < 128) continue;
        const [r, g, b] = [data[at], data[at + 1], data[at + 2]].map((channel) => srgbToLinear(channel / 255));
        values.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }
    if (values.length === 0) return undefined;
    values.sort((a, b) => a - b);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const pick = (share: number) => values[Math.min(values.length - 1, Math.floor(values.length * share))];
    return { mean, dark: pick(0.1), light: pick(0.9) };
}

// Theme backgrounds switch to their mobile image at this invitation width,
// like the container query in invitation.css.
export const MOBILE_BACKGROUND_MAX_WIDTH = 760;

// The photo the invitation shows at this width.
export function shownPhoto(photos: { desktop: string; mobile: string }, invitationWidth: number): string {
    return invitationWidth <= MOBILE_BACKGROUND_MAX_WIDTH ? photos.mobile : photos.desktop;
}

// Whether text of this luminance reads on every part of the photo that matters.
function readsOn(tone: PhotoTone, text: number): boolean {
    return contrastRatio(text, tone.dark) >= READABLE_CONTRAST && contrastRatio(text, tone.light) >= READABLE_CONTRAST;
}

// The weakest tint of one colour that makes the text readable, or Infinity
// when no tint of that colour can. Tints blend in sRGB, as the browser does.
function tintAlpha(tone: PhotoTone, text: number, color: PhotoTint['color']): number {
    if (color === 'dark') {
        // Darkening helps only light text, and only the lightest parts are a problem.
        const target = (text + 0.05) / READABLE_CONTRAST - 0.05;
        if (target <= 0) return Infinity;
        const from = linearToSrgb(tone.light);
        const to = linearToSrgb(target);
        return from <= to ? 0 : 1 - to / from;
    }
    const target = READABLE_CONTRAST * (text + 0.05) - 0.05;
    if (target >= 1) return Infinity;
    const from = linearToSrgb(tone.dark);
    const to = linearToSrgb(target);
    return from >= to ? 0 : (to - from) / (1 - from);
}

function roundUp(alpha: number): number {
    return Math.ceil(alpha * 100) / 100;
}

// The tint a section on this photo needs for text of `textColor` (the colour
// of text with none of its own), or null when that text already reads. White text on a dark tint is the fallback for any
// text colour; the host's colour is kept when a weaker tint is enough for it.
export function photoTextTint(tone: PhotoTone, textColor: string): PhotoTint | null {
    const text = colorLuminance(textColor);
    if (text === undefined) return null;
    if (readsOn(tone, text)) return null;

    const keep = (['dark', 'light'] as const)
        .map((color) => ({ color, alpha: tintAlpha(tone, text, color) }))
        .reduce((best, option) => (option.alpha < best.alpha ? option : best));
    const white = tintAlpha(tone, 1, 'dark');

    // A dark tint under white text looks most like the photo itself, so a dark
    // colour is kept only when a clearly softer light tint is enough for it.
    const keepWins = keep.color === 'dark' ? keep.alpha <= white : keep.alpha + KEEP_COLOR_MARGIN <= white;
    if (keepWins) return { color: keep.color, alpha: roundUp(Math.min(keep.alpha, MAX_TINT_ALPHA)), text: 'keep' };
    return { color: 'dark', alpha: roundUp(Math.min(white, MAX_TINT_ALPHA)), text: 'light' };
}

export type TextContrastSetting = InvitationSection['style']['textContrast'];

// Whether the editor should warn that the text is hard to read on this photo.
// `textColor` is the invitation's text colour. A host who picked white or the
// theme's colour by hand gets no tint, so their pick has to read on its own.
// Automatic contrast always reads: white text needs a dark tint of at most
// WHITE_TEXT_WORST_TINT, even on a white photo.
export function isTextHardToReadOnPhoto(tone: PhotoTone, setting: TextContrastSetting, textColor: string): boolean {
    if (setting === 'auto') return false;
    const text = colorLuminance(setting === 'light' ? '#ffffff' : textColor);
    return text !== undefined && !readsOn(tone, text);
}

// The dark tint white text needs on a pure white photo.
export const WHITE_TEXT_WORST_TINT = tintAlpha({ mean: 1, dark: 1, light: 1 }, 1, 'dark');

export function tintBackground(tint: PhotoTint): string {
    return tint.color === 'dark' ? `rgba(0, 0, 0, ${tint.alpha})` : `rgba(255, 255, 255, ${tint.alpha})`;
}

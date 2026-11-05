import { isThemeFontUrl } from '@/lib/eventTheme';

// A font from the backend's font catalogue. Invitations name it by familyName.
export type InvitationFontDto = { key: string; familyName: string; fallback: 'serif' | 'sans-serif'; url: string };

// familyName is free text that lands inside CSS.
const SAFE_FAMILY_NAME = /^[^"'\\<>{};\r\n]+$/;

// The @font-face rules for the catalogue fonts an invitation mentions. `invitation` is its document,
// theme and preset: font names sit in many fields and inside rich text, so the check is on the whole
// text. A word in the wording that happens to match only adds a rule, and browsers download a font
// only when text uses it.
export function uploadedFontFaceCss(fonts: InvitationFontDto[], invitation: unknown): string {
    const text = JSON.stringify(invitation).toLowerCase();
    return fonts
        .filter((font) => SAFE_FAMILY_NAME.test(font.familyName) && isThemeFontUrl(font.url, font.key))
        .filter((font) => text.includes(font.familyName.toLowerCase()))
        .map((font) => `@font-face{font-family:"${font.familyName}";src:url("${font.url}") format("woff2");font-display:swap;}`)
        .join('');
}

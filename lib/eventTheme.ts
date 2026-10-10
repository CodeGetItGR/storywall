import type { CSSProperties } from 'react';

import type { EventDetailResponseDto, EventThemeFontDto } from '@/lib/api/types';
import { isEventDeleted, isEventEnded } from '@/lib/eventLifecycle';

// The only colour shape the backend stores for a theme (normalised upper-case there).
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: string): boolean {
    return HEX_COLOR_PATTERN.test(value);
}

// The guest-facing pages that wear the theme. The host's working pages (manage, share
// links, gallery QR, RSVP admin, checkout, plan settings) keep the default palette:
// their status chips and controls are drawn for it.
const THEMED_EVENT_PAGE =
    /^\/events\/[^/]+\/(?:feed|location|story\/schedule|tools\/(?:gallery(?!\/qr)|gifts|he-or-she|playlist|quiz|schedule|wishbook|rsvp\/submit))(?:\/|$)/;

export function isThemedEventPage(pathname: string): boolean {
    return THEMED_EVENT_PAGE.test(pathname);
}

const THEME_FONT_KEY = /^[a-z0-9][a-z0-9-]{1,62}$/;
// The same shape the font route serves: /api/theme-fonts/<key>/<version>.woff2, version without leading zeros.
const THEME_FONT_URL = /^\/api\/theme-fonts\/([a-z0-9][a-z0-9-]{1,62})\/(?:0|[1-9]\d{0,8})\.woff2$/;

// Whether a url is the font route's path for this font's own file.
export function isThemeFontUrl(url: string, key: string): boolean {
    return THEME_FONT_URL.exec(url)?.[1] === key;
}

// The backend shape is trusted, but these strings land inside CSS: only well-formed ones pass,
// and the url must be this font's own file.
function usableFont(font: EventThemeFontDto | null | undefined): font is EventThemeFontDto {
    if (!font || !THEME_FONT_KEY.test(font.key) || (font.fallback !== 'serif' && font.fallback !== 'sans-serif')) return false;
    return isThemeFontUrl(font.url, font.key);
}

export function themeFontFamily(font: EventThemeFontDto): string {
    return `"theme-${font.key}", ${font.fallback}`;
}

// The @font-face for a theme's heading font, or null when there is none (or it isn't well-formed).
export function themeFontFaceCss(font: EventThemeFontDto | null | undefined): string | null {
    if (!usableFont(font)) return null;
    return `@font-face{font-family:"theme-${font.key}";src:url("${font.url}") format("woff2");font-display:swap;}`;
}

export type EventThemeExtras = { titleColor?: string | null; headingFont?: EventThemeFontDto | null };

// The theme as CSS custom properties: --event-bg for `bg-event` surfaces, the same colour for post
// cards (--event-card-bg) with a darker shade of it as their divider (--event-card-line), the muted
// fill (pills, chips) turned near-white so it reads on the colour, the guest RSVP prompt's warm fill
// (--orangish) plain white so it stands out as a card, the title colour (--event-title) and the
// heading font (--event-heading-font, read by `.event-heading` inside a [data-theme-font] scope).
// Undefined keeps the default look: no theme, or a value that isn't #RRGGBB.
export function eventThemeStyle(backgroundColor: string | null | undefined, extras: EventThemeExtras = {}): CSSProperties | undefined {
    if (!backgroundColor || !isHexColor(backgroundColor)) return undefined;
    const style: Record<string, string> = {
        '--event-bg': backgroundColor,
        '--event-card-bg': backgroundColor,
        '--event-card-line': `color-mix(in oklab, ${backgroundColor} 85%, #000000)`,
        '--surface-muted': `color-mix(in oklab, ${backgroundColor} 15%, #ffffff)`,
        '--orangish': '#ffffff',
    };
    if (extras.titleColor && isHexColor(extras.titleColor)) style['--event-title'] = extras.titleColor;
    if (usableFont(extras.headingFont)) style['--event-heading-font'] = themeFontFamily(extras.headingFont);
    return style as CSSProperties;
}

// Spread on the theme scope's root so `.event-heading` switches to the theme font only when one is set.
export function themeFontScopeProps(font: EventThemeFontDto | null | undefined): { 'data-theme-font'?: '' } {
    return usableFont(font) ? { 'data-theme-font': '' } : {};
}

// Whether the host is offered the theme picker. Gated on the theme module's row being
// enabled, NOT on isAvailable: the backend sets isAvailable false for every non-ACTIVE
// event, so a draft (where the picker lives) would never get one. When the endpoints
// really are unavailable they answer 5012/5144 and the picker goes quiet on that.
export function canPickTheme(
    event: Pick<EventDetailResponseDto, 'modules' | 'deletedAt' | 'suspended' | 'schedule'>,
    now: number = Date.now(),
): boolean {
    if (isEventDeleted(event) || event.suspended || isEventEnded(event, now)) return false;
    return event.modules?.some((module) => module.moduleKey === 'theme' && module.isEnabled) ?? false;
}

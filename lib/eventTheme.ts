import type { CSSProperties } from 'react';

import type { EventDetailResponseDto } from '@/lib/api/types';
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
    /^\/events\/[^/]+\/(?:feed|location|story\/schedule|tools\/(?:gallery(?!\/qr)|gifts|playlist|quiz|schedule|wishbook|rsvp\/submit))(?:\/|$)/;

export function isThemedEventPage(pathname: string): boolean {
    return THEMED_EVENT_PAGE.test(pathname);
}

// The theme colour as the --event-bg custom property that `bg-event` surfaces read, and
// the muted fill (pills, chips) turned near-white so it reads on the colour; a hint of
// the theme keeps those pills visible inside white cards. The guest RSVP prompt's warm
// fill (--orangish) goes plain white so it stands out as a card. Undefined keeps the default
// look: no theme, or a value that isn't #RRGGBB.
export function eventThemeStyle(backgroundColor: string | null | undefined): CSSProperties | undefined {
    if (!backgroundColor || !isHexColor(backgroundColor)) return undefined;
    return {
        '--event-bg': backgroundColor,
        '--surface-muted': `color-mix(in oklab, ${backgroundColor} 15%, #ffffff)`,
        '--orangish': '#ffffff',
    } as CSSProperties;
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

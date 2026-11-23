import type { CSSProperties } from 'react';

import { lightTone, readableOnInk } from '@/lib/contrast';
import { WALL_THEME_ID } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { cssUrl, DEFAULT_SECONDARY, type MediaResolver, themeBackgroundPresentation } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

// How far the post cards' tone is mixed toward white from the page colour (spec option P1).
export const FEED_CARD_LIGHTEN = 0.6;

// What a Save my date theme draws behind the whole feed page (spec option T1): its content background, or its
// secondary colour, and the light tone the post cards sit on.
export type FeedPageBackdrop = {
    // The page colour, behind the image and on the solid surfaces (the sticky header), made readable for ink.
    color: string;
    image: { desktop: string; mobile: string } | null;
    size: string;
    repeat: string;
    position: string;
    cardColor: string;
};

// A cover image would stretch down the whole page; it is drawn once across the top instead.
const ONCE_ACROSS_THE_TOP = { size: '100% auto', repeat: 'no-repeat', position: 'center top' };

// null on the wall theme, and when the host picked the feed's own background colour (that colour wins).
export function feedPageBackdrop(document: InvitationDocument, theme: ThemeDesign, media: MediaResolver): FeedPageBackdrop | null {
    if (document.themeId === WALL_THEME_ID || document.overrides.backgroundColor) return null;
    const slot = theme.backgrounds.content;
    const color = readableOnInk(theme.colors.secondary || DEFAULT_SECONDARY);
    const desktop = slot.desktop ? media(slot.desktop.mediaId) : undefined;
    const mobile = slot.mobile ? media(slot.mobile.mediaId) : undefined;
    const wide = desktop ?? mobile;
    const presentation = themeBackgroundPresentation(slot);
    const drawn =
        slot.mode === 'cover' && !slot.stableRepeat
            ? ONCE_ACROSS_THE_TOP
            : { size: String(presentation.backgroundSize), repeat: String(presentation.backgroundRepeat), position: String(presentation.backgroundPosition) };
    return {
        color,
        image: wide ? { desktop: wide, mobile: mobile ?? wide } : null,
        ...drawn,
        cardColor: lightTone(color, FEED_CARD_LIGHTEN),
    };
}

// The variables `.feed-backdrop` (components/event/feedBackdrop.css) reads.
export function feedBackdropStyle(backdrop: FeedPageBackdrop | null): CSSProperties | undefined {
    if (!backdrop) return undefined;
    return {
        '--feed-backdrop-desktop': backdrop.image ? cssUrl(backdrop.image.desktop) : 'none',
        '--feed-backdrop-mobile': backdrop.image ? cssUrl(backdrop.image.mobile) : 'none',
        '--feed-backdrop-size': backdrop.size,
        '--feed-backdrop-repeat': backdrop.repeat,
        '--feed-backdrop-position': backdrop.position,
    } as CSSProperties;
}

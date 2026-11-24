import type { CSSProperties } from 'react';

import { lightTone, readableOnInk } from '@/lib/contrast';
import { WALL_THEME_ID } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { cssUrl, DEFAULT_SECONDARY, type MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { cn } from '@/lib/utils';

// How far the post cards' tone is mixed toward white from the page colour (spec option P1).
export const FEED_CARD_LIGHTEN = 0.6;

// What a Save my date theme draws behind the whole feed page (spec option T1): its content background down the
// page or fixed to the screen, or its secondary colour, and the light tone the post cards sit on.
export type FeedPageBackdrop = {
    // The page colour, behind the image and on its own where the theme has none, made readable for ink.
    color: string;
    image: { desktop: string; mobile: string } | null;
    size: string;
    repeat: string;
    position: string;
    // Tiles at the invitation's tile size rather than one picture as wide as the page. A strip on the page
    // (the sticky header) needs it to line its picture up with the page's (components/event/feedBackdrop.css).
    tiled: boolean;
    // One picture that fills the screen and stays still while the page scrolls over it (FeedBackdropLayer),
    // instead of a background that scrolls with the page.
    fixed: boolean;
    cardColor: string;
};

// A picture as wide as the page, repeating down it: a stable repeat, made to line up with itself.
const FULL_WIDTH = {
    size: '100% auto',
    repeat: 'repeat-y',
    position: 'center top',
    tiled: false,
    fixed: false,
};

// Tiles at the invitation's tile size, centred on the page.
const TILES = {
    size: 'var(--smd-bg-tile-size) auto',
    repeat: 'repeat',
    position: 'center top',
    tiled: true,
    fixed: false,
};

// A cover picture isn't made to repeat, and the feed is longer than one picture: repeated, its edges would show
// as a seam. It fills the screen instead and stays still while the page scrolls over it, like a wallpaper.
const FIXED = {
    size: 'cover',
    repeat: 'no-repeat',
    position: 'center',
    tiled: false,
    fixed: true,
};

// null on the wall theme, and when the host picked the feed's own background colour (that colour wins).
export function feedPageBackdrop(document: InvitationDocument, theme: ThemeDesign, media: MediaResolver): FeedPageBackdrop | null {
    if (document.themeId === WALL_THEME_ID || document.overrides.backgroundColor) return null;
    const slot = theme.backgrounds.content;
    const color = readableOnInk(theme.colors.secondary || DEFAULT_SECONDARY);
    const desktop = slot.desktop ? media(slot.desktop.mediaId) : undefined;
    const mobile = slot.mobile ? media(slot.mobile.mediaId) : undefined;
    const wide = desktop ?? mobile;
    // The slot's own repeat, as the invitation draws it (themeBackgroundPresentation); a cover picture stays put.
    const drawn = slot.stableRepeat ? FULL_WIDTH : slot.mode === 'cover' ? FIXED : TILES;
    return {
        color,
        image: wide ? { desktop: wide, mobile: mobile ?? wide } : null,
        ...drawn,
        cardColor: lightTone(color, FEED_CARD_LIGHTEN),
    };
}

// The page's classes for a backdrop (components/event/feedBackdrop.css); none without one.
export function feedBackdropClassName(backdrop: FeedPageBackdrop | null): string | undefined {
    if (!backdrop) return undefined;
    return cn('feed-backdrop', backdrop.fixed && 'feed-backdrop--fixed');
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
        '--feed-backdrop-tiled': backdrop.tiled ? 1 : 0,
    } as CSSProperties;
}

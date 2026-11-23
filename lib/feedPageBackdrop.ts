import type { CSSProperties } from 'react';

import { lightTone, readableOnInk } from '@/lib/contrast';
import { WALL_THEME_ID } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { cssUrl, DEFAULT_SECONDARY, type MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

// How far the post cards' tone is mixed toward white from the page colour (spec option P1).
export const FEED_CARD_LIGHTEN = 0.6;

// What a Save my date theme draws behind the whole feed page (spec option T1): its content background tiled
// down the page, or its secondary colour, and the light tone the post cards sit on.
export type FeedPageBackdrop = {
    // The page colour, behind the image and on its own where the theme has none, made readable for ink.
    color: string;
    image: { desktop: string; mobile: string } | null;
    size: string;
    repeat: string;
    position: string;
    // The same picture on a strip that sits on the page (the sticky header), lined up with the page. The strip
    // sets --feed-page-w (the page's width) and --feed-strip-x / -y (where it sits on the page) itself.
    stripSize: string;
    stripPosition: string;
    cardColor: string;
};

const STRIP_Y = 'calc(0px - var(--feed-strip-y))';

// A picture as wide as the page, repeating down it: a stable repeat, and a cover picture too, so the page never
// runs out of picture into a band of flat colour.
const FULL_WIDTH = {
    size: '100% auto',
    repeat: 'repeat-y',
    position: 'center top',
    stripSize: 'var(--feed-page-w) auto',
    stripPosition: `calc(0px - var(--feed-strip-x)) ${STRIP_Y}`,
};

// Tiles at the invitation's tile size, centred on the page.
const TILES = {
    size: 'var(--smd-bg-tile-size) auto',
    repeat: 'repeat',
    position: 'center top',
    stripSize: 'var(--smd-bg-tile-size) auto',
    stripPosition: `calc((var(--feed-page-w) - var(--smd-bg-tile-size)) / 2 - var(--feed-strip-x)) ${STRIP_Y}`,
};

// null on the wall theme, and when the host picked the feed's own background colour (that colour wins).
export function feedPageBackdrop(document: InvitationDocument, theme: ThemeDesign, media: MediaResolver): FeedPageBackdrop | null {
    if (document.themeId === WALL_THEME_ID || document.overrides.backgroundColor) return null;
    const slot = theme.backgrounds.content;
    const color = readableOnInk(theme.colors.secondary || DEFAULT_SECONDARY);
    const desktop = slot.desktop ? media(slot.desktop.mediaId) : undefined;
    const mobile = slot.mobile ? media(slot.mobile.mediaId) : undefined;
    const wide = desktop ?? mobile;
    // The slot's own repeat, as the invitation draws it (themeBackgroundPresentation), but never drawn once.
    const drawn = !slot.stableRepeat && (slot.mode === 'repeat' || slot.mode === 'texture') ? TILES : FULL_WIDTH;
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
        '--feed-backdrop-strip-size': backdrop.stripSize,
        '--feed-backdrop-strip-position': backdrop.stripPosition,
    } as CSSProperties;
}

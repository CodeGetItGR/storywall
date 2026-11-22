import { defaultFeedLayout, type FeedLayoutView } from '@/lib/feedLayout';
import { planFeedThemeSwitch } from '@/lib/feedThemes';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { type InvitationThemePublicDto, readThemePreview } from '@/lib/invitation/themePreview';
import { themeImageIds } from '@/lib/invitation/themeSwitch';

// The Overview's invitation to customize the feed (KAN-245). 'locked': the event has no Save my date and the
// main host can buy it now; 'included': it has Save my date, so hosts can start editing. Any event type: one
// without Save my date themes still gets edit mode.
export type FeedEditBannerState = 'locked' | 'included' | null;

export type FeedEditBannerInput = {
    // The feed editor is released here (FEED_EDITOR_LAUNCHED).
    flag: boolean;
    // The save_my_date module is available on the event.
    saveMyDate: boolean;
    // The event can be changed (isEventWritable).
    writable: boolean;
    // The event's plan sells the Save my date add-on.
    offered: boolean;
    // A live event: add-ons are bought on their own (featureAddonMode 'checkout').
    checkout: boolean;
    // The viewer may buy: the main host, not the demo, not incident mode.
    canBuy: boolean;
    // A withdrawal under review pauses purchases.
    paused: boolean;
};

export function feedEditBannerState(input: FeedEditBannerInput): FeedEditBannerState {
    if (!input.flag) return null;
    if (input.saveMyDate) return input.writable ? 'included' : null;
    return input.offered && input.checkout && input.canBuy && !input.paused ? 'locked' : null;
}

export type FeedEditBannerLook =
    { kind: 'invitation'; document: InvitationDocument; theme: ThemeDesign; media: MediaResolver; cover: InvitationSection } | { kind: 'wall' };

const WALL_LOOK: FeedEditBannerLook = { kind: 'wall' };

// What the banner's picture draws: the event's cover in the layout's own Save my date theme, or, on the wall
// theme, in the stand-in theme (`fallback`, the catalogue's first for the event type). Without one (an event
// type with no Save my date themes, or one that doesn't load or read), the cover in the event's wall look.
export function feedEditBannerLook(layout: FeedLayoutView, fallback: InvitationThemePublicDto | undefined): FeedEditBannerLook {
    const withCover = (document: InvitationDocument, theme: ThemeDesign, media: MediaResolver): FeedEditBannerLook => {
        const cover = document.sections.find((section) => section.type === 'feedCover');
        return cover ? { kind: 'invitation', document, theme, media, cover } : WALL_LOOK;
    };
    if (layout.themeSlug) return withCover(layout.document, layout.theme, layout.media);
    if (!fallback) return WALL_LOOK;
    try {
        const preview = readThemePreview(fallback);
        const document = planFeedThemeSwitch(defaultFeedLayout(), { ...preview, imageIds: themeImageIds(fallback.assetUrls) }, new Set());
        return withCover(document, preview.theme, preview.media);
    } catch {
        return WALL_LOOK;
    }
}

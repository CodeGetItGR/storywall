import type { CSSProperties } from 'react';

import type { EventDetailResponseDto, EventThemeFontDto } from '@/lib/api/types';
import { eventThemeStyle } from '@/lib/eventTheme';
import { defaultFeedLayout, type FeedLayoutView } from '@/lib/feedLayout';
import { feedPageTheme } from '@/lib/feedPageTheme';
import { stillSection } from '@/lib/feedSectionPreview';
import { planFeedThemeSwitch } from '@/lib/feedThemes';
import type { InvitationDocument } from '@/lib/invitation/document';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext, type MediaResolver, type RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { type InvitationThemePublicDto, readThemePreview } from '@/lib/invitation/themePreview';
import { themeImageIds } from '@/lib/invitation/themeSwitch';
import { type InvitationFontDto, uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

// The Overview banner's picture (KAN-245). Kept apart from lib/feedEditBanner.ts so the Overview, which only
// needs the banner's rule, never loads the renderer; only the lazy picture imports this.

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

// The event theme scope the feed page draws around the cover (EventThemeScope with the feed's override).
export type FeedEditBannerScope = { style: CSSProperties | undefined; headingFont: EventThemeFontDto | null };

export type FeedEditBannerPicture = { event: EventDetailResponseDto; scope: FeedEditBannerScope } & (
    { kind: 'wall' } | { kind: 'invitation'; ctx: RenderContext; cover: InvitationSection; index: number; lang: string; fontFaces: string }
);

type FeedEditBannerPictureInput = {
    event: EventDetailResponseDto;
    // The saved layout's document: its background colour is the wall look's.
    layoutDocument: InvitationDocument;
    fonts: InvitationFontDto[];
    locale: string;
};

// The look as the picture draws it, the way the feed does: the event's wall theme with the drawn document's
// background colour around the cover (and passed to the cover), and in a Save my date theme the cover as a
// still section with no text animation.
export function feedEditBannerPicture(
    look: FeedEditBannerLook,
    { event, layoutDocument, fonts, locale }: FeedEditBannerPictureInput,
): FeedEditBannerPicture {
    const background = (look.kind === 'invitation' ? look.document : layoutDocument).overrides.backgroundColor;
    const theme = feedPageTheme(event.theme, background).theme;
    const style = eventThemeStyle(theme?.backgroundColor, { titleColor: theme?.titleColor, headingFont: theme?.headingFont });
    // The font rides with the rest of the theme: a theme whose colour is unusable is no theme at all.
    const scope = { style, headingFont: style ? (theme?.headingFont ?? null) : null };
    const themed = theme === event.theme ? event : { ...event, theme };
    if (look.kind === 'wall') return { kind: 'wall', event: themed, scope };

    const ctx: RenderContext = {
        ...buildRenderContext(look.document, { ...look.theme, textAnimation: 'none' }, look.media),
        labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'],
        // The cover stands alone, so no neighbour's transition reaches it.
        transitionAdjacent: new Set(),
    };
    return {
        kind: 'invitation',
        event: themed,
        scope,
        ctx,
        cover: stillSection(look.cover),
        index: look.document.sections.indexOf(look.cover),
        lang: locale,
        fontFaces: uploadedFontFaceCss(fonts, [look.document, look.theme]),
    };
}

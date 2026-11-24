import type { CSSProperties } from 'react';

import type { EventDetailResponseDto, EventThemeFontDto } from '@/lib/api/types';
import { eventThemeStyle } from '@/lib/eventTheme';
import { defaultFeedLayout, type FeedLayoutView, newFeedBlock } from '@/lib/feedLayout';
import { feedPageTheme } from '@/lib/feedPageTheme';
import { stillSection } from '@/lib/feedSectionPreview';
import { planFeedThemeSwitch } from '@/lib/feedThemes';
import type { InvitationDocument } from '@/lib/invitation/document';
import { isEmptyForGuests } from '@/lib/invitation/gallery';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext, type MediaResolver, type RenderContext } from '@/lib/invitation/render';
import { type InvitationSection, isFeedSectionType, type SectionType } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { type InvitationThemePublicDto, readThemePreview } from '@/lib/invitation/themePreview';
import { themeImageIds } from '@/lib/invitation/themeSwitch';
import { type InvitationFontDto, uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

// The Overview banner's picture (KAN-245). Kept apart from lib/feedEditBanner.ts so the Overview, which only
// needs the banner's rule, never loads the renderer; only the lazy picture imports this.

export type FeedEditBannerLook =
    | {
          kind: 'invitation';
          document: InvitationDocument;
          theme: ThemeDesign;
          media: MediaResolver;
          cover: InvitationSection;
          // The stand-in theme's own sections, for the picture's edit mode when the layout has none of its own yet.
          samples?: InvitationSection[];
      }
    | { kind: 'wall' };

const WALL_LOOK: FeedEditBannerLook = { kind: 'wall' };

// The look the banner's picture draws in: the layout's own Save my date theme, or, on the wall theme, the stand-in
// theme (`fallback`, the catalogue's first for the event type). Without one (an event type with no Save my date
// themes, or one that doesn't load or read), the event's wall look.
export function feedEditBannerLook(layout: FeedLayoutView, fallback: InvitationThemePublicDto | undefined): FeedEditBannerLook {
    const withCover = (document: InvitationDocument, theme: ThemeDesign, media: MediaResolver, samples?: InvitationSection[]): FeedEditBannerLook => {
        const cover = document.sections.find((section) => section.type === 'feedCover');
        return cover ? { kind: 'invitation', document, theme, media, cover, samples } : WALL_LOOK;
    };
    if (layout.themeSlug) return withCover(layout.document, layout.theme, layout.media);
    if (!fallback) return WALL_LOOK;
    try {
        const preview = readThemePreview(fallback);
        const document = planFeedThemeSwitch(defaultFeedLayout(), { ...preview, imageIds: themeImageIds(fallback.assetUrls) }, new Set());
        return withCover(document, preview.theme, preview.media, preview.document.sections);
    } catch {
        return WALL_LOOK;
    }
}

// The event theme scope the feed page draws around its blocks (EventThemeScope with the feed's override).
export type FeedEditBannerScope = { style: CSSProperties | undefined; headingFont: EventThemeFontDto | null };

export type FeedEditBannerPicture = { event: EventDetailResponseDto; scope: FeedEditBannerScope } & (
    | { kind: 'wall'; block: FeedEditBannerBlock }
    | {
          kind: 'invitation';
          ctx: RenderContext;
          // The one section the picture draws in edit mode.
          block: FeedEditBannerBlock;
          lang: string;
          fontFaces: string;
      }
);

export type FeedEditBannerBlock = { section: InvitationSection; index: number };

// Sections that read as text at a small size: no full-page art, photos or empty spacers.
const BLOCK_TYPES: ReadonlySet<SectionType> = new Set([
    'invitation',
    'coupleNames',
    'date',
    'countdown',
    'dressCode',
    'program',
    'programIcons',
    'locations',
    'parents',
    'parentsSimple',
    'godparents',
    'weddingSponsors',
    'weddingSponsorsSimple',
    'baby',
    'accommodation',
    'gift',
    'rsvp',
    'faq',
    'contact',
]);

// One Save my date section that guests would see, still: the layout's own, else the stand-in theme's samples, else
// the feed's own Description block.
export function feedEditBannerBlock(sections: InvitationSection[], samples: InvitationSection[], ctx: RenderContext): FeedEditBannerBlock {
    const pick = (from: InvitationSection[]) =>
        from.filter(
            (section) => section.visible && !isFeedSectionType(section.type) && BLOCK_TYPES.has(section.type) && !isEmptyForGuests(section, ctx),
        );
    const section = pick(sections)[0] ?? pick(samples)[0];
    // Its place sets its background art: the first section after the cover.
    return section ? { section: stillSection(section), index: 1 } : WALL_BLOCK;
}

// Without a Save my date theme: the feed's own Description block, drawn by its name.
const WALL_BLOCK: FeedEditBannerBlock = { section: newFeedBlock('feedDescription'), index: 0 };

type FeedEditBannerPictureInput = {
    event: EventDetailResponseDto;
    // The saved layout's document: its background colour is the wall look's.
    layoutDocument: InvitationDocument;
    fonts: InvitationFontDto[];
    locale: string;
};

// The look as the picture draws it, the way the feed does: the event's wall theme with the drawn document's
// background colour around the section, and in a Save my date theme the section still, with no text animation.
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
    if (look.kind === 'wall') return { kind: 'wall', event: themed, scope, block: WALL_BLOCK };

    const ctx: RenderContext = {
        ...buildRenderContext(look.document, { ...look.theme, textAnimation: 'none' }, look.media),
        labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'],
        // The section stands alone, so no neighbour's transition reaches it.
        transitionAdjacent: new Set(),
    };
    return {
        kind: 'invitation',
        event: themed,
        scope,
        ctx,
        block: feedEditBannerBlock(look.document.sections, look.samples ?? [], ctx),
        lang: locale,
        fontFaces: uploadedFontFaceCss(fonts, [look.document, look.theme]),
    };
}

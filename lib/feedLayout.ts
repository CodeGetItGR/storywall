import type { EventThemeDto, FeedLayoutDto } from '@/lib/api/types';
import { themeFontFamily } from '@/lib/eventTheme';
import { INVITATION_SCHEMA_VERSION, type InvitationDocument, upgradeInvitationDocument } from '@/lib/invitation/document';
import type { PhotoTone } from '@/lib/invitation/photoContrast';
import type { MediaResolver } from '@/lib/invitation/render';
import {
    FEED_PROMPT_MAX_LENGTH,
    FEED_SECTION_TYPES,
    type FeedSectionType,
    type InvitationSection,
    isFeedModeSectionType,
    isFeedSectionType,
    isSaveMyDateSectionType,
    type SectionType,
} from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import { type ThemeDesign, themeDesignSchema } from '@/lib/invitation/theme';

// The customizable feed (KAN-242). The top of the feed is an invitation document: the feed's own
// blocks (cover, details, description, RSVP) and Save my date blocks, each with its style. Cover and details keep
// fixed places, and RSVP too without Save my date; the host's order places the rest.

// document.themeId for a layout on the event's own wall theme.
export const WALL_THEME_ID = 'wall';

// The Save my date blocks a feed may hold. They need the save_my_date module. The list's types (lib/feedAddList)
// and the older ones a saved layout may still hold (parents, program).
export const PAID_FEED_SECTION_TYPES = [
    'coupleNames',
    'coupleProfilesSimple',
    'coupleContact',
    'date',
    'countdown',
    'locations',
    'photo',
    'blank',
    'parents',
    'parentsSimple',
    'godparents',
    'weddingSponsors',
    'weddingSponsorsSimple',
    'dressCode',
    'faq',
    'gallery',
    'invitation',
    'coupleProfiles',
    'ourStoryProposal',
    'program',
    'accommodation',
    'gift',
    'contact',
    'baby',
    'parentsPhoto',
] as const satisfies readonly SectionType[];

// Shared with the server prefetch, so it lives here rather than in the 'use client' hook.
export const feedLayoutKeys = {
    detail: (eventId: string) => ['events', eventId, 'feed-layout'] as const,
};

// A feed block before the host styles it: no background, no effect, today's look.
export const PLAIN_FEED_STYLE: SectionStyle = {
    background: { kind: 'color', color: 'transparent' },
    hostBackgrounds: { enabled: true, allowed: ['top', 'content', 'extra'] },
    textContrast: 'auto',
};

export function isPlainFeedStyle(style: SectionStyle): boolean {
    return (
        style.background.kind === 'color' &&
        style.background.color === 'transparent' &&
        !style.effect &&
        !style.transition &&
        style.textContrast === 'auto'
    );
}

export function newFeedBlock(type: FeedSectionType): InvitationSection {
    return {
        id: `feed-${type}`,
        type,
        name: type,
        visible: true,
        locked: false,
        data: {},
        textStyles: {},
        elements: [],
        style: PLAIN_FEED_STYLE,
    } as InvitationSection;
}

// What an event with no saved layout draws: today's feed. Each block draws only when it has
// something to show (a description, an RSVP to ask for). promptText: the photo prompt a new event of
// some types starts with (hooks/useFeedStarterPrompt), shown in Feed mode until the host changes it.
export function defaultFeedLayout(promptText?: string): InvitationDocument {
    const sections = FEED_SECTION_TYPES.map(newFeedBlock);
    if (promptText) sections.push(starterPrompt(promptText));
    return { schemaVersion: INVITATION_SCHEMA_VERSION, themeId: WALL_THEME_ID, overrides: {}, sections };
}

// Built here rather than with lib/feedSections' createFeedModeSection, which imports this file.
function starterPrompt(text: string): InvitationSection {
    return {
        id: 'feed-feedPrompt',
        type: 'feedPrompt',
        name: 'feedPrompt',
        visible: true,
        locked: false,
        data: { text: text.slice(0, FEED_PROMPT_MAX_LENGTH) },
        textStyles: {},
        elements: [],
        style: PLAIN_FEED_STYLE,
    } as InvitationSection;
}

export type FeedFrame = {
    // Always drawn: the cover can't be hidden.
    cover: InvitationSection;
    // The host-ordered blocks between stories and the end: the description, the Save my date blocks, and RSVP on an
    // event with Save my date.
    middle: InvitationSection[];
    // RSVP's fixed place, last; null when it is one of the middle blocks.
    rsvp: InvitationSection | null;
    // Feed mode's sections, in the host's order: under the stories in Feed mode, above the posts on the one page.
    feed: InvitationSection[];
};

// rsvpMoves: the event has Save my date, so RSVP is one of the host's blocks (spec item 17).
export type FeedFrameOptions = { ended: boolean; rsvpMoves?: boolean };

// The layout split into the page's fixed places. After the event only the cover and Feed mode's sections stay.
// The details block isn't drawn: the date and place live in the header and the schedule. It stays in the
// layout, shown, because the public view shares the event's date, sessions and place while it is.
export function feedFrame(layout: InvitationDocument, { ended, rsvpMoves = false }: FeedFrameOptions): FeedFrame {
    const shown = (type: FeedSectionType) => layout.sections.find((section) => section.type === type && section.visible) ?? null;
    const isMiddle = (section: InvitationSection) =>
        section.type === 'feedDescription' ||
        (!isFeedSectionType(section.type) && !isFeedModeSectionType(section.type)) ||
        (rsvpMoves && section.type === 'feedRsvp');
    return {
        cover: layout.sections.find((section) => section.type === 'feedCover') ?? newFeedBlock('feedCover'),
        middle: ended ? [] : layout.sections.filter((section) => section.visible && isMiddle(section)),
        rsvp: ended || rsvpMoves ? null : shown('feedRsvp'),
        feed: layout.sections.filter((section) => section.visible && isFeedModeSectionType(section.type)),
    };
}

// What an event without Save my date shows of its layout: its Save my date sections, module blocks among them, stay
// saved but don't draw.
export function withoutSaveMyDateSections(layout: InvitationDocument): InvitationDocument {
    return { ...layout, sections: layout.sections.filter((section) => !isSaveMyDateSectionType(section.type) && section.type !== 'feedModule') };
}

// A feed block draws inside the invitation section shell (background, effect, transition) on a
// Save my date theme, or once the host styled it.
export function shellsFeedBlock(themeId: string, section: InvitationSection): boolean {
    return themeId !== WALL_THEME_ID || !isPlainFeedStyle(section.style);
}

// Whether the top of the feed needs the invitation root (theme fonts, colours, effects). The plain
// default layout doesn't, so it draws exactly today's markup.
export function usesInvitationLook(layout: InvitationDocument): boolean {
    return layout.sections.some(
        (section) => (!isFeedSectionType(section.type) && !isFeedModeSectionType(section.type)) || shellsFeedBlock(layout.themeId, section),
    );
}

const WALL_TEXT = '#2f2b2d';
const PLAIN_BACKGROUND = { mode: 'cover', stableRepeat: false } as const;

// The design Save my date blocks and styled feed blocks draw with on the wall theme: the event's
// colours and heading font, no artwork.
export function wallThemeDesign(theme: EventThemeDto | null): ThemeDesign {
    const titleFont = theme?.headingFont ? themeFontFamily(theme.headingFont) : 'var(--font-sans)';
    return {
        backgrounds: { top: PLAIN_BACKGROUND, content: PLAIN_BACKGROUND, extra: PLAIN_BACKGROUND },
        art: {},
        colors: { primary: theme?.titleColor ?? WALL_TEXT, secondary: theme?.backgroundColor ?? '#FFFFFF', text: WALL_TEXT },
        fonts: { title: titleFont, body: 'var(--font-sans)' },
        autoTextContrast: true,
        photoShape: 'rounded',
        textAnimation: 'none',
        elements: [],
        frames: [],
        transitions: [],
    };
}

export type FeedLayoutView = {
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    // How light the theme's page picture is; null on the wall theme, without a picture, or until measured.
    pageTone: PhotoTone | null;
    // The revision the next save names: 0 before the first save.
    revision: number;
    // null on the wall theme.
    themeSlug: string | null;
};

// The API answer as the feed draws it. Nothing saved, or a document it can't read, draws the
// default layout; a theme design it can't read draws the wall look. Never throws.
// promptText: see defaultFeedLayout; it only shows while nothing is saved.
export function readFeedLayout(dto: FeedLayoutDto | null, wallTheme: EventThemeDto | null, promptText?: string): FeedLayoutView {
    const urls = dto?.imageUrls ?? {};
    const media: MediaResolver = (mediaId) => urls[mediaId];
    const wall = wallThemeDesign(wallTheme);
    const revision = dto?.revision ?? 0;
    if (!dto) return { document: defaultFeedLayout(promptText), theme: wall, media, pageTone: null, revision, themeSlug: null };

    let document: InvitationDocument;
    try {
        document = upgradeInvitationDocument(dto.document);
    } catch {
        return { document: defaultFeedLayout(promptText), theme: wall, media, pageTone: null, revision, themeSlug: null };
    }
    if (document.themeId === WALL_THEME_ID) return { document, theme: wall, media, pageTone: null, revision, themeSlug: null };

    const design = themeDesignSchema.safeParse(dto.design);
    if (!design.success) return { document: { ...document, themeId: WALL_THEME_ID }, theme: wall, media, pageTone: null, revision, themeSlug: null };
    return { document, theme: design.data, media, pageTone: dto.pageTone ?? null, revision, themeSlug: dto.themeSlug };
}

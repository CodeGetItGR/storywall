import type { CSSProperties } from 'react';

import type { EventThemeFontDto } from '@/lib/api/types';
import { eventThemeStyle, isHexColor, themeFontScopeProps } from '@/lib/eventTheme';
import { defaultFeedLayout, PLAIN_FEED_STYLE, WALL_THEME_ID } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import { type FeedSectionType, type InvitationSection, isFeedSectionType, type SectionType } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { planThemeSwitch, type ThemeSwitchTarget } from '@/lib/invitation/themeSwitch';

// The Theme page lists wall presets and Save my date themes in one radio group (KAN-244). A Save my
// date card's value carries its slug behind this mark; presets keep their ids, "No theme" is null.
const INVITATION_CHOICE = 'invitation:';

export function invitationThemeChoice(slug: string): string {
    return `${INVITATION_CHOICE}${slug}`;
}

// The Save my date theme a card names, or null for a wall preset or "No theme".
export function readThemeChoice(choice: string | null): string | null {
    return choice?.startsWith(INVITATION_CHOICE) ? choice.slice(INVITATION_CHOICE.length) : null;
}

// On a Save my date theme each feed block borrows the look of the theme's section of the first of
// these kinds it has.
export const FEED_BLOCK_LOOKS: Record<FeedSectionType, readonly SectionType[]> = {
    feedCover: ['top'],
    feedDetails: ['date', 'countdown'],
    feedDescription: ['invitation'],
    feedRsvp: ['rsvp'],
};

// The background of a block that sits on the page: the theme's, as the page draws it ("auto").
const PAGE_BACKGROUND: SectionStyle['background'] = { kind: 'theme', slot: 'auto' };

// A feed block on a theme with no matching section: the theme's background, nothing else.
export const FEED_BLOCK_FALLBACK_STYLE: SectionStyle = { ...PLAIN_FEED_STYLE, background: PAGE_BACKGROUND };

function borrowedStyle(type: FeedSectionType, themeDocument: InvitationDocument): SectionStyle {
    for (const kind of FEED_BLOCK_LOOKS[type]) {
        const match = themeDocument.sections.find((section) => section.type === kind);
        if (match) return match.style;
    }
    return FEED_BLOCK_FALLBACK_STYLE;
}

function withStyle(section: InvitationSection, style: SectionStyle): InvitationSection {
    return { ...section, style } as InvitationSection;
}

// The layout on a Save my date theme. The theme's own invitation has no feed blocks, so they are
// added to it with their borrowed looks; then the editor's switch restyles every block the host has,
// and hides the Save my date blocks the theme has no kind for.
// On the feed the theme's background covers the whole page, so every block then sits on it
// ("auto"): the theme's own sections pick top or content images, which would draw seams between
// blocks. A block shows its own picture again only once the host picks one in its settings.
export function planFeedThemeSwitch(current: InvitationDocument, target: ThemeSwitchTarget, oldThemeImageIds: ReadonlySet<string>): InvitationDocument {
    const feedBlocks = defaultFeedLayout().sections.map((section) => withStyle(section, borrowedStyle(section.type as FeedSectionType, target.document)));
    const document = { ...target.document, sections: [...target.document.sections, ...feedBlocks] };
    const switched = planThemeSwitch(current, { ...target, document }, oldThemeImageIds).document;
    return { ...switched, sections: switched.sections.map((section) => withStyle(section, { ...section.style, background: PAGE_BACKGROUND })) };
}

// The layout back on the event's wall theme: feed blocks in the plain style, Save my date blocks in a
// new block's look, without the old theme's images, frames and transitions.
export function planFeedWallSwitch(current: InvitationDocument, wall: ThemeDesign, eventType: string, oldThemeImageIds: ReadonlySet<string>): InvitationDocument {
    const sections = current.sections.flatMap((section) => {
        if (isFeedSectionType(section.type)) return [withStyle(section, PLAIN_FEED_STYLE)];
        if (section.type === 'footer') return [];
        return [createSection(section.type as NewSectionType, eventType)];
    });
    const template: InvitationDocument = { ...current, themeId: WALL_THEME_ID, overrides: {}, sections };
    return planThemeSwitch(current, { document: template, theme: wall, imageIds: new Set() }, oldThemeImageIds).document;
}

type ThemeCardTitle = {
    backgroundColor: string | null;
    titleColor: string | null;
    headingFont: EventThemeFontDto | null;
    // A Save my date theme's title font, as its design names it.
    titleFontFamily: string | null;
};

// How a theme card draws its title. A wall card: the preset's look, only on a usable background (no
// theme at all otherwise, EventThemeScope's rule). A Save my date card: its theme's title font and colour.
export function themeCardTitleLook({ backgroundColor, titleColor, headingFont, titleFontFamily }: ThemeCardTitle) {
    const themeStyle = eventThemeStyle(backgroundColor, { titleColor, headingFont });
    const colour = titleColor !== null && isHexColor(titleColor) ? titleColor : null;
    if (!titleFontFamily) {
        return { scopeProps: themeFontScopeProps(themeStyle ? headingFont : null), style: themeStyle, hasTitleColor: themeStyle !== undefined && colour !== null };
    }
    const style = { ...themeStyle, '--event-heading-font': titleFontFamily, ...(colour ? { '--event-title': colour } : {}) } as CSSProperties;
    return { scopeProps: { 'data-theme-font': '' as const }, style, hasTitleColor: colour !== null };
}

import { describe, expect, it } from 'vitest';

import { defaultFeedLayout, PLAIN_FEED_STYLE, WALL_THEME_ID, wallThemeDesign } from '@/lib/feedLayout';
import {
    FEED_BLOCK_FALLBACK_STYLE,
    invitationThemeChoice,
    planFeedThemeSwitch,
    planFeedWallSwitch,
    readThemeChoice,
    themeCardTitleLook,
} from '@/lib/feedThemes';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import { SAMPLE_THEME } from '@/lib/invitation/samples';
import { FEED_SECTION_TYPES, type InvitationSection } from '@/lib/invitation/sections';

function styled(type: NewSectionType, color: string): InvitationSection {
    return { ...createSection(type, 'WEDDING'), style: { ...FEED_BLOCK_FALLBACK_STYLE, background: { kind: 'color', color } } } as InvitationSection;
}

function themeDocument(sections: InvitationSection[]): InvitationDocument {
    return { ...defaultFeedLayout(), themeId: 'rose-garden', sections };
}

const target = (sections: InvitationSection[]) => ({ document: themeDocument(sections), theme: SAMPLE_THEME, imageIds: new Set<string>() });
const byType = (document: InvitationDocument, type: string) => document.sections.find((section) => section.type === type)!;

describe('theme choices', () => {
    it('marks a Save my date card apart from wall presets', () => {
        expect(readThemeChoice(invitationThemeChoice('rose-garden'))).toBe('rose-garden');
        expect(readThemeChoice('preset-1')).toBeNull();
        expect(readThemeChoice(null)).toBeNull();
    });
});

describe('planFeedThemeSwitch', () => {
    it("gives each feed block the look of the theme's matching section", () => {
        const next = planFeedThemeSwitch(
            defaultFeedLayout(),
            target([styled('top', '#111111'), styled('date', '#222222'), styled('invitation', '#333333'), styled('rsvp', '#444444')]),
            new Set(),
        );
        expect(next.themeId).toBe('rose-garden');
        expect(byType(next, 'feedCover').style.background).toEqual({ kind: 'color', color: '#111111' });
        expect(byType(next, 'feedDetails').style.background).toEqual({ kind: 'color', color: '#222222' });
        expect(byType(next, 'feedDescription').style.background).toEqual({ kind: 'color', color: '#333333' });
        expect(byType(next, 'feedRsvp').style.background).toEqual({ kind: 'color', color: '#444444' });
    });

    it('takes the countdown for details when the theme has no date', () => {
        const next = planFeedThemeSwitch(defaultFeedLayout(), target([styled('countdown', '#555555')]), new Set());
        expect(byType(next, 'feedDetails').style.background).toEqual({ kind: 'color', color: '#555555' });
    });

    it("gives a block the theme's background when the theme has no match", () => {
        const next = planFeedThemeSwitch(defaultFeedLayout(), target([styled('top', '#111111')]), new Set());
        expect(byType(next, 'feedRsvp').style).toEqual(FEED_BLOCK_FALLBACK_STYLE);
    });

    it('keeps the host order', () => {
        const current = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections].reverse() };
        const next = planFeedThemeSwitch(current, target([]), new Set());
        expect(next.sections.map((section) => section.type)).toEqual(['feedRsvp', 'feedDescription', 'feedDetails', 'feedCover']);
    });
});

describe('planFeedWallSwitch', () => {
    it('puts the feed blocks back to the plain style on the wall theme', () => {
        const onTheme = planFeedThemeSwitch(defaultFeedLayout(), target([styled('top', '#111111')]), new Set());
        const next = planFeedWallSwitch(onTheme, wallThemeDesign(null), 'WEDDING', new Set());
        expect(next.themeId).toBe(WALL_THEME_ID);
        for (const type of FEED_SECTION_TYPES) expect(byType(next, type).style).toEqual(PLAIN_FEED_STYLE);
    });

    it("keeps a Save my date block, shown, in a new block's look", () => {
        const dressCode = styled('dressCode', '#666666');
        const current = themeDocument([...defaultFeedLayout().sections, dressCode]);
        const next = planFeedWallSwitch(current, wallThemeDesign(null), 'WEDDING', new Set());
        const kept = byType(next, 'dressCode');
        expect(kept.id).toBe(dressCode.id);
        expect(kept.visible).toBe(true);
        expect(kept.style).toEqual(createSection('dressCode', 'WEDDING').style);
    });
});

describe('themeCardTitleLook', () => {
    it("keeps a wall card's look", () => {
        const look = themeCardTitleLook({ backgroundColor: '#EEF1E4', titleColor: '#4D5A2C', headingFont: null, titleFontFamily: null });
        expect(look.hasTitleColor).toBe(true);
        expect(look.scopeProps).toEqual({});
    });

    it("draws a Save my date card's title in the theme's font and colour", () => {
        const look = themeCardTitleLook({ backgroundColor: null, titleColor: '#9C4A5A', headingFont: null, titleFontFamily: '"Playfair Display", serif' });
        expect(look.scopeProps).toEqual({ 'data-theme-font': '' });
        expect(look.style).toMatchObject({ '--event-heading-font': '"Playfair Display", serif', '--event-title': '#9C4A5A' });
        expect(look.hasTitleColor).toBe(true);
    });

    it('has no colour without a background or a theme font', () => {
        expect(themeCardTitleLook({ backgroundColor: null, titleColor: '#9C4A5A', headingFont: null, titleFontFamily: null }).hasTitleColor).toBe(false);
    });
});

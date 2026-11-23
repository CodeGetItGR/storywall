import { describe, expect, it } from 'vitest';

import type { FeedLayoutDto } from '@/lib/api/types';
import { FEED_ADD_TYPES } from '@/lib/feedAddList';
import {
    defaultFeedLayout,
    feedFrame,
    PAID_FEED_SECTION_TYPES,
    readFeedLayout,
    shellsFeedBlock,
    usesInvitationLook,
    WALL_THEME_ID,
    wallThemeDesign,
} from '@/lib/feedLayout';
import { invitationDocumentSchema } from '@/lib/invitation/document';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const dressCode = SAMPLE_SECTIONS.dressCode as InvitationSection;
const faq = SAMPLE_SECTIONS.faq as InvitationSection;

function layoutWith(...extra: InvitationSection[]) {
    const base = defaultFeedLayout();
    return { ...base, sections: [...base.sections, ...extra] };
}

describe('defaultFeedLayout', () => {
    it('is a valid document on the wall theme with the four feed blocks in order', () => {
        const layout = defaultFeedLayout();
        expect(invitationDocumentSchema.safeParse(layout).success).toBe(true);
        expect(layout.themeId).toBe(WALL_THEME_ID);
        expect(layout.sections.map((section) => section.type)).toEqual(['feedCover', 'feedDetails', 'feedDescription', 'feedRsvp']);
    });
});

describe('feedFrame', () => {
    it('puts cover and RSVP in their places whatever the order, and draws no details block', () => {
        const base = defaultFeedLayout();
        const [cover, details, description, rsvp] = base.sections;
        const frame = feedFrame({ ...base, sections: [rsvp, dressCode, details, description, cover] }, { ended: false });
        expect(frame.cover.type).toBe('feedCover');
        expect(frame.rsvp?.type).toBe('feedRsvp');
        expect(frame.middle.some((section) => section.type === 'feedDetails')).toBe(false);
        expect(frame.middle.map((section) => section.type)).toEqual(['dressCode', 'feedDescription']);
    });

    it('leaves out hidden blocks but always keeps the cover', () => {
        const base = defaultFeedLayout();
        const sections = base.sections.map((section) => ({ ...section, visible: false }));
        const frame = feedFrame({ ...base, sections: [...sections, { ...faq, visible: false }] }, { ended: false });
        expect(frame.cover.type).toBe('feedCover');
        expect(frame.rsvp).toBeNull();
        expect(frame.middle).toEqual([]);
    });

    it('keeps only the cover once the event has ended', () => {
        const frame = feedFrame(layoutWith(dressCode), { ended: true });
        expect(frame.middle).toEqual([]);
        expect(frame.rsvp).toBeNull();
    });
});

describe('usesInvitationLook and shellsFeedBlock', () => {
    it("draws today's feed for the plain default layout", () => {
        const layout = defaultFeedLayout();
        expect(usesInvitationLook(layout)).toBe(false);
        expect(layout.sections.some((section) => shellsFeedBlock(layout.themeId, section))).toBe(false);
    });

    it('uses the invitation look for a Save my date block, a styled block or a Save my date theme', () => {
        expect(usesInvitationLook(layoutWith(dressCode))).toBe(true);
        const styled = defaultFeedLayout();
        styled.sections[1] = { ...styled.sections[1], style: { ...styled.sections[1].style, background: { kind: 'color', color: '#ffeeee' } } };
        expect(usesInvitationLook(styled)).toBe(true);
        expect(shellsFeedBlock(styled.themeId, styled.sections[1])).toBe(true);
        const themed = { ...defaultFeedLayout(), themeId: 'olive-garden' };
        expect(usesInvitationLook(themed)).toBe(true);
        expect(shellsFeedBlock(themed.themeId, themed.sections[0])).toBe(true);
    });
});

describe('wallThemeDesign', () => {
    it("takes the event theme's colours", () => {
        const design = wallThemeDesign({ presetKey: 'p', backgroundColor: '#AABBCC', illustrationUrl: '', titleColor: '#112233', headingFont: null });
        expect(design.colors).toMatchObject({ primary: '#112233', secondary: '#AABBCC' });
        expect(design.textAnimation).toBe('none');
        expect(design.elements).toEqual([]);
    });

    it('falls back to the app look without a theme', () => {
        expect(wallThemeDesign(null).colors.secondary).toBe('#FFFFFF');
    });
});

describe('readFeedLayout', () => {
    const dto = (over: Partial<FeedLayoutDto>): FeedLayoutDto => ({
        themeSlug: null,
        revision: 4,
        document: layoutWith(dressCode),
        design: null,
        imageUrls: { 'm-1': 'https://img/1.webp' },
        updatedAt: '2026-11-21T10:00:00Z',
        ...over,
    });

    it('draws the default layout when nothing is saved', () => {
        const view = readFeedLayout(null, null);
        expect(view.document).toEqual(defaultFeedLayout());
        expect(view.revision).toBe(0);
    });

    it('reads a wall-theme layout with its images', () => {
        const view = readFeedLayout(dto({}), null);
        expect(view.document.sections.map((section) => section.type)).toContain('dressCode');
        expect(view.revision).toBe(4);
        expect(view.media('m-1')).toBe('https://img/1.webp');
        expect(view.themeSlug).toBeNull();
    });

    it('reads a Save my date theme', () => {
        const document = { ...layoutWith(dressCode), themeId: 'olive-garden' };
        const view = readFeedLayout(dto({ themeSlug: 'olive-garden', document, design: SAMPLE_THEME }), null);
        expect(view.theme).toEqual(SAMPLE_THEME);
        expect(view.themeSlug).toBe('olive-garden');
    });

    it('falls back to the default layout for a document it cannot read, keeping the revision', () => {
        const view = readFeedLayout(dto({ document: { schemaVersion: 1, nonsense: true } }), null);
        expect(view.document).toEqual(defaultFeedLayout());
        expect(view.revision).toBe(4);
    });

    it('falls back to the wall look for a theme design it cannot read', () => {
        const document = { ...layoutWith(dressCode), themeId: 'olive-garden' };
        const view = readFeedLayout(dto({ themeSlug: 'olive-garden', document, design: { broken: true } }), null);
        expect(view.document.themeId).toBe(WALL_THEME_ID);
        expect(view.theme).toEqual(wallThemeDesign(null));
    });
});

describe('feedFrame with a movable RSVP', () => {
    const dress = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
    const [cover, details, description, rsvp] = defaultFeedLayout().sections;
    const layout = { ...defaultFeedLayout(), sections: [cover, details, rsvp, description, dress] };

    it('keeps RSVP in its fixed place without Save my date', () => {
        const frame = feedFrame(layout, { ended: false, rsvpMoves: false });
        expect(frame.middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'dress']);
        expect(frame.rsvp?.id).toBe('feed-feedRsvp');
    });

    it('draws RSVP where the host put it with Save my date', () => {
        const frame = feedFrame(layout, { ended: false, rsvpMoves: true });
        expect(frame.middle.map((section) => section.id)).toEqual(['feed-feedRsvp', 'feed-feedDescription', 'dress']);
        expect(frame.rsvp).toBeNull();
    });

    it('leaves a hidden RSVP out either way', () => {
        const hidden = { ...layout, sections: layout.sections.map((section) => (section.type === 'feedRsvp' ? { ...section, visible: false } : section)) };
        expect(feedFrame(hidden, { ended: false, rsvpMoves: true }).middle.some((section) => section.type === 'feedRsvp')).toBe(false);
    });
});

describe('the paid feed types', () => {
    it("hold every type the Add section lists offer", () => {
        expect(FEED_ADD_TYPES.filter((type) => !(PAID_FEED_SECTION_TYPES as readonly string[]).includes(type))).toEqual([]);
    });
});

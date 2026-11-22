import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { type FeedEditBannerLook, feedEditBannerLook, feedEditBannerPicture } from '@/lib/feedEditBannerLook';
import { defaultFeedLayout, readFeedLayout } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { InvitationThemePublicDto } from '@/lib/invitation/themePreview';

describe('feedEditBannerLook', () => {
    const rose = {
        slug: 'rose',
        name: 'Rose',
        eventType: 'WEDDING',
        design: SAMPLE_THEME,
        document: SAMPLE_DOCUMENT,
        assetUrls: {},
    } as unknown as InvitationThemePublicDto;

    it("draws the layout's own Save my date theme", () => {
        const layout = { ...readFeedLayout(null, null), themeSlug: 'own', theme: SAMPLE_THEME };
        expect(feedEditBannerLook(layout, rose)).toMatchObject({ kind: 'invitation', theme: SAMPLE_THEME });
    });

    it('puts a wall layout on the fallback theme', () => {
        const look = feedEditBannerLook(readFeedLayout(null, null), rose);
        expect(look.kind).toBe('invitation');
        if (look.kind !== 'invitation') return;
        expect(look.document.themeId).toBe(SAMPLE_DOCUMENT.themeId);
        expect(look.cover.type).toBe('feedCover');
    });

    it("draws the event's wall look when the event type has no Save my date theme", () => {
        expect(feedEditBannerLook(readFeedLayout(null, null), undefined)).toEqual({ kind: 'wall' });
    });
});

describe('feedEditBannerPicture', () => {
    const wallTheme = { presetKey: 'blush', backgroundColor: '#F4E1E6', illustrationUrl: '', titleColor: null, headingFont: null };
    const event = { id: 'e-1', eventType: 'WEDDING', title: 'Anna & Nikos', theme: wallTheme } as unknown as EventDetailResponseDto;
    const plain = defaultFeedLayout();
    const withBackground = (document: InvitationDocument): InvitationDocument => ({
        ...document,
        overrides: { ...document.overrides, backgroundColor: '#FFF4D6' },
    });
    const input = { event, layoutDocument: plain, fonts: [], locale: 'en' };

    it("puts the wall look in the event's theme scope", () => {
        const picture = feedEditBannerPicture({ kind: 'wall' }, input);
        expect(picture.kind).toBe('wall');
        expect(picture.event).toBe(event);
        expect(picture.scope.style).toMatchObject({ '--event-bg': '#F4E1E6' });
    });

    it("gives the scope and the cover the layout's background colour", () => {
        const picture = feedEditBannerPicture({ kind: 'wall' }, { ...input, layoutDocument: withBackground(plain) });
        expect(picture.scope.style).toMatchObject({ '--event-bg': '#FFF4D6' });
        expect(picture.event.theme?.backgroundColor).toBe('#FFF4D6');
    });

    it('draws a Save my date cover still, in the theme scope', () => {
        const cover = { ...plain.sections.find((section) => section.type === 'feedCover')! } as InvitationSection;
        const moving = {
            ...cover,
            style: { ...cover.style, effect: { type: 'drift', speed: 'slow', intensity: 'subtle' }, transition: { assetId: 'a-1', edge: 'bottom' } },
        } as InvitationSection;
        const document = { ...SAMPLE_DOCUMENT, sections: [...SAMPLE_DOCUMENT.sections, moving] };
        const look: FeedEditBannerLook = { kind: 'invitation', document, theme: SAMPLE_THEME, media: () => undefined, cover: moving };
        const picture = feedEditBannerPicture(look, input);
        expect(picture.kind).toBe('invitation');
        if (picture.kind !== 'invitation') return;
        expect(picture.cover.style.effect).toBeUndefined();
        expect(picture.cover.style.transition).toBeUndefined();
        expect(picture.index).toBe(document.sections.length - 1);
        expect(picture.ctx.theme.textAnimation).toBe('none');
        expect(picture.ctx.transitionAdjacent.size).toBe(0);
        expect(picture.scope.style).toMatchObject({ '--event-bg': '#F4E1E6' });
    });
});

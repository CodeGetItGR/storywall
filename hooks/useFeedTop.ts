'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventEnded, isModuleAvailable } from '@/lib/eventLifecycle';
import { feedEditFrame } from '@/lib/feedEditing';
import { type FeedFrame, feedFrame, usesInvitationLook, withoutSaveMyDateSections } from '@/lib/feedLayout';
import { moduleOfBlock } from '@/lib/feedModuleBlocks';
import { type FeedPageBackdrop, feedPageBackdrop } from '@/lib/feedPageBackdrop';
import type { InvitationDocument } from '@/lib/invitation/document';
import { isEmptyForGuests } from '@/lib/invitation/gallery';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext, type MediaResolver, type RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';
import { SAVE_MY_DATE_MODULE_KEY } from '@/lib/saveMyDateRelease';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

export type FeedTopView = {
    // The invitation root is on (a Save my date theme, block or style).
    look: boolean;
    lang: string;
    fontFaces: string;
    ctx: RenderContext;
    themeId: string;
    // Every section, for each one's position (the shell's background alternates by it).
    sections: InvitationSection[];
    // The middle holds only blocks that draw something.
    frame: FeedFrame;
    // Something shows between the cover and RSVP.
    drawsMiddle: boolean;
    // With Save my date, RSVP is one of the host's blocks (spec item 17).
    rsvpMoves: boolean;
    // The feed's own background colour (overrides.backgroundColor), as picked; null without one.
    pageBackground: string | null;
    // A Save my date theme's background, drawn behind the whole page (null on the wall theme, or under the
    // host's own background colour).
    backdrop: FeedPageBackdrop | null;
};

// What edit mode draws: the document being edited and the theme it shows (a held pick included).
export type FeedTopEditing = { document: InvitationDocument; theme: ThemeDesign; media: MediaResolver };

// Everything the top of the feed draws, from the saved layout or the default one. While editing,
// it draws the edit session: every block, hidden ones too, in the held theme. Without Save my date its sections
// stay saved but don't draw, in edit mode too, and edit mode changes only the feed sections: the rest draws as on the feed.
export function useFeedTop(event: EventDetailResponseDto, editing?: FeedTopEditing): FeedTopView {
    const enabled = useFeedEditorEnabled();
    const locale = useLocale();
    const layout = useFeedLayout(event, { enabled });
    const saveMyDate = isModuleAvailable(event.modules, SAVE_MY_DATE_MODULE_KEY);
    const isEditing = editing !== undefined;
    const whole = editing?.document ?? layout.document;
    const document = useMemo(() => (saveMyDate ? whole : withoutSaveMyDateSections(whole)), [saveMyDate, whole]);
    const theme = editing?.theme ?? layout.theme;
    const media = editing?.media ?? layout.media;
    const look = usesInvitationLook(document);
    // The font files list is public (the published invitation reads it too).
    const fonts = useInvitationFonts(enabled && look);
    const ended = isEventEnded(event);
    // With Save my date, RSVP is one of the host's blocks (spec item 17). Read as useFeedMode does, flag included.
    const rsvpMoves = enabled && saveMyDate;

    const backdrop = useMemo(() => feedPageBackdrop(document, theme, media), [document, theme, media]);

    const ctx = useMemo(
        () => ({
            ...buildRenderContext(document, theme, media),
            labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'],
            pageBackdrop: backdrop !== null,
            centerText: true,
        }),
        [document, theme, media, locale, backdrop],
    );

    const frame = useMemo(() => {
        const edited = isEditing ? feedEditFrame(document, { rsvpMoves }) : null;
        if (edited && saveMyDate) return edited;
        const split = feedFrame(document, { ended, rsvpMoves });
        const draws = (section: InvitationSection) => {
            if (section.type === 'feedDescription') return Boolean(event.description);
            if (section.type === 'feedRsvp') return true;
            // A module block draws only while the event has the module.
            const key = moduleOfBlock(section);
            if (key) return isModuleAvailable(event.modules, key);
            return !isEmptyForGuests(section, ctx);
        };
        return { ...split, middle: split.middle.filter(draws), feed: edited?.feed ?? split.feed };
    }, [isEditing, saveMyDate, document, ended, rsvpMoves, event.description, event.modules, ctx]);

    return {
        look,
        lang: locale,
        fontFaces: look ? uploadedFontFaceCss(fonts.data ?? [], [document, theme]) : '',
        ctx,
        themeId: document.themeId,
        sections: document.sections,
        frame,
        drawsMiddle: frame.middle.length > 0,
        rsvpMoves,
        pageBackground: document.overrides.backgroundColor ?? null,
        backdrop,
    };
}

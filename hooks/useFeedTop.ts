'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import { useInvitationFold } from '@/hooks/useInvitationFold';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventEnded } from '@/lib/eventLifecycle';
import { feedEditFrame } from '@/lib/feedEditing';
import { type FeedFrame, feedFrame, foldsMiddle, usesInvitationLook } from '@/lib/feedLayout';
import { type FeedPageBackdrop, feedPageBackdrop } from '@/lib/feedPageBackdrop';
import type { InvitationDocument } from '@/lib/invitation/document';
import { isEmptyForGuests } from '@/lib/invitation/gallery';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext, type MediaResolver, type RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';
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
    folds: boolean;
    open: boolean;
    toggle: () => void;
    // Something shows between stories and RSVP besides a closed Invitation row.
    drawsMiddle: boolean;
    // The feed's own background colour (overrides.backgroundColor), as picked; null without one.
    pageBackground: string | null;
    // A Save my date theme's background, drawn behind the whole page (null on the wall theme, or under the
    // host's own background colour).
    backdrop: FeedPageBackdrop | null;
};

// What edit mode draws: the document being edited and the theme it shows (a held pick included).
export type FeedTopEditing = { document: InvitationDocument; theme: ThemeDesign; media: MediaResolver };

// Everything the top of the feed draws, from the saved layout or the default one. While editing,
// it draws the edit session: every block, hidden ones too, never folded, in the held theme.
export function useFeedTop(event: EventDetailResponseDto, editing?: FeedTopEditing): FeedTopView {
    const enabled = useFeedEditorEnabled();
    const locale = useLocale();
    const layout = useFeedLayout(event, { enabled });
    const editingDocument = editing?.document;
    const document = editingDocument ?? layout.document;
    const theme = editing?.theme ?? layout.theme;
    const media = editing?.media ?? layout.media;
    const look = usesInvitationLook(document);
    // The font files list is public (the published invitation reads it too).
    const fonts = useInvitationFonts(enabled && look);
    const fold = useInvitationFold();
    const ended = isEventEnded(event);

    const backdrop = useMemo(() => feedPageBackdrop(document, theme, media), [document, theme, media]);

    const ctx = useMemo(
        () => ({
            ...buildRenderContext(document, theme, media),
            labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'],
            pageBackdrop: backdrop !== null,
        }),
        [document, theme, media, locale, backdrop],
    );

    const frame = useMemo(() => {
        if (editingDocument) return feedEditFrame(editingDocument);
        const split = feedFrame(document, { ended });
        const draws = (section: InvitationSection) =>
            section.type === 'feedDescription' ? Boolean(event.description) : !isEmptyForGuests(section, ctx);
        return { ...split, middle: split.middle.filter(draws) };
    }, [editingDocument, document, ended, event.description, ctx]);

    const folds = !editingDocument && foldsMiddle(frame.middle.length);

    return {
        look,
        lang: locale,
        fontFaces: look ? uploadedFontFaceCss(fonts.data ?? [], [document, theme]) : '',
        ctx,
        themeId: document.themeId,
        sections: document.sections,
        frame,
        folds,
        open: fold.open,
        toggle: fold.toggle,
        drawsMiddle: frame.middle.length > 0 && (!folds || fold.open),
        pageBackground: document.overrides.backgroundColor ?? null,
        backdrop,
    };
}

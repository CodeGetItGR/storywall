'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import { useInvitationFold } from '@/hooks/useInvitationFold';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventEnded } from '@/lib/eventLifecycle';
import { type FeedFrame, feedFrame, foldsMiddle, usesInvitationLook } from '@/lib/feedLayout';
import { isEmptyForGuests } from '@/lib/invitation/gallery';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext, type RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
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
};

// Everything the top of the feed draws, from the saved layout or the default one.
export function useFeedTop(event: EventDetailResponseDto): FeedTopView {
    const enabled = useFeedEditorEnabled();
    const locale = useLocale();
    const layout = useFeedLayout(event, { enabled });
    const look = usesInvitationLook(layout.document);
    // The font files list is public (the published invitation reads it too).
    const fonts = useInvitationFonts(enabled && look);
    const fold = useInvitationFold();
    const ended = isEventEnded(event);

    const ctx = useMemo(
        () => ({ ...buildRenderContext(layout.document, layout.theme, layout.media), labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'] }),
        [layout.document, layout.theme, layout.media, locale],
    );

    const frame = useMemo(() => {
        const split = feedFrame(layout.document, { ended });
        const draws = (section: InvitationSection) =>
            section.type === 'feedDescription' ? Boolean(event.description) : !isEmptyForGuests(section, ctx);
        return { ...split, middle: split.middle.filter(draws) };
    }, [layout.document, ended, event.description, ctx]);

    const folds = foldsMiddle(frame.middle.length);

    return {
        look,
        lang: locale,
        fontFaces: look ? uploadedFontFaceCss(fonts.data ?? [], [layout.document, layout.theme]) : '',
        ctx,
        themeId: layout.document.themeId,
        sections: layout.document.sections,
        frame,
        folds,
        open: fold.open,
        toggle: fold.toggle,
        drawsMiddle: frame.middle.length > 0 && (!folds || fold.open),
    };
}

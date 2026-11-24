'use client';

import { FeedThemeSheet } from '@/components/feed/edit/FeedThemeSheet';
import type { FeedEditSession } from '@/hooks/useFeedEditSession';
import { useFeedEditThemeGrid } from '@/hooks/useFeedEditThemeGrid';
import type { EventDetailResponseDto } from '@/lib/api/types';

type FeedEditThemeSheetProps = { event: EventDetailResponseDto; session: FeedEditSession; open: boolean; isDesktop: boolean; onClose: () => void };

// Edit mode's Theme sheet, with the themes the event can wear. Without Save my date it isn't drawn, so no theme loads.
export function FeedEditThemeSheet({ event, session, open, isDesktop, onClose }: FeedEditThemeSheetProps) {
    const grid = useFeedEditThemeGrid(event, session);

    return (
        <FeedThemeSheet
            open={open}
            isDesktop={isDesktop}
            options={grid.options}
            fontFaces={grid.fontFaces}
            hasInvitationThemes={grid.hasInvitationThemes}
            disabled={grid.disabled}
            solidDisabled={grid.solidDisabled}
            previewTitle={grid.previewTitle}
            solidColor={session.background}
            onSelect={grid.select}
            onSolidColor={grid.selectSolid}
            onClose={onClose}
        />
    );
}

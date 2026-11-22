'use client';

import { useCallback } from 'react';

import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import type { FeedEditSession } from '@/hooks/useFeedEditSession';
import { useInvitationThemeCards } from '@/hooks/useInvitationThemeCards';
import { useThemePicker } from '@/hooks/useThemePicker';
import { useWallThemeOptions } from '@/hooks/useWallThemeOptions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themePreviewTitle } from '@/lib/eventTheme';
import { presetAsEventTheme } from '@/lib/feedEditTheme';
import { invitationThemeChoice, readThemeChoice } from '@/lib/feedThemes';
import { isCatalogueEventType } from '@/lib/invitation/themeCatalogue';

type ThemeGridSession = Pick<FeedEditSession, 'themeSlug' | 'heldWall' | 'switching' | 'saving' | 'pickInvitation' | 'pickWall'>;

// Edit mode's theme cards: the wall themes, then the event type's Save my date themes, with the held pick
// marked. A pick goes to the session and is saved with the rest.
export function useFeedEditThemeGrid(event: EventDetailResponseDto, session: ThemeGridSession) {
    const picker = useThemePicker(event, true);
    const onWall = session.themeSlug === '';
    const wallCards = useWallThemeOptions(picker, { checkable: onWall });
    const themeCards = useInvitationThemeCards(event.eventType, { enabled: isCatalogueEventType(event.eventType) });
    const held = onWall ? session.heldWall : undefined;

    const wallOptions: ThemeRadioOption[] = picker.available
        ? wallCards.map((option) => (held ? { ...option, selected: option.presetId === held.presetId } : option))
        : [];
    const invitationOptions: ThemeRadioOption[] = themeCards.cards.map((card) => ({
        id: invitationThemeChoice(card.slug),
        presetId: invitationThemeChoice(card.slug),
        label: card.name,
        backgroundColor: card.cardColor,
        illustrationUrl: card.illustrationUrl,
        titleColor: card.titleColor,
        headingFont: null,
        titleFontFamily: card.titleFontFamily,
        selected: session.themeSlug === card.slug,
    }));

    const { presets, isApplied } = picker;
    const { pickInvitation, pickWall } = session;
    const select = useCallback(
        (choice: string | null) => {
            const slug = readThemeChoice(choice);
            if (slug !== null) {
                void pickInvitation(slug);
                return;
            }
            const preset = choice === null ? null : presets.find((item) => item.id === choice);
            // An applied theme that is no longer offered can't be picked again.
            if (preset === undefined) return;
            void pickWall(choice, preset ? presetAsEventTheme(preset) : null, isApplied(choice));
        },
        [isApplied, pickInvitation, pickWall, presets],
    );

    // Empty for an event with neither kind of theme: the sheet then holds just the Background row.
    const options = [...wallOptions, ...invitationOptions];
    return {
        options,
        fontFaces: themeCards.fontFaces,
        // The event's title, drawn in each card's font.
        previewTitle: themePreviewTitle(event.title),
        hasInvitationThemes: invitationOptions.length > 0,
        // The session ignores picks while one loads or Save is on its way; the cards say so by being disabled.
        disabled: session.switching || session.saving || picker.isLoading,
        select,
    };
}

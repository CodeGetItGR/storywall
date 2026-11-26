'use client';

import { useCallback, useMemo } from 'react';

import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import type { FeedEditSession } from '@/hooks/useFeedEditSession';
import { useInvitationThemeCards } from '@/hooks/useInvitationThemeCards';
import { useThemePicker } from '@/hooks/useThemePicker';
import { useNoThemeCard, useWallThemeOptions } from '@/hooks/useWallThemeOptions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isSameColor, WHITE } from '@/lib/colorCircles';
import { themePreviewTitle } from '@/lib/eventTheme';
import { presetAsEventTheme, type WallPick } from '@/lib/feedEditTheme';
import { invitationThemeChoice, readThemeChoice } from '@/lib/feedThemes';
import { isCatalogueEventType } from '@/lib/invitation/themeCatalogue';

type ThemeGridSession = Pick<
    FeedEditSession,
    'themeSlug' | 'heldWall' | 'background' | 'switching' | 'pickingSolid' | 'saving' | 'pickInvitation' | 'pickWall' | 'pickSolid'
>;

// Edit mode's theme cards: the wall themes, then the event type's Save my date themes, with the held pick
// marked. A pick goes to the session and is saved with the rest. An event that can't pick wall themes (no
// `theme` module) still gets "No theme", drawn in its current wall look: it takes the feed back to that look
// and leaves the event's theme as it is. While a solid colour shows on it, "No theme" isn't the one picked.
// White is "No theme" (owner 2026-11-24): its circle and the card are picked together. Where "No theme" keeps the
// event's own wall look, white is a solid colour like the others (owner 2026-11-25).
export function useFeedEditThemeGrid(event: EventDetailResponseDto, session: ThemeGridSession) {
    const picker = useThemePicker(event, true);
    const onWall = session.themeSlug === '';
    const wallCards = useWallThemeOptions(picker, { checkable: onWall });
    const themeCards = useInvitationThemeCards(event.eventType, { enabled: isCatalogueEventType(event.eventType) });
    const held = onWall ? session.heldWall : undefined;
    const ownLook = useNoThemeCard(event.theme, onWall);
    // "No theme" is the plain white page.
    const plainIsWhite = picker.available || event.theme === null;
    const isWhite = useCallback((color: string | undefined) => plainIsWhite && isSameColor(color, WHITE), [plainIsWhite]);
    const hasSolid = session.background !== undefined && !isWhite(session.background);

    const wallOptions: ThemeRadioOption[] = picker.available
        ? wallCards.map((option) => (held ? { ...option, selected: option.presetId === held.presetId } : option))
        : [ownLook];
    const plainFirst = wallOptions.map((option) => (option.presetId === null && hasSolid ? { ...option, selected: false } : option));
    const invitationOptions: ThemeRadioOption[] = themeCards.cards.map((card) => ({
        id: invitationThemeChoice(card.slug),
        presetId: invitationThemeChoice(card.slug),
        label: card.name,
        backgroundColor: card.cardColor,
        illustrationUrl: card.illustrationUrl,
        titleColor: card.titleColor,
        headingFont: null,
        titleFontFamily: card.titleFontFamily,
        neutralSwatch: true,
        selected: session.themeSlug === card.slug,
    }));

    const { available, presets, isApplied } = picker;
    const plainPicked = plainIsWhite && plainFirst.some((option) => option.presetId === null && option.selected);
    const { pickInvitation, pickWall, pickSolid, pickingSolid } = session;
    const ownTheme = event.theme;
    // "No theme": without wall themes it is the event's own wall look, already applied.
    const plain = useMemo<WallPick>(
        () => (available ? { presetId: null, theme: null, applied: isApplied(null) } : { presetId: null, theme: ownTheme, applied: true }),
        [available, isApplied, ownTheme],
    );
    const select = useCallback(
        (choice: string | null) => {
            const slug = readThemeChoice(choice);
            if (slug !== null) {
                void pickInvitation(slug);
                return;
            }
            if (choice === null) {
                void pickWall(plain);
                return;
            }
            // An applied theme that is no longer offered can't be picked again.
            const preset = available ? presets.find((item) => item.id === choice) : undefined;
            if (preset) void pickWall({ presetId: choice, theme: presetAsEventTheme(preset), applied: isApplied(choice) });
        },
        [available, isApplied, pickInvitation, pickWall, plain, presets],
    );
    // While the plain look loads for a colour being mixed, white counts like any colour: the last one mixed lands.
    const selectSolid = useCallback(
        (color: string) => {
            if (isWhite(color) && !pickingSolid) void pickWall(plain);
            else pickSolid(color, plain);
        },
        [isWhite, pickSolid, pickWall, pickingSolid, plain],
    );

    const options = [...plainFirst, ...invitationOptions];
    return {
        options,
        fontFaces: themeCards.fontFaces,
        // The event's title, drawn in each card's font.
        previewTitle: themePreviewTitle(event.title),
        hasInvitationThemes: invitationOptions.length > 0,
        // The circle picked: white with "No theme".
        solidColor: plainPicked ? WHITE : session.background,
        // The session ignores picks while one loads or Save is on its way; the cards say so by being disabled.
        disabled: session.switching || session.saving || picker.isLoading,
        // Mixing goes on while the plain look loads for it.
        solidDisabled: (session.switching && !session.pickingSolid) || session.saving || picker.isLoading,
        select,
        selectSolid,
    };
}

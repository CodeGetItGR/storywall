'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import { useFeedThemeSwitch } from '@/hooks/useFeedThemeSwitch';
import { useInvitationThemeCards } from '@/hooks/useInvitationThemeCards';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { useThemePicker } from '@/hooks/useThemePicker';
import { useWallThemeOptions } from '@/hooks/useWallThemeOptions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { invitationThemeChoice, readThemeChoice } from '@/lib/feedThemes';

// The Theme section with the feed editor on: the wall themes, then the event type's Save my date
// themes, in one grid. A Save my date theme dresses the feed (its layout); a wall theme dresses the
// event's pages, and picking one while the feed is on a Save my date theme moves the feed back first.
export function useThemeGrid(event: EventDetailResponseDto, canWrite: boolean, onOpenBilling: () => void) {
    const t = useTranslations('ManagePage.settings.theme');
    const picker = useThemePicker(event, canWrite);
    const layout = useFeedLayout(event, { enabled: picker.available });
    const onInvitationTheme = layout.themeSlug !== null;
    const wallOptions = useWallThemeOptions(picker, { checkable: !onInvitationTheme });
    const themeCards = useInvitationThemeCards(event.eventType, { enabled: picker.available });
    const feed = useFeedThemeSwitch(event, layout);
    // Only the main host can buy Save my date.
    const canBuy = usePlanUpgradeHref(event.id) !== null;
    const locked = !isModuleAvailable(event.modules, 'save_my_date');
    // The card being saved, across both saves of a move back to a wall theme; undefined when none.
    const [pending, setPending] = useState<string | null | undefined>(undefined);

    const invitationOptions: ThemeRadioOption[] = themeCards.cards.map((card) => ({
        id: invitationThemeChoice(card.slug),
        // A locked card the host can't buy can't be picked.
        presetId: locked && !canBuy ? undefined : invitationThemeChoice(card.slug),
        label: card.name,
        backgroundColor: card.cardColor,
        illustrationUrl: card.illustrationUrl,
        titleColor: card.titleColor,
        headingFont: null,
        titleFontFamily: card.titleFontFamily,
        neutralSwatch: true,
        locked,
        lockedLabel: locked ? t('locked') : undefined,
        selected: layout.themeSlug === card.slug,
    }));

    const { switchTo } = feed;
    const { select: selectWall, isApplied } = picker;
    const select = useCallback(
        async (choice: string | null) => {
            if (!canWrite || pending !== undefined) return;
            const slug = readThemeChoice(choice);
            if (slug !== null && locked) {
                onOpenBilling();
                return;
            }
            if (slug === null && !onInvitationTheme) {
                selectWall(choice);
                return;
            }
            setPending(choice);
            try {
                if (slug !== null) await switchTo(slug);
                else if ((await switchTo(null)) && !isApplied(choice)) selectWall(choice);
            } finally {
                setPending(undefined);
            }
        },
        [canWrite, isApplied, locked, onInvitationTheme, onOpenBilling, pending, selectWall, switchTo],
    );

    return {
        available: picker.available,
        isLoading: picker.isLoading || layout.isLoading,
        loadError: picker.loadError,
        options: [...wallOptions, ...invitationOptions],
        hasInvitationThemes: invitationOptions.length > 0,
        fontFaces: themeCards.fontFaces,
        disabled: picker.disabled || pending !== undefined,
        savingPresetId: pending !== undefined ? pending : picker.isSaving ? picker.savingPresetId : undefined,
        isSaving: pending !== undefined || picker.isSaving,
        isSaved: pending === undefined && (feed.isSaved || picker.isSaved),
        saveError: feed.error ?? picker.saveError,
        select,
    };
}

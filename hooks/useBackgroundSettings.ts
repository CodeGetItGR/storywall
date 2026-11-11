'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import {
    availableBackgroundSlots,
    hostBackgroundSlots,
    selectedBackground,
    setHostBackgroundAllowed,
    setHostBackgroundsEnabled,
    setThemeBackground,
    type ThemeBackgroundChoice,
    type ThemeBackgroundSlot,
} from '@/lib/invitation/sectionBackgrounds';
import { THEME_BACKGROUND_SLOTS } from '@/lib/invitation/sectionStyle';

export type BackgroundChoice = { value: ThemeBackgroundChoice; label: string; src?: string };

// The theme backgrounds this section may show (old wedartOpenSectionThemeBg).
// Admins also pick "automatic" and decide what the host may choose.
export function useBackgroundSettings({ section, edit, mode, isAdmin, theme, media }: SettingsScope) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const available = availableBackgroundSlots(theme);

    const slotLabel = useCallback((slot: ThemeBackgroundSlot) => t('backgroundNumber', { n: THEME_BACKGROUND_SLOTS.indexOf(slot) + 1 }), [t]);
    const slotChoice = (slot: ThemeBackgroundSlot): BackgroundChoice => {
        const art = theme.backgrounds[slot].mobile ?? theme.backgrounds[slot].desktop;
        return { value: slot, label: slotLabel(slot), src: art ? media(art.mediaId) : undefined };
    };

    const slots = isAdmin ? available : hostBackgroundSlots(section, theme);
    const choices: BackgroundChoice[] = [...(isAdmin ? [{ value: 'auto' as const, label: t('backgroundAuto') }] : []), ...slots.map(slotChoice)];

    const pick = useCallback(
        (choice: ThemeBackgroundChoice) => edit(setThemeBackground(section.id, choice, mode, theme)),
        [edit, mode, section.id, theme],
    );
    const setHostEnabled = useCallback((enabled: boolean) => edit(setHostBackgroundsEnabled(section.id, enabled, theme)), [edit, section.id, theme]);
    const setHostAllowed = useCallback(
        (slot: ThemeBackgroundSlot, allowed: boolean) => edit(setHostBackgroundAllowed(section.id, slot, allowed)),
        [edit, section.id],
    );

    const { enabled, allowed } = section.style.hostBackgrounds;

    return {
        choices,
        selected: selectedBackground(section),
        pick,
        // Admin only.
        host:
            isAdmin && section.type !== 'footer'
                ? { enabled, allowed, slots: available.map((slot) => ({ slot, label: slotLabel(slot) })), setHostEnabled, setHostAllowed }
                : null,
    };
}

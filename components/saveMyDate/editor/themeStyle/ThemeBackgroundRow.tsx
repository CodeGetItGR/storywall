'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { ThemeSelectRow } from '@/components/saveMyDate/editor/themeStyle/ThemeSelectRow';
import { ThemeToggleRow } from '@/components/saveMyDate/editor/themeStyle/ThemeToggleRow';
import { BACKGROUND_MODES, type BackgroundMode, type BackgroundSlot } from '@/lib/invitation/themeEditing';

type ThemeBackgroundRowProps = {
    slot: BackgroundSlot;
    number: number;
    mode: BackgroundMode;
    stableRepeat: boolean;
    onMode: (slot: BackgroundSlot, mode: BackgroundMode) => void;
    onStableRepeat: (slot: BackgroundSlot, stable: boolean) => void;
};

// How one of the theme's three backgrounds fills a section.
export function ThemeBackgroundRow({ slot, number, mode, stableRepeat, onMode, onStableRepeat }: ThemeBackgroundRowProps) {
    const t = useTranslations('InvitationEditor');
    const options = BACKGROUND_MODES.map((value) => ({ value, label: t(`themeStyle.modes.${value}`) }));
    const changeMode = useCallback((value: string) => onMode(slot, value as BackgroundMode), [onMode, slot]);
    const changeStable = useCallback((checked: boolean) => onStableRepeat(slot, checked), [onStableRepeat, slot]);

    return (
        <div className="flex flex-col gap-1">
            <ThemeSelectRow label={t('sectionSettings.backgroundNumber', { n: number })} value={mode} options={options} onChange={changeMode} />
            <ThemeToggleRow label={t('themeStyle.stableRepeat')} checked={stableRepeat} onChange={changeStable} />
        </div>
    );
}

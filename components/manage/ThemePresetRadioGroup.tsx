'use client';

import { type KeyboardEvent, useState } from 'react';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { ThemePresetOption } from '@/components/manage/ThemePresetOption';
import type { EventThemeFontDto } from '@/lib/api/types';
import { themeFontFaceCss } from '@/lib/eventTheme';
import { cn } from '@/lib/utils';

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

export type ThemeRadioOption = {
    id: string;
    // Null for "No theme"; undefined for an applied theme that can't be picked again.
    presetId: string | null | undefined;
    label: string;
    backgroundColor: string | null;
    illustrationUrl: string | null;
    titleColor: string | null;
    headingFont: EventThemeFontDto | null;
    selected: boolean;
};

// The theme cards as one radio group, with a roving tab stop and arrow/Home/End keys.
// Shared by the host's Theme section and the event-creation theme step.
export function ThemePresetRadioGroup({
    options,
    labelledBy,
    disabled,
    savingPresetId,
    size = 'default',
    onSelectAction,
}: {
    options: ThemeRadioOption[];
    labelledBy: string;
    disabled: boolean;
    // The preset id being saved (null for "No theme"), or undefined when nothing is saving.
    savingPresetId?: string | null;
    // `large`: two cards per row with bigger art, for the narrow event-creation column.
    size?: 'default' | 'large';
    onSelectAction: (presetId: string | null) => void;
}) {
    // The option last focused; the tab stop follows it.
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const tabbableId =
        (options.some((option) => option.id === focusedId) ? focusedId : options.find((option) => option.selected)?.id) ?? options[0]?.id;

    // One @font-face per font, however many cards share it: the first valid one per key, skipping
    // fonts that would declare nothing.
    const fontsByKey = new Map<string, EventThemeFontDto>();
    for (const option of options) {
        const font = option.headingFont;
        if (font && themeFontFaceCss(font) !== null && !fontsByKey.has(font.key)) fontsByKey.set(font.key, font);
    }
    const fonts = [...fontsByKey.values()];

    function handleKeyDown(keyEvent: KeyboardEvent<HTMLDivElement>) {
        const { key } = keyEvent;
        const radios = Array.from(keyEvent.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
        const current = radios.indexOf(document.activeElement as HTMLElement);
        if (current === -1) return;
        let next: number;
        if (NEXT_KEYS.includes(key)) next = (current + 1) % radios.length;
        else if (PREVIOUS_KEYS.includes(key)) next = (current - 1 + radios.length) % radios.length;
        else if (key === 'Home') next = 0;
        else if (key === 'End') next = radios.length - 1;
        else return;
        keyEvent.preventDefault();
        radios[next].focus();
    }

    return (
        <div
            role="radiogroup"
            aria-labelledby={labelledBy}
            onKeyDown={handleKeyDown}
            className={cn('mt-4 grid grid-cols-2 gap-4', size === 'default' && 'sm:grid-cols-3 xl:grid-cols-4')}
        >
            {fonts.map((font) => (
                <ThemeFontFace key={font.key} font={font} />
            ))}
            {options.map((option) => (
                <ThemePresetOption
                    key={option.id}
                    optionId={option.id}
                    presetId={option.presetId}
                    label={option.label}
                    backgroundColor={option.backgroundColor}
                    illustrationUrl={option.illustrationUrl}
                    titleColor={option.titleColor}
                    headingFont={option.headingFont}
                    selected={option.selected}
                    saving={option.presetId !== undefined && savingPresetId !== undefined && savingPresetId === option.presetId}
                    disabled={disabled}
                    tabbable={option.id === tabbableId}
                    size={size}
                    onSelectAction={onSelectAction}
                    onFocusAction={setFocusedId}
                />
            ))}
        </div>
    );
}

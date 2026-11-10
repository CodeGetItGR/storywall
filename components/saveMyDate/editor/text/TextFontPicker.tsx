'use client';

import { Popover } from '@base-ui/react/popover';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { keepTextFocus } from '@/components/saveMyDate/editor/text/TextToolbarButton';
import { type FontOption, sameFont, THEME_FONT } from '@/lib/invitation/textEditing';

type TextFontPickerProps = {
    value: string;
    // The font's name; none for the theme's font.
    label?: string;
    options: FontOption[];
    onChange: (font: string) => void;
};

// The text's font: the theme's, then its own fonts, the ones in use and every other, each drawn in itself.
export function TextFontPicker({ value, label, options, onChange }: TextFontPickerProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Popover.Root>
            {/* Trigger */}
            <Popover.Trigger
                aria-label={t('font')}
                title={t('font')}
                onMouseDown={keepTextFocus}
                className="flex h-10 max-w-36 shrink-0 items-center gap-1.5 rounded-[10px] bg-(--smd-editor-control) px-2.5 text-[13px] text-(--smd-editor-text) hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <span className="truncate" style={label ? { fontFamily: value } : undefined}>
                    {label ?? t('themeFont')}
                </span>
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-70" />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="top" sideOffset={8} collisionPadding={12} className="z-40">
                    <Popover.Popup className="smd-editor max-h-[min(360px,60svh)] w-64 overflow-y-auto rounded-[14px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-1.5 text-(--smd-editor-text) shadow-[0_18px_40px_rgba(0,0,0,0.45)] outline-none">
                        {/* Fonts */}
                        <FontChoice value={THEME_FONT} label={t('themeFont')} isSelected={value === THEME_FONT} onChange={onChange} />
                        {options.map((option) => (
                            <FontChoice
                                key={option.value}
                                value={option.value}
                                label={option.label}
                                isSelected={sameFont(option.value, value)}
                                onChange={onChange}
                            />
                        ))}
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

type FontChoiceProps = { value: string; label: string; isSelected: boolean; onChange: (font: string) => void };

function FontChoice({ value, label, isSelected, onChange }: FontChoiceProps) {
    const choose = useCallback(() => onChange(value), [onChange, value]);

    return (
        <Popover.Close
            aria-pressed={isSelected}
            onClick={choose}
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[10px] px-3 text-left text-[17px] hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-pressed:bg-white/10"
            style={value === THEME_FONT ? undefined : { fontFamily: value }}
        >
            <span className="truncate">{label}</span>
            {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
        </Popover.Close>
    );
}

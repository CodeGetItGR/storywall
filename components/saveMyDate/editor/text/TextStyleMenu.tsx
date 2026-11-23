'use client';

import { Popover } from '@base-ui/react/popover';
import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { keepTextFocus } from '@/components/saveMyDate/editor/text/TextToolbarButton';
import type { TextStylePresetDto } from '@/lib/api/types';
import { presetName, presetSample } from '@/lib/textStylePresets';

type TextStyleMenuProps = { presets: TextStylePresetDto[]; text: string; onPick: (preset: TextStylePresetDto) => void };

// The feed toolbar's Style (spec item 10): the admin's presets, each drawn on the start of the text being edited.
export function TextStyleMenu({ presets, text, onPick }: TextStyleMenuProps) {
    const t = useTranslations('FeedEditor');

    return (
        <Popover.Root>
            {/* Trigger */}
            <Popover.Trigger
                aria-label={t('style')}
                disabled={presets.length === 0}
                onMouseDown={keepTextFocus}
                className="flex h-10 shrink-0 items-center gap-1 rounded-[10px] px-2.5 text-[13px] font-semibold hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
            >
                {t('style')}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="top" sideOffset={8} collisionPadding={12} className="z-40">
                    <Popover.Popup className="smd-editor flex max-h-[60vh] w-[min(260px,calc(100vw-24px))] flex-col gap-1 overflow-y-auto rounded-[14px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-1.5 text-(--smd-editor-text) shadow-[0_18px_40px_rgba(0,0,0,0.45)] outline-none">
                        {/* Presets */}
                        {presets.map((preset) => (
                            <StyleChoice key={preset.id} preset={preset} text={text} onPick={onPick} />
                        ))}
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

function StyleChoice({ preset, text, onPick }: { preset: TextStylePresetDto; text: string; onPick: (preset: TextStylePresetDto) => void }) {
    const locale = useLocale();
    const pick = useCallback(() => onPick(preset), [onPick, preset]);

    return (
        <Popover.Close
            onClick={pick}
            onMouseDown={keepTextFocus}
            className="flex w-full flex-col items-start gap-0.5 rounded-[10px] px-3 py-2 text-left hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
            {/* Name */}
            <span className="text-[10px] tracking-[0.12em] text-white/60 uppercase">{presetName(preset, locale)}</span>
            {/* Sample, in the preset; capped so a large size still fits the menu */}
            <span
                className="max-w-full truncate leading-tight"
                style={{
                    fontFamily: preset.font,
                    fontSize: Math.min(preset.size, 26),
                    fontWeight: preset.weight === 'BOLD' ? 700 : 400,
                    fontStyle: preset.italic ? 'italic' : 'normal',
                    letterSpacing: `${preset.letterSpacing}px`,
                    textTransform: preset.uppercase ? 'uppercase' : 'none',
                }}
            >
                {presetSample(text, preset, locale)}
            </span>
        </Popover.Close>
    );
}

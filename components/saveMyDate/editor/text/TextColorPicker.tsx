'use client';

import { Popover } from '@base-ui/react/popover';
import { useTranslations } from 'next-intl';
import { useCallback, useId } from 'react';
import { HexColorPicker } from 'react-colorful';

import { keepTextFocus } from '@/components/saveMyDate/editor/text/TextToolbarButton';
import { useTextColorPicker } from '@/hooks/useTextColorPicker';
import type { ColorScope } from '@/lib/invitation/textEditing';
import { cn } from '@/lib/utils';

type TextColorPickerProps = {
    value: string;
    swatches: string[];
    onPick: (color: string, scope: ColorScope) => void;
};

const SCOPES: ColorScope[] = ['text', 'section', 'all'];
const SCOPE_LABEL = { text: 'thisText', section: 'thisSection', all: 'everyText' } as const;

// react-colorful sets its own size in a style tag it adds, so only an inline size wins.
const PICKER_SIZE = { width: '100%', height: 180 };

const ACTION_CLASS = 'h-10 flex-1 rounded-[10px] text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

// The text colour: the theme's colours, the ones in use and a full picker, for this text, its section or every text.
export function TextColorPicker({ value, swatches, onPick }: TextColorPickerProps) {
    const t = useTranslations('InvitationEditor');
    const picker = useTextColorPicker(value, onPick);
    const scopeLabelId = useId();

    return (
        <Popover.Root open={picker.isOpen} onOpenChange={picker.onOpenChange}>
            {/* Trigger */}
            <Popover.Trigger
                aria-label={t('textColor')}
                title={t('textColor')}
                onMouseDown={keepTextFocus}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <span aria-hidden="true" className="h-6 w-6 rounded-full border-2 border-white/70" style={{ background: value }} />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="top" sideOffset={8} collisionPadding={12} className="z-40">
                    <Popover.Popup className="smd-editor flex w-[min(300px,calc(100vw-24px))] flex-col gap-3 rounded-[14px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-3 text-(--smd-editor-text) shadow-[0_18px_40px_rgba(0,0,0,0.45)] outline-none">
                        {/* Title */}
                        <Popover.Title className="text-[13px] font-bold text-white">{t('textColor')}</Popover.Title>

                        {/* Scope */}
                        <div className="flex flex-col gap-1.5">
                            <span id={scopeLabelId} className="text-xs text-(--smd-editor-muted)">
                                {t('applyTo')}
                            </span>
                            <div role="radiogroup" aria-labelledby={scopeLabelId} className="grid grid-cols-3 gap-1 rounded-[10px] bg-(--smd-editor-control) p-1">
                                {SCOPES.map((scope) => (
                                    <ScopeChoice key={scope} scope={scope} label={t(SCOPE_LABEL[scope])} selected={picker.scope} onSelect={picker.setScope} />
                                ))}
                            </div>
                        </div>

                        {picker.custom === null ? (
                            <>
                                {/* Swatches */}
                                <div className="grid grid-cols-6 gap-2">
                                    {swatches.map((color) => (
                                        <Swatch key={color} color={color} selected={color.toLowerCase() === value.toLowerCase()} onPick={picker.pickSwatch} />
                                    ))}
                                </div>

                                {/* Full picker */}
                                <button
                                    type="button"
                                    onClick={picker.showMore}
                                    className="h-10 rounded-[10px] bg-(--smd-editor-control) text-[13px] font-semibold hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                                >
                                    {t('moreColors')}
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Full picker */}
                                <HexColorPicker color={picker.custom} onChange={picker.setCustom} style={PICKER_SIZE} />
                                <div className="flex items-center gap-2">
                                    <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-full border-2 border-white/70" style={{ background: picker.custom }} />
                                    <button type="button" onClick={picker.cancelCustom} className={cn(ACTION_CLASS, 'bg-(--smd-editor-control) hover:bg-white/10')}>
                                        {t('cancel')}
                                    </button>
                                    <button type="button" onClick={picker.applyCustom} className={cn(ACTION_CLASS, 'bg-primary text-primary-foreground hover:bg-primary-dark')}>
                                        {t('apply')}
                                    </button>
                                </div>
                            </>
                        )}
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

type ScopeChoiceProps = { scope: ColorScope; label: string; selected: ColorScope; onSelect: (scope: ColorScope) => void };

function ScopeChoice({ scope, label, selected, onSelect }: ScopeChoiceProps) {
    const select = useCallback(() => onSelect(scope), [onSelect, scope]);

    return (
        <button
            type="button"
            role="radio"
            aria-checked={scope === selected}
            onClick={select}
            className="min-h-9 rounded-lg px-1 text-[12px] leading-tight font-semibold text-(--smd-editor-muted) focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-checked:bg-white aria-checked:text-[#232327]"
        >
            {label}
        </button>
    );
}

type SwatchProps = { color: string; selected: boolean; onPick: (color: string) => void };

function Swatch({ color, selected, onPick }: SwatchProps) {
    const pick = useCallback(() => onPick(color), [color, onPick]);

    return (
        <button
            type="button"
            aria-label={color}
            title={color}
            aria-pressed={selected}
            onClick={pick}
            className="aspect-square w-full rounded-full border border-white/25 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-pressed:ring-2 aria-pressed:ring-white aria-pressed:ring-offset-2 aria-pressed:ring-offset-(--smd-editor-panel)"
            style={{ background: color }}
        />
    );
}

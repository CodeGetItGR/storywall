'use client';

import { Popover } from '@base-ui/react/popover';
import { useTranslations } from 'next-intl';
import { useCallback, useId } from 'react';

import { keepTextFocus } from '@/components/saveMyDate/editor/text/TextToolbarButton';
import { ColorCircles } from '@/components/ui/color/ColorCircles';
import { useTextColorPicker } from '@/hooks/useTextColorPicker';
import type { ColorScope } from '@/lib/invitation/textEditing';
import { cn } from '@/lib/utils';

type TextColorPickerProps = {
    value: string;
    // The theme's own.
    themeColors: string[];
    onPick: (color: string, scope: ColorScope) => void;
    // Where a colour can go; with one, there is nothing to choose (the feed colours this text only).
    scopes?: ColorScope[];
    // The trigger's size, for the docked feed toolbar.
    className?: string;
};

const SCOPES: ColorScope[] = ['text', 'section', 'all'];
const SCOPE_LABEL = { text: 'thisText', section: 'thisSection', all: 'everyText' } as const;

// The text colour, for this text, its section or every text.
export function TextColorPicker({ value, themeColors, onPick, scopes = SCOPES, className }: TextColorPickerProps) {
    const t = useTranslations('InvitationEditor');
    const picker = useTextColorPicker(onPick);
    const scopeLabelId = useId();

    return (
        <Popover.Root open={picker.isOpen} onOpenChange={picker.onOpenChange}>
            {/* Trigger */}
            <Popover.Trigger
                aria-label={t('textColor')}
                title={t('textColor')}
                onMouseDown={keepTextFocus}
                className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-[10px] hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                    className,
                )}
            >
                <span aria-hidden="true" className="h-6 w-6 rounded-full border-2 border-white/70" style={{ background: value }} />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="top" sideOffset={8} collisionPadding={12} className="z-40">
                    <Popover.Popup className="smd-editor flex w-[min(300px,calc(100vw-24px))] flex-col gap-3 rounded-[14px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-3 text-(--smd-editor-text) shadow-[0_18px_40px_rgba(0,0,0,0.45)] outline-none">
                        {/* Title */}
                        <Popover.Title className="text-[13px] font-bold text-white">{t('textColor')}</Popover.Title>

                        {/* Scope */}
                        {scopes.length > 1 && (
                            <div className="flex flex-col gap-1.5">
                                <span id={scopeLabelId} className="text-xs text-(--smd-editor-muted)">
                                    {t('applyTo')}
                                </span>
                                <div role="radiogroup" aria-labelledby={scopeLabelId} className="grid grid-cols-3 gap-1 rounded-[10px] bg-(--smd-editor-control) p-1">
                                    {scopes.map((scope) => (
                                        <ScopeChoice key={scope} scope={scope} label={t(SCOPE_LABEL[scope])} selected={picker.scope} onSelect={picker.setScope} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Colours: mixing one changes the text on Done only */}
                        <ColorCircles value={value} themeColors={themeColors} label={t('textColor')} liveMix={false} onChange={picker.pick} onPicked={picker.close} />
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

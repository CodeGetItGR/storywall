'use client';

import '@/components/saveMyDate/editor/editor.css';

import { Popover } from '@base-ui/react/popover';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HexColorPicker } from 'react-colorful';

import { CIRCLE_CLASS } from '@/components/ui/color/ColorCircle';
import { useColorMixer } from '@/hooks/useColorMixer';
import { cn } from '@/lib/utils';

type ColorMixerProps = {
    value: string | undefined;
    // What the mixer opens on when no colour is set.
    start: string;
    surface: 'dark' | 'light';
    disabled?: boolean;
    // Each colour on the way counts, not only the one Done keeps.
    live: boolean;
    onChange: (color: string) => void;
    onPicked?: () => void;
};

// react-colorful sets its own size in a style tag it adds, so only an inline size wins.
const PICKER_SIZE = { width: '100%', height: 180 };

// The white "+" after the circles, and the mixer it opens: a colour square with a hue bar, the colour and its code.
export function ColorMixer({ value, start, surface, disabled, live, onChange, onPicked }: ColorMixerProps) {
    const t = useTranslations('InvitationEditor');
    const mixer = useColorMixer(value, start, onChange, { live, onPicked });

    return (
        <Popover.Root open={mixer.isOpen} onOpenChange={mixer.onOpenChange}>
            {/* Trigger */}
            <Popover.Trigger
                aria-label={t('moreColors')}
                title={t('moreColors')}
                disabled={disabled}
                className={cn(CIRCLE_CLASS, 'grid place-items-center bg-white text-ink', surface === 'light' && 'border-line-strong')}
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="top" sideOffset={8} collisionPadding={12} className="z-50">
                    <Popover.Popup
                        aria-label={t('moreColors')}
                        className={cn(
                            'smd-editor flex w-[min(260px,calc(100vw-24px))] flex-col gap-3 rounded-[14px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-3 text-(--smd-editor-text) shadow-[0_18px_40px_rgba(0,0,0,0.35)] outline-none',
                            surface === 'light' && 'smd-editor-sheet',
                        )}
                    >
                        {/* Square and hue bar */}
                        <HexColorPicker color={mixer.color} onChange={mixer.mix} style={PICKER_SIZE} />

                        {/* Colour and code */}
                        <div className="flex items-center gap-2.5">
                            <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-full border border-black/10" style={{ background: mixer.color }} />
                            <span className="flex-1 font-mono text-[13px]">{mixer.color.toUpperCase()}</span>
                            <button
                                type="button"
                                onClick={mixer.done}
                                className="h-9 shrink-0 rounded-[10px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-(--smd-editor-strong) focus-visible:outline-none"
                            >
                                {t('sectionSettings.done')}
                            </button>
                        </div>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

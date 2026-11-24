'use client';

import '@/components/saveMyDate/editor/editor.css';

import { Popover } from '@base-ui/react/popover';

import { ColorCircles } from '@/components/ui/color/ColorCircles';
import { useColorSwatch } from '@/hooks/useColorSwatch';
import { cn } from '@/lib/utils';

type ColorSwatchProps = {
    // The colour as drawn, or nothing for one not set.
    value: string | undefined;
    label: string;
    onChange: (color: string) => void;
    themeColors?: readonly string[];
    surface?: 'dark' | 'light';
    id?: string;
    describedBy?: string;
    className?: string;
};

// One colour among other settings: a round button in it, and the circles in a popover.
export function ColorSwatch({ value, label, onChange, themeColors, surface = 'dark', id, describedBy, className }: ColorSwatchProps) {
    const swatch = useColorSwatch();

    return (
        <Popover.Root open={swatch.isOpen} onOpenChange={swatch.onOpenChange}>
            {/* Colour */}
            <Popover.Trigger
                id={id}
                aria-label={label}
                aria-describedby={describedBy}
                title={label}
                className={cn(
                    'relative h-9 w-9 shrink-0 rounded-full border-2 before:absolute before:-inset-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                    surface === 'light' ? 'border-line-strong focus-visible:ring-offset-white' : 'border-white/70 focus-visible:ring-offset-(--smd-editor-panel)',
                    className,
                )}
                style={{ background: value }}
            />

            {/* Circles */}
            <Popover.Portal>
                <Popover.Positioner side="top" sideOffset={8} collisionPadding={12} className="z-50">
                    <Popover.Popup
                        aria-label={label}
                        className={cn(
                            'smd-editor w-max max-w-[min(300px,calc(100vw-24px))] rounded-[14px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-3 text-(--smd-editor-text) shadow-[0_18px_40px_rgba(0,0,0,0.35)] outline-none',
                            surface === 'light' && 'smd-editor-sheet',
                        )}
                    >
                        <ColorCircles value={value} label={label} themeColors={themeColors} surface={surface} onChange={onChange} onPicked={swatch.close} />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

'use client';

import type { CSSProperties, Ref } from 'react';

import type { DragHandlers } from '@/hooks/useDragHandle';
import { cn } from '@/lib/utils';

// bar: a section's height. text: the space above or below a text. spacer: a spacer's
// height. dot: an element's size. The old editor's colours; the touch area is at least 40px.
export type CanvasHandleVariant = 'bar' | 'text' | 'spacer' | 'dot';

type CanvasHandleProps = {
    variant: CanvasHandleVariant;
    label: string;
    value: number;
    min: number;
    max: number;
    valueText: string;
    isDragging: boolean;
    handlers: DragHandlers;
    handleRef?: Ref<HTMLDivElement>;
    className?: string;
    style?: CSSProperties;
};

const HIT_AREA: Record<CanvasHandleVariant, string> = {
    bar: 'h-11 w-16 cursor-ns-resize',
    text: 'h-10 w-12 cursor-ns-resize',
    spacer: 'h-11 w-16 cursor-ns-resize',
    dot: 'h-11 w-11 cursor-nwse-resize',
};

const MARK: Record<CanvasHandleVariant, string> = {
    bar: 'h-2.5 w-12 rounded-md bg-[#8e949c] shadow-[0_3px_10px_rgba(0,0,0,0.28)]',
    text: 'h-[11px] w-[34px] rounded-[4px] bg-(--smd-editor-accent) shadow-[0_1px_4px_rgba(0,0,0,0.3)]',
    spacer: 'h-2.5 w-9 rounded-md bg-[#8e949c] shadow-[0_3px_10px_rgba(0,0,0,0.28)]',
    dot: 'h-[22px] w-[22px] rounded-full bg-[#5c9d8b] shadow-[0_3px_10px_rgba(0,0,0,0.28)]',
};

// One drag handle on the canvas. A slider for keyboards and screen readers: the
// arrow keys change it, and it reads out its value.
export function CanvasHandle({ variant, label, value, min, max, valueText, isDragging, handlers, handleRef, className, style }: CanvasHandleProps) {
    return (
        <div
            ref={handleRef}
            role="slider"
            tabIndex={0}
            aria-label={label}
            title={label}
            aria-orientation={variant === 'dot' ? 'horizontal' : 'vertical'}
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuetext={valueText}
            // A tap here doesn't end the text being edited.
            data-smd-keep-text=""
            data-dragging={isDragging}
            {...handlers}
            className={cn(
                'smd-canvas-handle z-40 grid touch-none place-items-center transition-none select-none focus-visible:outline-2 focus-visible:outline-(--smd-editor-accent)',
                HIT_AREA[variant],
                className,
            )}
            style={style}
        >
            {/* Spacer line */}
            {variant === 'spacer' && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1/2 border-t border-dashed border-white/35" />
            )}

            {/* Mark */}
            <span
                aria-hidden="true"
                className={cn(
                    'pointer-events-none relative border-2 border-white',
                    MARK[variant],
                    isDragging && variant !== 'dot' && 'bg-[#5c9d8b]',
                )}
            />
        </div>
    );
}

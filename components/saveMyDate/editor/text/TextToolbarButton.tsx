import { forwardRef, type MouseEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TextToolbarButtonProps = {
    label: string;
    onClick?: () => void;
    pressed?: boolean;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
};

// Clicking a tool keeps the caret in the text, so the phone's keyboard stays up.
export function keepTextFocus(event: MouseEvent) {
    event.preventDefault();
}

export const TEXT_TOOL_CLASS =
    'grid h-10 min-w-10 shrink-0 place-items-center rounded-[10px] px-2 text-(--smd-editor-text) transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent aria-pressed:bg-white/15 aria-pressed:text-white [&_svg]:h-[18px] [&_svg]:w-[18px]';

// One button of the text toolbar. A toggle says whether it is on.
export const TextToolbarButton = forwardRef<HTMLButtonElement, TextToolbarButtonProps>(function TextToolbarButton(
    { label, onClick, pressed, disabled = false, className, children, ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={pressed}
            onClick={onClick}
            onMouseDown={keepTextFocus}
            disabled={disabled}
            className={cn(TEXT_TOOL_CLASS, className)}
            {...rest}
        >
            {children}
        </button>
    );
});

'use client';

import type { ButtonHTMLAttributes, Ref } from 'react';

import { cn } from '@/lib/utils';

type PhotoToolButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    buttonRef?: Ref<HTMLButtonElement>;
};

// A round dark button over a photo, as in the old editor: moves or zooms it.
export function PhotoToolButton({ label, buttonRef, className, children, ...props }: PhotoToolButtonProps) {
    return (
        <button
            ref={buttonRef}
            type="button"
            aria-label={label}
            title={label}
            // A tap here doesn't end the text being edited.
            data-smd-keep-text=""
            className={cn(
                'grid h-10 w-10 place-items-center rounded-full border border-white/85 bg-[rgba(28,30,34,0.72)] text-white shadow-[0_4px_14px_rgba(0,0,0,0.24)] select-none focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:cursor-default disabled:opacity-40',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}

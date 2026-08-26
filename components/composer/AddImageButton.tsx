'use client';

import { ImagePlus } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type AddImageButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function AddImageButton({ className, type = 'button', ...props }: AddImageButtonProps) {
    return (
        <button
            type={type}
            className={cn(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/90 text-ink-muted shadow-[0_10px_22px_rgba(36,31,26,0.08)] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:text-primary hover:shadow-[0_14px_28px_rgba(36,31,26,0.12)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50',
                className
            )}
            {...props}
        >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
        </button>
    );
}

'use client';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type AdminRailItemProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'className' | 'aria-current'> & {
    active: boolean;
    muted?: boolean;
};

export function AdminRailItem({ active, muted = false, children, ...props }: AdminRailItemProps) {
    return (
        <button
            type="button"
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.3px] font-semibold transition-colors',
                active ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                muted && 'opacity-60',
            )}
            {...props}
        >
            {children}
        </button>
    );
}

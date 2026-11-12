'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

// The small building blocks of the section settings: a titled group, a
// labelled row and the dark fields of the editor.

type SettingsGroupProps = { title?: string; children: ReactNode };

export function SettingsGroup({ title, children }: SettingsGroupProps) {
    return (
        <section className="flex min-w-0 flex-col gap-2">
            {/* Title */}
            {title && <h3 className="text-[11.5px] font-bold tracking-wide text-(--smd-editor-muted) uppercase">{title}</h3>}

            {/* Fields */}
            {children}
        </section>
    );
}

type SettingsRowProps = { label: string; htmlFor?: string; children: ReactNode };

// A label on the left and its control on the right.
export function SettingsRow({ label, htmlFor, children }: SettingsRowProps) {
    return (
        <div className="flex min-h-10 items-center justify-between gap-3">
            <label htmlFor={htmlFor} className="min-w-0 text-[13px] leading-tight">
                {label}
            </label>
            {children}
        </div>
    );
}

export const FIELD_CLASS =
    'h-10 w-full min-w-0 rounded-[10px] border border-transparent bg-(--smd-editor-control) px-3 text-[14px] text-(--smd-editor-text) placeholder:text-(--smd-editor-muted) focus-visible:border-(--smd-editor-accent) focus-visible:outline-none aria-invalid:border-(--smd-editor-danger)';

export function SettingsInput({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
    return <input className={cn(FIELD_CLASS, className)} {...props} />;
}

export function SettingsSelect({ className, ...props }: ComponentPropsWithoutRef<'select'>) {
    return <select className={cn(FIELD_CLASS, 'cursor-pointer pr-8', className)} {...props} />;
}

export function SettingsHint({ id, tone = 'muted', children }: { id?: string; tone?: 'muted' | 'error'; children: ReactNode }) {
    return (
        <p
            id={id}
            role={tone === 'error' ? 'alert' : undefined}
            className={cn('text-[12px] leading-snug', tone === 'error' ? 'text-(--smd-editor-danger)' : 'text-(--smd-editor-muted)')}
        >
            {children}
        </p>
    );
}

export const SECONDARY_BUTTON_CLASS =
    'flex h-10 items-center justify-center gap-2 rounded-[10px] bg-(--smd-editor-control) px-3 text-[13px] font-semibold text-(--smd-editor-text) hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4';

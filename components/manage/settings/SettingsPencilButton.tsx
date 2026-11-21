'use client';

import { Pencil } from 'lucide-react';

import { cn } from '@/lib/utils';

type SettingsPencilButtonProps = {
    label: string;
    selected?: boolean;
    onClick: () => void;
};

// The round pencil on each part of the Settings preview. Filled while its editor is open.
export function SettingsPencilButton({ label, selected = false, onClick }: SettingsPencilButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-expanded={selected}
            className={cn(
                // 36px circle, 44px tap target.
                'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-[0_1px_4px_rgba(36,31,26,0.14)] transition-colors after:absolute after:-inset-1 after:content-[""]',
                selected ? 'bg-primary text-white' : 'bg-background text-primary hover:bg-primary-light',
            )}
        >
            <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
    );
}

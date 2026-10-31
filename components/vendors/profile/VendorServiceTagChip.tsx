'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { VendorServiceTag } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// One service to tap on and off.
export function VendorServiceTagChip({
    tag,
    selected,
    disabled,
    onToggleAction,
}: {
    tag: VendorServiceTag;
    selected: boolean;
    disabled: boolean;
    onToggleAction: (tag: VendorServiceTag) => void;
}) {
    const t = useTranslations('Vendors');
    const handleClick = useCallback(() => onToggleAction(tag), [onToggleAction, tag]);

    return (
        <button
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={handleClick}
            className={cn(
                'inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-medium focus-ring transition disabled:opacity-40',
                selected ? 'bg-ink text-white' : 'bg-surface-muted text-ink hover:bg-surface-muted/70',
            )}
        >
            {selected && <Check className="size-3.5" aria-hidden="true" />}
            {t(`serviceTags.${tag}`)}
        </button>
    );
}

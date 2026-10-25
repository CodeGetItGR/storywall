'use client';

import { Check, Loader2, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export type PrintToggle = { picked: boolean; pending: boolean; disabled: boolean; error: string | null; onToggle: () => void };

// The viewer's pick button, styled like the other actions in the viewer's row.
export function PrintToggleButton({ toggle }: { toggle: PrintToggle }) {
    const t = useTranslations('GalleryPage.print');

    return (
        <button
            type="button"
            onClick={toggle.onToggle}
            disabled={toggle.pending || toggle.disabled}
            aria-pressed={toggle.picked}
            aria-label={toggle.picked ? t('picked') : undefined}
            className={cn(
                'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50',
                toggle.picked ? 'bg-white text-ink' : 'bg-black/50 text-white',
            )}
        >
            {toggle.pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : toggle.picked ? (
                <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
                <Printer className="h-4 w-4" aria-hidden="true" />
            )}
            {t('action')}
        </button>
    );
}

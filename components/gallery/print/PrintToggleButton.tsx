'use client';

import { Loader2, Printer } from 'lucide-react';
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
            className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50',
                toggle.picked ? 'bg-white text-ink' : 'bg-black/50 text-white',
            )}
        >
            {toggle.pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Printer className="h-4 w-4" aria-hidden="true" />}
            {toggle.picked ? t('picked') : t('action')}
        </button>
    );
}

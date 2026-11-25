'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ref } from 'react';

import { cn } from '@/lib/utils';

type FeedEditPencilProps = { onClick: () => void; ref?: Ref<HTMLButtonElement>; className?: string };

// The feed's Edit button, hosts and co-hosts only: a white circle, 40 px to look at and 44 px to tap.
export function FeedEditPencil({ onClick, ref, className }: FeedEditPencilProps) {
    const t = useTranslations('FeedEditor');

    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-label={t('edit')}
            title={t('edit')}
            className={cn(
                'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-ink shadow-[0_2px_8px_rgba(36,31,26,0.14)] transition-colors outline-none before:absolute before:-inset-[3px] before:rounded-full hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary',
                className,
            )}
        >
            <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
    );
}

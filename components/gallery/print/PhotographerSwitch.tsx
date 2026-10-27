'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { useCallback } from 'react';

import type { PrintPhotographerDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Shown only with two or more photographers: whose list the sheet shows.
export function PhotographerSwitch({
    photographers,
    activeId,
    onSelectAction,
}: {
    photographers: PrintPhotographerDto[];
    activeId: string;
    onSelectAction: (vendorId: string) => void;
}) {
    const t = useTranslations('GalleryPage.print');
    const handleSelect = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const vendorId = event.currentTarget.dataset.vendorId;
            if (vendorId) onSelectAction(vendorId);
        },
        [onSelectAction],
    );

    if (photographers.length < 2) return null;

    return (
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
            {photographers.map((photographer) => (
                <button
                    key={photographer.vendorId}
                    type="button"
                    data-vendor-id={photographer.vendorId}
                    aria-pressed={photographer.vendorId === activeId}
                    onClick={handleSelect}
                    className={cn(
                        'min-h-10 flex-1 truncate rounded-full px-3 text-sm font-semibold transition-colors',
                        photographer.vendorId === activeId ? 'bg-background text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                    )}
                >
                    {photographer.businessName ?? t('photographerUnnamed')}
                </button>
            ))}
        </div>
    );
}

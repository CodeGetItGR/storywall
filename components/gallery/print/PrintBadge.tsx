'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

// A picked photo's mark in the grid.
export function PrintBadge() {
    const t = useTranslations('GalleryPage.print');

    return (
        <span
            className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex size-6 items-center justify-center rounded-full bg-ink/80 text-white"
            title={t('picked')}
        >
            <Printer className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{t('picked')}</span>
        </span>
    );
}

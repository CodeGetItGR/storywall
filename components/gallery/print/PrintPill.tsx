'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export function PrintPill({ count, onOpenAction }: { count: number; onOpenAction: () => void }) {
    const t = useTranslations('GalleryPage.print');

    return (
        <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenAction}
            className="inline-flex rounded-full border-border bg-background px-3 text-xs font-semibold text-ink-muted hover:text-ink"
        >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            {t('pill', { count })}
        </Button>
    );
}

'use client';

import { Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

// One download button: the whole zip when there is one part, "Part 2 of 3" when there are several.
export function PrintPartButton({
    part,
    partCount,
    isDownloading,
    disabled,
    onDownloadAction,
}: {
    part: number;
    partCount: number;
    isDownloading: boolean;
    disabled: boolean;
    onDownloadAction: (part: number) => void;
}) {
    const t = useTranslations('Vendors.prints');
    const label = isDownloading ? t('downloading') : partCount === 1 ? t('download') : t('downloadPart', { part, total: partCount });

    function handleClick() {
        onDownloadAction(part);
    }

    return (
        <Button type="button" size="lg" onClick={handleClick} disabled={disabled}>
            {isDownloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            {label}
        </Button>
    );
}

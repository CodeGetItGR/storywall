'use client';

import { Download, Loader2, Printer, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export function RsvpReportActions({
    isDownloading,
    onPrint,
    onDownload,
    onClose,
}: {
    isDownloading: boolean;
    onPrint: () => void;
    onDownload: () => void;
    onClose: () => void;
}) {
    const t = useTranslations('ManagePage.rsvpReport');

    return (
        <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
            <Button variant="outline" size="lg" onClick={onPrint}>
                <Printer aria-hidden="true" />
                {t('print')}
            </Button>
            <Button variant="outline" size="lg" onClick={onDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                {t('downloadPdf')}
            </Button>
            <Button variant="ghost" size="lg" onClick={onClose}>
                <X aria-hidden="true" />
                {t('close')}
            </Button>
        </div>
    );
}

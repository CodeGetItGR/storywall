'use client';

import { Download, FileText, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { downloadBlob } from '@/lib/download';

export function RsvpReportsPanel({ eventId }: { eventId: string }) {
    const t = useTranslations('ManagePage');
    const tError = useApiErrorMessage();
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = useCallback(async () => {
        setError(null);
        setDownloading(true);
        try {
            const response = await api.download(endpoints.events.rsvpsExport(eventId));
            const blob = await response.blob();
            downloadBlob(blob, 'rsvps.pdf');
        } catch (downloadError) {
            setError(tError(downloadError, t('rsvpReports.failed')));
        } finally {
            setDownloading(false);
        }
    }, [eventId, t, tError]);

    return (
        <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint" aria-hidden="true" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t('rsvpReports.title')}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{t('rsvpReports.description')}</p>
                </div>
            </div>

            <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="mt-4 flex items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {downloading ? t('rsvpReports.downloading') : t('rsvpReports.download')}
            </button>

            {error && <p className="mt-3 text-xs leading-relaxed text-rose-600">{error}</p>}
        </div>
    );
}

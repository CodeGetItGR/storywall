'use client';

import { Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { RsvpReportType } from '@/lib/api/types';

export function RsvpReportRow({
    reportType,
    disabled,
    isDownloading,
    onDownload,
}: {
    reportType: RsvpReportType;
    disabled: boolean;
    isDownloading: boolean;
    onDownload: (reportType: RsvpReportType) => void;
}) {
    const t = useTranslations('ManagePage.rsvpReports');

    const handleClick = useCallback(() => {
        onDownload(reportType);
    }, [onDownload, reportType]);

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5 text-left transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
            <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{t(`types.${reportType}.label`)}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{t(`types.${reportType}.description`)}</span>
            </span>
            {isDownloading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-faint" aria-hidden="true" />
            ) : (
                <Download className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
            )}
        </button>
    );
}

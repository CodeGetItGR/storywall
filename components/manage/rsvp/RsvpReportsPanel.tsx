'use client';

import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RsvpReportRow } from '@/components/manage/rsvp/RsvpReportRow';
import { RSVP_REPORT_TYPES, useRsvpReportDownload } from '@/hooks/useRsvpReportDownload';

export function RsvpReportsPanel({ eventId }: { eventId: string }) {
    const t = useTranslations('ManagePage.rsvpReports');
    const { download, downloadingType, error } = useRsvpReportDownload(eventId, t('failed'));

    return (
        <div className="bg-background p-4">
            <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint" aria-hidden="true" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t('title')}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{t('description')}</p>
                </div>
            </div>

            {/* Reports */}
            <div className="mt-4 space-y-2">
                {RSVP_REPORT_TYPES.map((reportType) => (
                    <RsvpReportRow
                        key={reportType}
                        reportType={reportType}
                        disabled={downloadingType !== null}
                        isDownloading={downloadingType === reportType}
                        onDownload={download}
                    />
                ))}
            </div>

            {error && <p className="mt-3 text-xs leading-relaxed text-rose-600">{error}</p>}
        </div>
    );
}

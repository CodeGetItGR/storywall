'use client';

import { useTranslations } from 'next-intl';

import { LoadingState } from '@/components/ui/LoadingState';
import { useRsvpReportPage } from '@/hooks/useRsvpReportPage';
import type { RsvpReportType } from '@/lib/api/types';

import { RsvpReportActions } from './RsvpReportActions';
import { RsvpReportView } from './RsvpReportView';

export function RsvpReportScreen({ reportType }: { reportType: RsvpReportType }) {
    const t = useTranslations('ManagePage.rsvpReport');
    const page = useRsvpReportPage(reportType);

    return (
        <div data-print-root className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
            {/* Actions */}
            <RsvpReportActions isDownloading={page.isDownloading} onPrint={page.onPrint} onDownload={page.onDownload} onClose={page.onClose} />
            {page.downloadError && <p className="text-right text-xs text-rose-600 print:hidden">{page.downloadError}</p>}

            {/* Report */}
            {page.isLoading ? (
                <LoadingState size="md" className="min-h-64" />
            ) : page.isError || !page.report ? (
                <p className="text-sm text-rose-600">{t('loadFailed')}</p>
            ) : (
                <RsvpReportView report={page.report} />
            )}
        </div>
    );
}

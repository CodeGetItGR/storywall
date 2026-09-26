import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { useRsvpReportDownload } from '@/hooks/useRsvpReportDownload';
import { useRsvpReport } from '@/hooks/useRsvps';
import type { RsvpReportType } from '@/lib/api/types';
import { resolveRsvpReportCloseHref } from '@/lib/rsvpReport';

export function useRsvpReportPage(reportType: RsvpReportType) {
    const { eventId } = useEventRouteContext();
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('ManagePage.rsvpReports');
    const isModuleReadable = useModuleReadable(eventId, 'rsvp');
    const { data: report, isError } = useRsvpReport(eventId, reportType);
    const { download, downloadingType, error: downloadError } = useRsvpReportDownload(eventId, t('failed'));

    const onPrint = useCallback(() => window.print(), []);
    const onDownload = useCallback(() => download(reportType), [download, reportType]);

    // Always navigate to the Reports sub-tab instead of router.back(): history.length
    // also counts entries from other sites, so "go back" can leave the app entirely.
    // Returns to wherever the report was opened from (see resolveRsvpReportCloseHref).
    const onClose = useCallback(() => {
        router.push(resolveRsvpReportCloseHref(eventId, searchParams.get('from')));
    }, [eventId, router, searchParams]);

    return {
        eventId,
        isModuleReadable,
        report,
        isError,
        isDownloading: downloadingType !== null,
        downloadError,
        onPrint,
        onDownload,
        onClose,
    };
}

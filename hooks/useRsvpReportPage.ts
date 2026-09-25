import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useRsvpReportDownload } from '@/hooks/useRsvpReportDownload';
import { useRsvpReport } from '@/hooks/useRsvps';
import type { RsvpReportType } from '@/lib/api/types';
import { routes } from '@/lib/routes';

export function useRsvpReportPage(reportType: RsvpReportType) {
    const { eventId } = useEventRouteContext();
    const router = useRouter();
    const t = useTranslations('ManagePage.rsvpReports');
    const { data: report, isLoading, isError } = useRsvpReport(eventId, reportType);
    const { download, downloadingType, error: downloadError } = useRsvpReportDownload(eventId, t('failed'));

    const onPrint = useCallback(() => window.print(), []);
    const onDownload = useCallback(() => download(reportType), [download, reportType]);

    // Opened from the RSVP Reports sub-tab, which lives in the URL, so going back
    // lands there. A report opened in a fresh tab has no history to go back to.
    const onClose = useCallback(() => {
        if (window.history.length > 1) router.back();
        else router.push(routes.events.manage(eventId, { tab: 'rsvp', section: 'reports' }));
    }, [eventId, router]);

    return {
        report,
        isLoading,
        isError,
        isDownloading: downloadingType !== null,
        downloadError,
        onPrint,
        onDownload,
        onClose,
    };
}

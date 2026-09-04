import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { RsvpReportType } from '@/lib/api/types';
import { downloadBlob } from '@/lib/download';

const REPORT_FILENAMES: Record<RsvpReportType, string> = {
    STATISTICS: 'rsvp-statistics.pdf',
    FULL_LIST: 'rsvp-full-list.pdf',
    ATTENDING_ONLY: 'rsvp-attending.pdf',
    WITH_CHILDREN: 'rsvp-with-children.pdf',
};

export const RSVP_REPORT_TYPES: RsvpReportType[] = ['STATISTICS', 'FULL_LIST', 'ATTENDING_ONLY', 'WITH_CHILDREN'];

export function useRsvpReportDownload(eventId: string, failedMessage: string) {
    const tError = useApiErrorMessage();
    const [downloadingType, setDownloadingType] = useState<RsvpReportType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const download = useCallback(
        async (reportType: RsvpReportType) => {
            setError(null);
            setDownloadingType(reportType);
            try {
                const response = await api.download(endpoints.events.rsvpsExport(eventId, reportType));
                const blob = await response.blob();
                downloadBlob(blob, REPORT_FILENAMES[reportType]);
            } catch (downloadError) {
                // This is a button-triggered download with no form fields, so the shared
                // "check the highlighted fields" copy for VALIDATION_FAILED never fits here —
                // any validation failure on this endpoint is a bug, not user input to fix.
                const isValidationFailure = getErrorCode(downloadError) === ERROR_CODES.VALIDATION_FAILED;
                setError(isValidationFailure ? failedMessage : tError(downloadError, failedMessage));
            } finally {
                setDownloadingType(null);
            }
        },
        [eventId, failedMessage, tError],
    );

    return { download, downloadingType, error };
}

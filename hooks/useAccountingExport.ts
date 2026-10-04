'use client';

import { useCallback, useState } from 'react';

import { accountingExportRangeError, attachmentFilename, lastMonthRange } from '@/lib/adminOrders';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { downloadBlob } from '@/lib/download';

// The accountant's CSV for a date range. The file is saved straight to disk and never
// kept in app state: it holds buyers' names and emails.
export function useAccountingExport() {
    const [range, setRange] = useState(() => lastMonthRange(new Date()));
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const rangeError = accountingExportRangeError(range);

    const setFrom = useCallback((from: string) => setRange((current) => ({ ...current, from })), []);
    const setTo = useCallback((to: string) => setRange((current) => ({ ...current, to })), []);

    const download = useCallback(async () => {
        if (accountingExportRangeError(range)) return;
        setError(null);
        setDownloading(true);
        try {
            const response = await api.download(endpoints.admin.billing.accountingExport(range.from, range.to));
            const blob = await response.blob();
            downloadBlob(blob, attachmentFilename(response.headers.get('Content-Disposition'), `payments-${range.from}-to-${range.to}.csv`));
        } catch (downloadError) {
            setError(downloadError);
        } finally {
            setDownloading(false);
        }
    }, [range]);

    return { range, setFrom, setTo, rangeError, download, downloading, error };
}

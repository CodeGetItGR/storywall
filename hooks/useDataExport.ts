import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { downloadBlob } from '@/lib/download';

// GET /api/me/data-export — everything held about the account, as one JSON file
// (gdpr-self-service-fe-integration.md). The server names the file; this fallback
// only applies if the header is missing.
function filenameFrom(response: Response): string {
    const header = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="?([^";]+)"?/i.exec(header);
    return match?.[1] ?? 'storywall-data.json';
}

export function useDataExport(failedMessage: string) {
    const toErrorMessage = useApiErrorMessage();
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const download = useCallback(async () => {
        setError(null);
        setIsDownloading(true);
        try {
            const response = await api.download(endpoints.me.dataExport);
            downloadBlob(await response.blob(), filenameFrom(response));
        } catch (downloadError) {
            setError(toErrorMessage(downloadError, failedMessage));
        } finally {
            setIsDownloading(false);
        }
    }, [failedMessage, toErrorMessage]);

    return { download, isDownloading, error };
}

import type { QueryClient } from '@tanstack/react-query';

import { qrCardTemplateKeys } from '@/hooks/useQrCardTemplates';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { QrCardTemplateListDto } from '@/lib/api/types';

// Seeds the event's card designs for a server page. Its own try, so a failure here never drops the
// page's other prefetches.
export async function prefetchQrCardTemplates(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const list = await serverGet<QrCardTemplateListDto>(endpoints.events.qrCardTemplates(eventId), accessToken);
        queryClient.setQueryData(qrCardTemplateKeys.list(eventId), list);
    } catch {
        // Best-effort — useQrCardTemplates fetches normally on the client if this fails.
    }
}

'use client';

import { useEventQrLinks } from '@/hooks/useQrLinks';
import { findGalleryQrLink } from '@/lib/qrLinks';
import { useActiveEvent } from '@/providers/EventProvider';

// The demo's stand-in for /q/{token}: the demo event and the token of its gallery upload code,
// which the upload form sends its files to (answered by the demo's mock handlers).
export function useDemoQrUpload() {
    const event = useActiveEvent();
    const { data: qrLinks, isLoading } = useEventQrLinks(event?.id ?? null);
    const qrLink = findGalleryQrLink(qrLinks ?? []);

    return {
        event,
        isLoading,
        token: qrLink?.status === 'ACTIVE' ? qrLink.token : null,
    } as const;
}

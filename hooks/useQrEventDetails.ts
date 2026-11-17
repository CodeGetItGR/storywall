'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useEventInvitationPreview } from '@/hooks/useEventInvitations';
import { qrEventDetails } from '@/lib/qrLanding';

// When and where the event is, for the QR choice page. The QR code itself doesn't carry them, so they come
// from the join link's invite preview, the same one the invite page shows. Null until loaded, or with no join link.
export function useQrEventDetails(joinInviteToken: string | null) {
    const locale = useLocale();
    const { data: preview } = useEventInvitationPreview(joinInviteToken);
    return useMemo(() => qrEventDetails(locale, preview), [locale, preview]);
}

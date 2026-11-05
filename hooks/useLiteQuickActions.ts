'use client';

import { useCallback, useState } from 'react';

import { useGuestCodeShare } from '@/hooks/useGuestCodeShare';
import type { LiteHomeState, LiteQuickActionKey } from '@/hooks/useLiteHome';

// The quick actions row's own state: the guest code sheet, the share link and what each button does.
// The upgrade is a link, so it has no handler.
export function useLiteQuickActions(home: LiteHomeState) {
    const [qrOpen, setQrOpen] = useState(false);
    const openQr = useCallback(() => setQrOpen(true), []);
    const closeQr = useCallback(() => setQrOpen(false), []);
    const { copied, share } = useGuestCodeShare(home.guestLink, home.event.title);

    const handlers: Partial<Record<LiteQuickActionKey, () => void>> = { qr: openQr, share, download: home.onDownload };

    return { qrOpen, closeQr, copied, handlers };
}

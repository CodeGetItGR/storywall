'use client';

import { useSyncExternalStore } from 'react';

import { giftClaimUrl } from '@/lib/gift';

function subscribeToNothing() {
    return () => {};
}

// The link a gift card's QR opens, or null without a token. Read on the client
// only: the server has no origin to put in the QR.
export function useGiftClaimUrl(token: string | null | undefined): string | null {
    const origin = useSyncExternalStore(
        subscribeToNothing,
        () => window.location.origin,
        () => null,
    );
    return token && origin ? giftClaimUrl(origin, token) : null;
}

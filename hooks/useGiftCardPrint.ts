'use client';

import { type ChangeEvent, useCallback, useState, useSyncExternalStore } from 'react';

import { useEventGift, useIssuedGiftCard } from '@/hooks/useGift';
import { canPrintGiftCard, giftClaimUrl } from '@/lib/gift';

function subscribeToNothing() {
    return () => {};
}

/**
 * The printable claim card: the live card's QR, and its PIN when the card was
 * issued in this visit (the PIN is never returned again). The giver decides
 * whether the PIN goes on the card or in the envelope.
 */
export function useGiftCardPrint(eventId: string) {
    const gift = useEventGift(eventId);
    const issued = useIssuedGiftCard(eventId);
    // Read on the client only: the server has no origin to put in the QR.
    const origin = useSyncExternalStore(
        subscribeToNothing,
        () => window.location.origin,
        () => null,
    );
    const [includePin, setIncludePin] = useState(true);

    const card = gift.data && canPrintGiftCard(gift.data) ? gift.data : null;
    // A PIN from before a reissue belongs to a dead card.
    const pin = card && issued.data?.token === card.token ? issued.data.pin : null;

    const handleIncludePinChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setIncludePin(event.target.checked), []);
    const print = useCallback(() => window.print(), []);

    return {
        isLoading: gift.isLoading,
        card,
        claimUrl: card?.token && origin ? giftClaimUrl(origin, card.token) : null,
        pin,
        includePin: Boolean(pin) && includePin,
        handleIncludePinChange,
        print,
    };
}

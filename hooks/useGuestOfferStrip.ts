'use client';

import { useCallback, useEffect, useState } from 'react';

import { guestOfferOpenKey, guestOfferSeenKey } from '@/lib/guestOffer';

// Open on a guest's first visit, the strip from the next one; within a visit it stays as the guest
// left it. The feed renders signed-in UI in the browser only, so storage can be read on first render.
// No storage → always open.
function startsOpen(eventId: string): boolean {
    try {
        const thisVisit = window.sessionStorage.getItem(guestOfferOpenKey(eventId));
        if (thisVisit !== null) return thisVisit === '1';
        return window.localStorage.getItem(guestOfferSeenKey(eventId)) === null;
    } catch {
        return true;
    }
}

export function useGuestOfferStrip(eventId: string, isShown: boolean) {
    const [isOpen, setIsOpen] = useState(() => startsOpen(eventId));

    useEffect(() => {
        if (!isShown) return;
        try {
            window.localStorage.setItem(guestOfferSeenKey(eventId), '1');
            window.sessionStorage.setItem(guestOfferOpenKey(eventId), isOpen ? '1' : '0');
        } catch {
            // No storage: the card just opens again next time.
        }
    }, [eventId, isOpen, isShown]);

    const open = useCallback(() => setIsOpen(true), []);
    const shrink = useCallback(() => setIsOpen(false), []);

    return { isOpen, open, shrink };
}

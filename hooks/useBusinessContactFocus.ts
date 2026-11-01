'use client';

import { useEffect, useRef } from 'react';

// The contact sheet's focus: once sent, onto the confirmation (the form and its Send button are gone); after a failed
// send, onto the error, so it is read out and Send is one Tab away.
export function useBusinessContactFocus(sent: boolean, sendError: string | null) {
    const sentRef = useRef<HTMLParagraphElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (sent) sentRef.current?.focus();
    }, [sent]);

    useEffect(() => {
        if (sendError) errorRef.current?.focus();
    }, [sendError]);

    return { sentRef, errorRef };
}

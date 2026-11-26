'use client';

import { useEffect, useRef, useState } from 'react';

// The RSVP pop-up (KAN-298): which answer opened it, and whether the reply went through.
export function useRsvpDialog() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    // The answer the guest tapped: the form opens with it picked. Null while the pop-up is shut.
    const [opened, setOpened] = useState<boolean | null>(null);
    const [sent, setSent] = useState(false);

    // The browser's own modal: it keeps focus inside, closes on Escape and gives focus back to the button.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (opened !== null && dialog && !dialog.open) dialog.showModal();
    }, [opened]);

    const attend = () => setOpened(true);
    const decline = () => setOpened(false);
    const close = () => dialogRef.current?.close();
    // The dialog closed itself (Escape) or through close().
    const closed = () => setOpened(null);
    const markSent = () => setSent(true);

    return { dialogRef, opened, sent, attend, decline, close, closed, markSent };
}

'use client';

import { type RefObject, useEffect } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// While the tour is open: Escape closes it, and Tab stays on the card's buttons.
export function useTourKeyboard(cardRef: RefObject<HTMLElement | null>, isOpen: boolean, onClose: () => void) {
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            const card = cardRef.current;
            if (event.key !== 'Tab' || !card) return;
            const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && (active === first || !card.contains(active))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (active === last || !card.contains(active))) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [cardRef, isOpen, onClose]);
}

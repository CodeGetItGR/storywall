import { useCallback, useEffect, useRef, useState } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// checkVisibility keeps a control that is hidden at the current breakpoint out
// of the cycle. It needs layout, so environments without it (jsdom) treat every
// candidate as visible rather than trapping focus on nothing.
function isVisible(item: HTMLElement): boolean {
    return typeof item.checkVisibility === 'function' ? item.checkVisibility() : true;
}

function focusableItems(menu: HTMLElement | null): HTMLElement[] {
    if (!menu) return [];
    return [...menu.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isVisible);
}

export function useLandingMobileMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);

    // Plain close: a link click and an outside click both hand focus onward
    // themselves, so the toggle must not steal it back.
    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (!isOpen) return;

        // The panel overlays the page on small screens, so keyboard focus stays
        // inside it until it is dismissed.
        focusableItems(menuRef.current)[0]?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            // Escape leaves focus nowhere, so it goes back to the trigger.
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsOpen(false);
                toggleRef.current?.focus();
                return;
            }
            if (event.key !== 'Tab') return;

            const items = focusableItems(menuRef.current);
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;

            if (!menuRef.current?.contains(active)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
                return;
            }
            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        const closeOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!menuRef.current?.contains(target) && !toggleRef.current?.contains(target)) close();
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', closeOutside);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', closeOutside);
        };
    }, [close, isOpen]);

    return { isOpen, menuRef, toggleRef, close, toggle: () => setIsOpen((value) => !value) };
}

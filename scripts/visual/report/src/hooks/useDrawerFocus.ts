import { useEffect, useRef } from 'react';

// On a phone the drawer covers the page, so focus moves into its list when it opens and back to the Stories button when it closes.
export function useDrawerFocus(open: boolean) {
    const drawerRef = useRef<HTMLElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const wasOpen = useRef(open);

    useEffect(() => {
        if (open === wasOpen.current) return;
        wasOpen.current = open;
        const drawer = drawerRef.current;
        if (!drawer) return;
        const active = document.activeElement;
        if (open) {
            // Focus already in the drawer stays there.
            if (drawer.contains(active)) return;
            const row = drawer.querySelector<HTMLElement>('nav [aria-current="true"]') ?? drawer.querySelector<HTMLElement>('nav button');
            row?.focus();
        } else if (active === document.body || drawer.contains(active)) {
            buttonRef.current?.focus();
        }
    }, [open]);

    return { drawerRef, buttonRef };
}

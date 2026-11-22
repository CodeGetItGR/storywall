'use client';

import { useEffect, useRef } from 'react';

import { inAppHref } from '@/lib/leaveGuard';

// While active, a tap on a link to another page of the app doesn't navigate. The page goes to
// onLeave instead, which can ask first. The listener runs in the capture phase on the document,
// so it runs before next/link's own handler.
export function useInAppLeaveGuard(active: boolean, onLeave: (href: string) => void) {
    const onLeaveRef = useRef(onLeave);

    useEffect(() => {
        onLeaveRef.current = onLeave;
    }, [onLeave]);

    useEffect(() => {
        if (!active) return;
        const onClick = (event: MouseEvent) => {
            const href = inAppHref(event, window.location);
            if (href === null) return;
            event.preventDefault();
            event.stopPropagation();
            onLeaveRef.current(href);
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, [active]);
}

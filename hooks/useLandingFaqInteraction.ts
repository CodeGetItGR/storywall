import { type RefObject, useEffect } from 'react';

export function useLandingFaqInteraction(landingRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const root = landingRef.current;
        if (!root) return;
        const abortController = new AbortController();
        const items = [...root.querySelectorAll<HTMLDetailsElement>('.swfaq-editorial-item')];

        items.forEach((item) => {
            item.addEventListener(
                'toggle',
                () => {
                    if (!item.open) return;
                    items.forEach((other) => {
                        if (other !== item) other.open = false;
                    });
                },
                { signal: abortController.signal },
            );
        });

        return () => abortController.abort();
    }, [landingRef]);
}

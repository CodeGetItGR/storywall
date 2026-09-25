'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

const PRELOAD_MARGIN = '1200px 0px';

function hashTarget(hash: string) {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    return id ? document.getElementById(id) : null;
}

function isAfter(section: HTMLElement, target: HTMLElement) {
    return Boolean(section.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function isPlainClick(event: MouseEvent) {
    return event.button === 0 && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Defers content until its placeholder nears the viewport. An in-page link (or initial hash)
 * pointing below the placeholder would land short once the content mounts and pushes the
 * target down, so that jump is held and replayed from `onRendered`, after the content commits.
 */
export function useLandingDeferredRender(sectionRef: RefObject<HTMLElement | null>) {
    const [shouldRender, setShouldRender] = useState(false);
    const renderedRef = useRef(false);
    const pendingTargetRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;

        function holdJumpTo(target: HTMLElement | null) {
            if (!section || !target || !isAfter(section, target)) return false;
            pendingTargetRef.current = target;
            setShouldRender(true);
            return true;
        }

        function handleClick(event: MouseEvent) {
            if (renderedRef.current || !isPlainClick(event)) return;
            const href = (event.target as Element | null)?.closest?.('a[href^="#"]')?.getAttribute('href');
            if (!href || !holdJumpTo(hashTarget(href))) return;
            event.preventDefault();
            window.history.pushState(null, '', href);
        }

        let checkedInitialHash = false;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!checkedInitialHash) {
                    checkedInitialHash = true;
                    holdJumpTo(hashTarget(window.location.hash));
                }
                if (!entry?.isIntersecting) return;
                setShouldRender(true);
                observer.disconnect();
            },
            { rootMargin: PRELOAD_MARGIN },
        );

        observer.observe(section);
        document.addEventListener('click', handleClick, true);
        return () => {
            observer.disconnect();
            document.removeEventListener('click', handleClick, true);
        };
    }, [sectionRef]);

    const onRendered = useCallback(() => {
        renderedRef.current = true;
        pendingTargetRef.current?.scrollIntoView();
        pendingTargetRef.current = null;
    }, []);

    return { shouldRender, onRendered };
}

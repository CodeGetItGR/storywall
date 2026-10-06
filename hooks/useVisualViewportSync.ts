'use client';

import { useEffect } from 'react';

import { getVisualViewportMetrics, isTypingControl } from '@/lib/visualViewport';

const FOCUS_MARGIN = 16;

export function useVisualViewportSync() {
    useEffect(() => {
        if (!window.visualViewport) return;

        const viewport: VisualViewport = window.visualViewport;

        const root = document.documentElement;
        let visibilityFrame: number | null = null;

        function keepFocusedControlVisible() {
            const control = document.activeElement;
            if (!isTypingControl(control)) return;

            const bounds = control.getBoundingClientRect();
            const visibleTop = viewport.offsetTop + FOCUS_MARGIN;
            const visibleBottom = viewport.offsetTop + viewport.height - FOCUS_MARGIN;
            if (bounds.top >= visibleTop && bounds.bottom <= visibleBottom) return;

            control.scrollIntoView({ block: 'center', inline: 'nearest' });
        }

        function syncViewport() {
            const metrics = getVisualViewportMetrics(window.innerHeight, viewport, isTypingControl(document.activeElement));
            root.style.setProperty('--visual-viewport-height', `${metrics.height}px`);
            root.style.setProperty('--visual-viewport-offset-top', `${metrics.offsetTop}px`);
            root.style.setProperty('--visual-viewport-bottom-inset', `${metrics.bottomInset}px`);
            root.style.setProperty('--visual-viewport-center-y', `${metrics.centerY}px`);

            if (visibilityFrame !== null) window.cancelAnimationFrame(visibilityFrame);
            visibilityFrame = window.requestAnimationFrame(keepFocusedControlVisible);
        }

        function handleFocusChange() {
            syncViewport();
            window.setTimeout(syncViewport, 300);
        }

        syncViewport();
        viewport.addEventListener('resize', syncViewport);
        viewport.addEventListener('scroll', syncViewport);
        window.addEventListener('resize', syncViewport);
        document.addEventListener('focusin', handleFocusChange);
        document.addEventListener('focusout', handleFocusChange);

        return () => {
            if (visibilityFrame !== null) window.cancelAnimationFrame(visibilityFrame);
            viewport.removeEventListener('resize', syncViewport);
            viewport.removeEventListener('scroll', syncViewport);
            window.removeEventListener('resize', syncViewport);
            document.removeEventListener('focusin', handleFocusChange);
            document.removeEventListener('focusout', handleFocusChange);
        };
    }, []);
}

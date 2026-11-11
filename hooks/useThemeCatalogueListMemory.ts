'use client';

import { useEffect, useRef } from 'react';

type Saved = { visibleCount?: number; scrollY?: number };

function readSaved(key: string): Saved | null {
    try {
        const raw = window.sessionStorage.getItem(key);
        return raw ? (JSON.parse(raw) as Saved) : null;
    } catch {
        return null;
    }
}

// Keeps where the visitor was in the catalogue, per set of filters, for as long as the tab is open: how
// many cards they had revealed and how far they had scrolled. Coming back from a theme puts both back,
// once the themes are there, so the page is tall enough to scroll to.
export function useThemeCatalogueListMemory(key: string, ready: boolean, visibleCount: number, restoreCount: (count: number) => void) {
    const restoredKey = useRef<string | null>(null);

    useEffect(() => {
        if (!ready || restoredKey.current === key) return;
        restoredKey.current = key;
        const saved = readSaved(key);
        if (!saved) return;
        if (typeof saved.visibleCount === 'number') restoreCount(saved.visibleCount);
        const { scrollY } = saved;
        if (typeof scrollY === 'number' && scrollY > 0) {
            // Two frames, so the restored cards are laid out first.
            requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY)));
        }
    }, [key, ready, restoreCount]);

    // Saved on every scroll, and when more cards show. Not on leaving: by then the next page may have
    // moved the scroll already.
    useEffect(() => {
        if (!ready) return;
        function save() {
            try {
                window.sessionStorage.setItem(key, JSON.stringify({ visibleCount, scrollY: window.scrollY }));
            } catch {
                // Storage blocked: nothing to come back to.
            }
        }
        save();
        window.addEventListener('scroll', save, { passive: true });
        return () => window.removeEventListener('scroll', save);
    }, [key, ready, visibleCount]);
}

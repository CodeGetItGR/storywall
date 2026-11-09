'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

// What a text shows when it has no setting of its own: the page's own look.
export type ShownTextStyle = { size?: number; italic: boolean; bold: boolean; color?: string };

const NOTHING_SHOWN: ShownTextStyle = { italic: false, bold: false };

function rgbToHex(rgb: string): string | undefined {
    const parts = rgb.match(/\d+(\.\d+)?/g);
    if (!parts || parts.length < 3) return undefined;
    return `#${parts
        .slice(0, 3)
        .map((part) => Math.round(Number(part)).toString(16).padStart(2, '0'))
        .join('')}`;
}

function readShown(element: HTMLElement): ShownTextStyle {
    const css = getComputedStyle(element);
    const size = Math.round(parseFloat(css.fontSize));
    return {
        size: Number.isFinite(size) && size > 0 ? size : undefined,
        italic: css.fontStyle === 'italic',
        bold: Number(css.fontWeight) >= 600,
        color: rgbToHex(css.color),
    };
}

// The size, weight, slant and colour the text shows on the page. It follows the page as it
// changes: a text on a photo turns light once the photo is measured, after the text opened.
export function useShownTextStyle(element: HTMLElement | null): ShownTextStyle {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const root = element?.closest('.smd-invitation');
            if (!root) return () => {};
            const observer = new MutationObserver(onChange);
            observer.observe(root, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
            return () => observer.disconnect();
        },
        [element],
    );
    // A string, so an unchanged look keeps the same snapshot.
    const shown = useSyncExternalStore(
        subscribe,
        () => (element ? JSON.stringify(readShown(element)) : ''),
        () => '',
    );
    return useMemo(() => (shown ? (JSON.parse(shown) as ShownTextStyle) : NOTHING_SHOWN), [shown]);
}

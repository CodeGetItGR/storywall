'use client';

import { type RefObject, useEffect, useLayoutEffect } from 'react';

// Space between the text and the toolbar, and from the screen's edges.
const GAP = 12;
const EDGE = 8;
// Scrolls again once the phone's keyboard has finished sliding up (old wedartEnsureTextVisible).
const KEYBOARD_SETTLE_MS = [120, 350];

// The area the invitation scrolls in.
function scroller(anchor: HTMLElement): HTMLElement | null {
    return anchor.closest('main');
}

// Above the text, or below it when there is no room above.
function floatOver(anchor: HTMLElement, toolbar: HTMLElement) {
    const text = anchor.getBoundingClientRect();
    const bar = toolbar.getBoundingClientRect();
    const top = scroller(anchor)?.getBoundingClientRect().top ?? 0;
    let y = text.top - bar.height - GAP;
    if (y < top + EDGE) y = text.bottom + GAP;
    const x = Math.min(Math.max(text.left + text.width / 2 - bar.width / 2, EDGE), window.innerWidth - bar.width - EDGE);
    toolbar.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

// Docked at the bottom: the layout places it.
function dock(toolbar: HTMLElement) {
    toolbar.style.transform = '';
}

// Keeps the text clear of the docked toolbar and the keyboard.
function revealAboveToolbar(anchor: HTMLElement, toolbar: HTMLElement) {
    const area = scroller(anchor);
    if (!anchor.isConnected || !area) return;
    const text = anchor.getBoundingClientRect();
    const bottom = toolbar.getBoundingClientRect().top - GAP;
    const top = area.getBoundingClientRect().top + EDGE;
    let delta = 0;
    if (text.bottom > bottom) delta = text.bottom - bottom;
    else if (text.top < top) delta = text.top - top;
    if (Math.abs(delta) > 2) area.scrollBy({ top: delta, behavior: 'smooth' });
}

// On a computer the toolbar floats over the text and follows it as the canvas scrolls.
// On a phone it docks at the bottom, above the keyboard, and the text scrolls clear of both.
export function useTextToolbarPlacement(anchor: HTMLElement | null, toolbar: RefObject<HTMLElement | null>, docked: boolean, keyboardInset: number) {
    // Every redraw can move the text (a bigger size, a new line), so place it again each time.
    useLayoutEffect(() => {
        const bar = toolbar.current;
        if (!bar) return;
        if (docked || !anchor) {
            dock(bar);
            return;
        }
        floatOver(anchor, bar);
    });

    useEffect(() => {
        const bar = toolbar.current;
        if (docked || !anchor || !bar) return;
        const place = () => floatOver(anchor, bar);
        const observer = new ResizeObserver(place);
        observer.observe(anchor);
        observer.observe(bar);
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [anchor, docked, toolbar]);

    useEffect(() => {
        const bar = toolbar.current;
        if (!docked || !anchor || !bar) return;
        const reveal = () => revealAboveToolbar(anchor, bar);
        reveal();
        const timers = KEYBOARD_SETTLE_MS.map((ms) => window.setTimeout(reveal, ms));
        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [anchor, docked, keyboardInset, toolbar]);
}

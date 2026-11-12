'use client';

import { useEffect, useRef } from 'react';

// The smallest size that stays easy to read on a phone.
export const FIT_TEXT_MIN_SIZE = 14;
const STEP = 0.5;
const MAX_STEPS = 40;

function lineCount(text: HTMLElement, size: number) {
    const lineHeight = parseFloat(getComputedStyle(text).lineHeight) || size * 1.3;
    return text.offsetHeight < lineHeight * 2.5 ? (text.offsetHeight < lineHeight * 1.5 ? 1 : 2) : 3;
}

// Steps the size down from `start` until `fits` holds or the size reaches the minimum.
function shrinkUntil(text: HTMLElement, start: number, fits: (size: number) => boolean) {
    let size = start;
    text.style.fontSize = `${size}px`;
    for (let step = 0; !fits(size) && size > FIT_TEXT_MIN_SIZE && step < MAX_STEPS; step += 1) {
        size = Math.max(FIT_TEXT_MIN_SIZE, size - STEP);
        text.style.fontSize = `${size}px`;
    }
}

function fit(wrap: HTMLElement) {
    const text = wrap.querySelector<HTMLElement>('.text-block');
    if (!text) return;
    // With reduced motion on, the app gives everything a short transition, and
    // the loops below would measure the old size each time and shrink too far.
    text.style.transitionProperty = 'none';
    text.style.fontSize = '';
    text.style.whiteSpace = '';
    const start = parseFloat(getComputedStyle(text).fontSize) || 19;
    const fitsWidth = () => text.scrollWidth <= wrap.clientWidth;

    shrinkUntil(text, start, fitsWidth);
    if (fitsWidth()) return;

    // Too long for one line at a readable size: two lines, as large as fits.
    text.style.whiteSpace = 'normal';
    shrinkUntil(text, start, (size) => fitsWidth() && lineCount(text, size) <= 2);
}

// Shrinks a line of text just enough to fit its box on one line, on any
// screen width. When that would make it too small to read, it goes onto two
// lines instead, breaking at a space. Returns the ref for the box around the text.
export function useFitTextWidth<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    useEffect(() => {
        const wrap = ref.current;
        if (!wrap) return undefined;
        let width = -1;
        const refit = () => {
            width = wrap.clientWidth;
            fit(wrap);
        };
        refit();
        // The theme's font changes the text's width once it loads.
        void document.fonts?.ready.then(refit);
        // Only a new width needs a new fit; wrapping changes the box's height.
        const observer = new ResizeObserver(() => {
            if (wrap.clientWidth !== width) refit();
        });
        observer.observe(wrap);
        return () => observer.disconnect();
    }, []);

    return ref;
}

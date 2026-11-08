'use client';

import { useEffect, useRef } from 'react';

const MIN_SIZE = 9;
const STEP = 0.5;
const MAX_STEPS = 40;

function fit(wrap: HTMLElement) {
    const text = wrap.querySelector<HTMLElement>('.text-block');
    if (!text) return;
    // With reduced motion on, the app gives every element a short transition,
    // so a new size would not show in the width until it ends. Measure without it.
    const transition = text.style.transition;
    text.style.transition = 'none';
    text.style.fontSize = '';
    let size = parseFloat(getComputedStyle(text).fontSize) || 19;
    for (let step = 0; text.scrollWidth > wrap.clientWidth && size > MIN_SIZE && step < MAX_STEPS; step += 1) {
        size -= STEP;
        text.style.fontSize = `${size}px`;
    }
    text.style.transition = transition;
}

// Shrinks a line of text just enough to fit its box on one line, on any
// screen width. Returns the ref for the box around the text.
export function useFitTextWidth<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    useEffect(() => {
        const wrap = ref.current;
        if (!wrap) return undefined;
        const refit = () => fit(wrap);
        refit();
        // The theme's font changes the text's width once it loads.
        void document.fonts?.ready.then(refit);
        const observer = new ResizeObserver(refit);
        observer.observe(wrap);
        return () => observer.disconnect();
    }, []);

    return ref;
}

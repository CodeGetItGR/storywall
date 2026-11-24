'use client';

import { useEffect, useRef } from 'react';

import type { JourneyPhase } from '@/lib/eventJourney';

type Saved = { top: number; phase: JourneyPhase };

// Frames to keep trying while the page is still too short to scroll back to the saved spot.
const RESTORE_FRAMES = 60;

const storageKey = (eventId: string) => `storywall:overview-scroll:${eventId}`;

function readRaw(key: string): string | null {
    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function parseSaved(raw: string | null): Saved | null {
    try {
        return raw ? (JSON.parse(raw) as Saved) : null;
    } catch {
        return null;
    }
}

// Forgets the spot that was read, never one a later tap saved over it.
function forget(key: string, raw: string | null) {
    try {
        if (raw !== null && window.sessionStorage.getItem(key) === raw) window.sessionStorage.removeItem(key);
    } catch {
        // Storage blocked: nothing was saved.
    }
}

/**
 * Where the host was on the Overview when they opened one of its links. The app scrolls inside the
 * shell's <main>, not the window, so the browser can't put the scroll back on Back. Tapping a link
 * saves the spot; the next time the Overview opens on the same phase it scrolls back there, once.
 */
export function useOverviewScrollMemory(eventId: string, phase: JourneyPhase) {
    const key = storageKey(eventId);
    const phaseRef = useRef(phase);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    // Once per visit: the saved spot is forgotten when the scroll gets there or the tries run out.
    // Not on reading it, so an effect that runs twice (React's development checks) still finds it.
    // Only on opening: switching phase afterwards does not run it again. The host scrolling or
    // tapping while it waits for the page to fill in stops it, so it never pulls the page back.
    useEffect(() => {
        const raw = readRaw(key);
        const saved = parseSaved(raw);
        const main = document.querySelector('main');
        if (!saved || saved.phase !== phaseRef.current || !main) {
            forget(key, raw);
            return;
        }
        const interactions = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
        let frames = 0;
        let frame = 0;
        const stop = () => {
            cancelAnimationFrame(frame);
            interactions.forEach((type) => main.removeEventListener(type, stop));
            forget(key, raw);
        };
        const step = () => {
            main.scrollTop = saved.top;
            if (Math.abs(main.scrollTop - saved.top) > 1 && ++frames < RESTORE_FRAMES) frame = requestAnimationFrame(step);
            else stop();
        };
        interactions.forEach((type) => main.addEventListener(type, stop, { passive: true }));
        frame = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(frame);
            interactions.forEach((type) => main.removeEventListener(type, stop));
        };
    }, [key]);

    // Any link on the page counts, the section menu at the foot of the Overview on a phone too. Capture,
    // so the spot is saved before the link's own handler moves the scroll to the top of the next page.
    useEffect(() => {
        const main = document.querySelector('main');
        if (!main) return;
        const save = (event: MouseEvent) => {
            if (!(event.target instanceof Element) || !event.target.closest('a[href]')) return;
            try {
                window.sessionStorage.setItem(key, JSON.stringify({ top: main.scrollTop, phase: phaseRef.current } satisfies Saved));
            } catch {
                // Storage blocked: nothing to come back to.
            }
        };
        main.addEventListener('click', save, true);
        return () => main.removeEventListener('click', save, true);
    }, [key]);
}

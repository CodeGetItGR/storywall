'use client';

import { useSyncExternalStore } from 'react';

const MINUTE = 60_000;

function subscribe(onChange: () => void): () => void {
    const id = window.setInterval(onChange, MINUTE);
    return () => window.clearInterval(id);
}

// The current minute, so it reads the same until the next one.
function minute(): number {
    return Math.floor(Date.now() / MINUTE) * MINUTE;
}

// The server and the first client render know no time: what depends on it draws once the page is in the browser.
function serverMinute(): null {
    return null;
}

// The time, moving on once a minute. Null until the browser has it.
export function useMinuteClock(): number | null {
    return useSyncExternalStore(subscribe, minute, serverMinute);
}

import { useEffect, useMemo, useState } from 'react';

export interface CountdownParts {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    hasFinished: boolean;
}

// Ticks every second and derives the remaining time until `time`, shared by
// the feed header's full countdown and the compact home card variant.
export function useCountdown(time: number): CountdownParts {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1_000);

        return () => clearInterval(interval);
    }, []);

    return useMemo(() => {
        const target = new Date(time).getTime();
        const diff = target - now;

        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, hasFinished: true };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return { days, hours, minutes, seconds, hasFinished: false };
    }, [time, now]);
}

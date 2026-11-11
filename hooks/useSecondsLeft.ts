'use client';

import { useEffect, useState } from 'react';

import { resendSecondsLeft } from '@/lib/emailCode';

// Seconds until a resend is allowed, ticking once a second while above zero.
export function useSecondsLeft(sentAt: number | null): number {
    const [now, setNow] = useState(() => Date.now());
    const left = resendSecondsLeft(sentAt, now);

    useEffect(() => {
        if (left <= 0) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [left]);

    return left;
}

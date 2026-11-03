'use client';

import { useEffect, useState } from 'react';

import { COUNTDOWN_ZERO, countdownParts } from '@/lib/invitation/countdown';

// The countdown's numbers, ticking every second. They start at zero, as the
// server renders them, and fill in once the page runs.
export function useInvitationCountdown(targetIso: string | undefined) {
    const [parts, setParts] = useState(COUNTDOWN_ZERO);

    useEffect(() => {
        const tick = () => setParts(countdownParts(targetIso, Date.now()));
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [targetIso]);

    return parts;
}

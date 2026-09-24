'use client';

import { useCallback, useState } from 'react';

// The duration picked on each plan card, keyed by plan code. A card with no
// pick shows its plan's default (the shortest).
export function useDurationPicks() {
    const [picks, setPicks] = useState<Record<string, string>>({});

    const pickDuration = useCallback((planCode: string, optionId: string) => {
        setPicks((current) => (current[planCode] === optionId ? current : { ...current, [planCode]: optionId }));
    }, []);

    const resetPicks = useCallback(() => setPicks({}), []);

    return { picks, pickDuration, resetPicks };
}

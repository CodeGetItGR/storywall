'use client';

import { useCallback, useMemo, useState } from 'react';

import { type FunnelCustomRange, funnelRangeBounds, type FunnelRangePreset, localToday } from '@/lib/adminFunnel';

// The range a dashboard section is filtered by. Defaults to all time.
export function useFunnelRange(initialPreset: FunnelRangePreset = 'ALL') {
    // Fixed for the page's lifetime so the query key doesn't move under the admin.
    const [today] = useState(() => localToday(new Date()));
    const [preset, setPreset] = useState<FunnelRangePreset>(initialPreset);
    const [custom, setCustom] = useState<FunnelCustomRange>({ from: '', to: '' });

    const bounds = useMemo(() => funnelRangeBounds(preset, custom, today), [custom, preset, today]);

    const handleFromChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const from = event.target.value;
        setCustom((current) => ({ ...current, from }));
    }, []);

    const handleToChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const to = event.target.value;
        setCustom((current) => ({ ...current, to }));
    }, []);

    return { preset, setPreset, custom, today, bounds, handleFromChange, handleToChange };
}

'use client';

import { useEffect } from 'react';

import { saveCreateEventForm, type SavedCreateEventForm } from '@/lib/createEventFormMemory';

// Keeps the run's saved form in step with what the host has filled in.
export function useSaveCreateEventForm(run: string | null, form: SavedCreateEventForm): void {
    const serialized = JSON.stringify(form);

    useEffect(() => {
        if (run) saveCreateEventForm(run, JSON.parse(serialized) as SavedCreateEventForm);
    }, [run, serialized]);
}

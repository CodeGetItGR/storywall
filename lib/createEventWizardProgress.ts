import type { CreateEventStep } from '@/providers/createEvent/CreateEventFormContext';

// "2/5" and the bar's fill. The total counts only the steps this run will show.
export function wizardProgress(step: CreateEventStep, steps: readonly CreateEventStep[]) {
    const total = Math.max(steps.length, 1);
    const current = Math.max(steps.indexOf(step), 0) + 1;
    return { current, total, percent: Math.round((current / total) * 100) };
}

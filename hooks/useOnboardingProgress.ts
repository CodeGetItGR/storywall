'use client';

import { useCallback, useEffect, useState } from 'react';

// Per-event, per-device progress for the host onboarding wizard.
// Local only for now — no backend field exists yet to persist this across
// devices. Swap the storage calls below for an API call if that lands later;
// nothing outside this hook needs to know where the state lives.
interface OnboardingState {
    completed: boolean;
    stepIndex: number;
}

function storageKey(eventId: string) {
    return `onboarding:${eventId}`;
}

function readState(eventId: string): OnboardingState {
    try {
        const raw = window.localStorage.getItem(storageKey(eventId));
        if (!raw) return { completed: false, stepIndex: 0 };
        const parsed = JSON.parse(raw) as Partial<OnboardingState>;
        return { completed: Boolean(parsed.completed), stepIndex: typeof parsed.stepIndex === 'number' ? parsed.stepIndex : 0 };
    } catch {
        return { completed: false, stepIndex: 0 };
    }
}

function writeState(eventId: string, state: OnboardingState) {
    try {
        window.localStorage.setItem(storageKey(eventId), JSON.stringify(state));
    } catch {
        // Best-effort — worst case the guide resets next visit.
    }
}

export function useOnboardingProgress(eventId: string | null) {
    const [state, setState] = useState<OnboardingState>({ completed: true, stepIndex: 0 });
    const [isOpen, setIsOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        if (!eventId) return;
        const stored = readState(eventId);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(stored);
        setIsOpen(!stored.completed && stored.stepIndex === 0);
        setHydrated(true);
    }, [eventId]);

    // Only persists once `state` has settled to a value read from storage on
    // this render pass — writing during the same effect flush that hydrates
    // would still see the pre-hydration default and clobber storage with it.
    useEffect(() => {
        if (!eventId || !hydrated) return;
        writeState(eventId, state);
    }, [eventId, state, hydrated]);

    const open = useCallback(() => setIsOpen(true), []);

    // Closes the wizard without marking it done, so it can be reopened later
    // at the same step (e.g. a mistaken skip, or "back later").
    const dismiss = useCallback(() => {
        setIsOpen(false);
        setState((current) => ({ ...current, completed: false }));
    }, []);

    const complete = useCallback(() => {
        setIsOpen(false);
        setState({ completed: true, stepIndex: 0 });
    }, []);

    const next = useCallback((stepCount: number) => {
        setState((current) => ({ ...current, stepIndex: Math.min(current.stepIndex + 1, stepCount - 1) }));
    }, []);

    const back = useCallback(() => {
        setState((current) => ({ ...current, stepIndex: Math.max(current.stepIndex - 1, 0) }));
    }, []);

    return {
        isOpen: Boolean(eventId) && isOpen,
        isComplete: state.completed,
        stepIndex: state.stepIndex,
        open,
        next,
        back,
        dismiss,
        complete,
    };
}
